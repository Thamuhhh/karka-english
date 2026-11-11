import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser, UserStats, WordDefinition } from '../types';
import { setGeminiApiKey } from '../api/supernovaAi';
import {
  setPreferredAccent,
  EnglishAccent,
  setSpeechRate,
  getSpeechRate,
} from './ttsService';
import { setSoundEffectsEnabled } from './soundEffectsService';
import { computeLeagueRankName } from './leaderboardService';
import { STARTER_VOCABULARY } from '../api/dictionary';
import { signOutSupabase } from './authService';
import {
  ensureCloudProvisioned,
  pullCloudUserData,
  pushPreferencesToCloud,
  pushProgressAndLeaderboard,
  pushVocabularyToCloud,
  resetCloudUserData,
} from './cloudSyncService';

const KEYS = {
  USER_STATS: 'nova_user_stats',
  AUTH_USER: 'nova_auth_user',
  ACTIVE_USER_ID: 'nova_active_user_id',
  GEMINI_API_KEY: 'nova_gemini_key',
  SAVED_WORDS: 'nova_saved_words',
  PREFERRED_ACCENT: 'nova_preferred_accent',
  SPEECH_RATE: 'nova_speech_rate',
};

const STARTER_WORD_SET = new Set(STARTER_VOCABULARY.map((w) => w.word.toLowerCase()));

let activeCloudUserCache: AuthUser | null = null;

function getTodayIsoDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysBetween(dateA: string, dateB: string): number {
  const toUtcDay = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtcDay(dateB) - toUtcDay(dateA)) / 86_400_000);
}

function secureStreakIfGoalReached(stats: UserStats): void {
  if (stats.todayXp < stats.dailyGoalXp) return;

  const today = getTodayIsoDate();
  if (stats.lastActiveDate === today && stats.streakDays > 0) return;

  const consecutiveDay =
    stats.streakDays > 0 && daysBetween(stats.lastActiveDate, today) === 1;
  stats.streakDays = consecutiveDay ? stats.streakDays + 1 : 1;
  stats.lastActiveDate = today;

  // Celebrate each full week with a small, repeatable gem reward.
  if (stats.streakDays % 7 === 0) {
    stats.gems += 30;
  }
}

export function getStreakWeekActivity(stats: Pick<UserStats, 'streakDays' | 'lastActiveDate'>): boolean[] {
  const today = new Date();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const lastActiveDate = stats.lastActiveDate;

  return Array.from({ length: 7 }, (_, index) => {
    if (!lastActiveDate || stats.streakDays <= 0) return false;
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const daysBeforeLastActive = daysBetween(getTodayIsoDate(date), lastActiveDate);
    return daysBeforeLastActive >= 0 && daysBeforeLastActive < stats.streakDays;
  });
}

export function hasSecuredStreakToday(stats: Pick<UserStats, 'todayXp' | 'dailyGoalXp' | 'lastActiveDate'>): boolean {
  return stats.todayXp >= stats.dailyGoalXp && stats.lastActiveDate === getTodayIsoDate();
}

export function createDefaultStats(): UserStats {
  const today = getTodayIsoDate();
  return {
    streakDays: 0,
    lastActiveDate: today,
    stardustXp: 0,
    cosmicRank: computeLeagueRankName(0),
    gems: 450,
    hearts: 5,
    maxHearts: 5,
    todayXp: 0,
    todayDate: today,
    dailyGoalXp: 100,
    wordsMastered: 0,
    conversationsDone: 0,
    sentencesChecked: 0,
    completedClasses: [],
    masteredWords: [],
    soundEnabled: true,
  };
}

function normalizeStats(raw: Partial<UserStats>): UserStats {
  const defaults = createDefaultStats();
  const today = getTodayIsoDate();
  const xp = typeof raw.stardustXp === 'number' ? raw.stardustXp : defaults.stardustXp;
  const maxHearts = typeof raw.maxHearts === 'number' ? raw.maxHearts : 5;
  const rawHearts = typeof raw.hearts === 'number' ? raw.hearts : maxHearts;
  const completedClasses = Array.isArray(raw.completedClasses)
    ? Array.from(new Set(raw.completedClasses))
    : defaults.completedClasses;
  const masteredWords = Array.isArray(raw.masteredWords)
    ? Array.from(new Set(raw.masteredWords))
    : [];

  let streakDays =
    typeof raw.streakDays === 'number' && raw.streakDays >= 0
      ? raw.streakDays
      : defaults.streakDays;
  const lastActiveDate = raw.lastActiveDate || today;
  if (streakDays > 0 && daysBetween(lastActiveDate, today) > 1) streakDays = 0;

  const sameToday = raw.todayDate === today;
  const todayXp = sameToday && typeof raw.todayXp === 'number' ? raw.todayXp : 0;

  const normalized: UserStats = {
    streakDays,
    lastActiveDate,
    stardustXp: xp,
    cosmicRank: computeLeagueRankName(xp),
    gems: typeof raw.gems === 'number' ? raw.gems : defaults.gems,
    hearts: Math.max(0, Math.min(maxHearts, rawHearts)),
    maxHearts,
    todayXp,
    todayDate: today,
    dailyGoalXp: typeof raw.dailyGoalXp === 'number' ? raw.dailyGoalXp : defaults.dailyGoalXp,
    wordsMastered: typeof raw.wordsMastered === 'number' ? raw.wordsMastered : masteredWords.length,
    conversationsDone: typeof raw.conversationsDone === 'number' ? raw.conversationsDone : 0,
    sentencesChecked: typeof raw.sentencesChecked === 'number' ? raw.sentencesChecked : 0,
    completedClasses,
    masteredWords,
    soundEnabled: typeof raw.soundEnabled === 'boolean' ? raw.soundEnabled : true,
  };
  secureStreakIfGoalReached(normalized);
  return normalized;
}

async function resolveCurrentAuthUser(): Promise<AuthUser | null> {
  if (activeCloudUserCache) return activeCloudUserCache;
  const loaded = await loadAuthUser();
  activeCloudUserCache = loaded;
  return loaded;
}

function mergeStats(remote: UserStats, local: UserStats): UserStats {
  const completedClasses = Array.from(
    new Set([...remote.completedClasses, ...local.completedClasses])
  );
  const masteredWords = Array.from(new Set([...remote.masteredWords, ...local.masteredWords]));
  const useLocalScalarSource = local.stardustXp > remote.stardustXp;
  const combinedXp = Math.max(remote.stardustXp, local.stardustXp);

  const streakSource =
    remote.lastActiveDate >= local.lastActiveDate ? remote : local;

  return normalizeStats({
    streakDays: streakSource.streakDays,
    lastActiveDate: streakSource.lastActiveDate,
    stardustXp: combinedXp,
    cosmicRank: computeLeagueRankName(combinedXp),
    gems: useLocalScalarSource ? local.gems : remote.gems,
    hearts: useLocalScalarSource ? local.hearts : remote.hearts,
    maxHearts: Math.max(remote.maxHearts, local.maxHearts),
    todayXp: Math.max(remote.todayXp, local.todayXp),
    todayDate: remote.todayDate >= local.todayDate ? remote.todayDate : local.todayDate,
    dailyGoalXp: remote.dailyGoalXp,
    wordsMastered: Math.max(masteredWords.length, remote.wordsMastered, local.wordsMastered),
    conversationsDone: Math.max(remote.conversationsDone, local.conversationsDone),
    sentencesChecked: Math.max(remote.sentencesChecked, local.sentencesChecked),
    completedClasses,
    masteredWords,
    soundEnabled: remote.soundEnabled,
  });
}

function mergeVocabulary(
  cloudWords: WordDefinition[] | null,
  localWords: WordDefinition[],
  masteredWords: string[]
): WordDefinition[] {
  const masteredSet = new Set(masteredWords.map((w) => w.toLowerCase()));
  const byWord = new Map<string, WordDefinition>();

  for (const item of [...(cloudWords || []), ...localWords, ...STARTER_VOCABULARY]) {
    const key = item.word.trim().toLowerCase();
    const existing = byWord.get(key);
    const isMemorized = masteredSet.has(key) || Boolean(item.memorized) || Boolean(existing?.memorized);
    if (!existing) {
      byWord.set(key, { ...item, memorized: isMemorized });
    } else if (isMemorized && !existing.memorized) {
      byWord.set(key, { ...existing, memorized: true });
    }
  }

  return Array.from(byWord.values()).slice(0, 60);
}

export async function loadUserStats(): Promise<UserStats> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.USER_STATS);
    if (!raw) {
      const defaults = createDefaultStats();
      await AsyncStorage.setItem(KEYS.USER_STATS, JSON.stringify(defaults));
      return defaults;
    }
    const parsed: Partial<UserStats> = JSON.parse(raw);
    const normalized = normalizeStats(parsed);
    await AsyncStorage.setItem(KEYS.USER_STATS, JSON.stringify(normalized));
    return normalized;
  } catch {
    return createDefaultStats();
  }
}

export async function saveUserStats(stats: UserStats, skipCloudPush = false): Promise<void> {
  try {
    const cleanStats: UserStats = {
      ...stats,
      cosmicRank: computeLeagueRankName(stats.stardustXp),
      hearts: Math.max(0, Math.min(stats.maxHearts, stats.hearts)),
    };
    setSoundEffectsEnabled(cleanStats.soundEnabled);
    await AsyncStorage.setItem(KEYS.USER_STATS, JSON.stringify(cleanStats));

    if (!skipCloudPush) {
      const user = await resolveCurrentAuthUser();
      if (user?.isCloudSession) {
        void pushProgressAndLeaderboard(user, cleanStats);
      }
    }
  } catch (e) {
    console.warn('Failed to save stats:', e);
  }
}

export async function hydrateAppPreferences(): Promise<UserStats> {
  const [stats, apiKey, accent, rateRaw] = await Promise.all([
    loadUserStats(),
    loadSavedApiKey(),
    loadPreferredAccent(),
    AsyncStorage.getItem(KEYS.SPEECH_RATE).catch(() => null),
  ]);

  if (apiKey) setGeminiApiKey(apiKey);
  setPreferredAccent(accent);
  setSoundEffectsEnabled(stats.soundEnabled);

  if (rateRaw) {
    const rateNum = parseFloat(rateRaw);
    if (!Number.isNaN(rateNum) && rateNum >= 0.5 && rateNum <= 1.5) {
      setSpeechRate(rateNum);
    }
  }

  return stats;
}

export async function hydrateUserCloudSession(authUser: AuthUser): Promise<UserStats> {
  activeCloudUserCache = authUser;
  await saveAuthUser(authUser);

  const nextUserKey = authUser.id || `local:${authUser.provider}:${authUser.name}`;
  const prevUserKey = await AsyncStorage.getItem(KEYS.ACTIVE_USER_ID).catch(() => null);
  const isSwitchingAccounts = Boolean(prevUserKey && prevUserKey !== nextUserKey);
  const canMergeLocalProgress = !prevUserKey || prevUserKey === nextUserKey;

  if (isSwitchingAccounts) {
    await AsyncStorage.multiRemove([KEYS.USER_STATS, KEYS.SAVED_WORDS]).catch(() => {});
  }
  await AsyncStorage.setItem(KEYS.ACTIVE_USER_ID, nextUserKey).catch(() => {});

  const localStats = await loadUserStats();
  const [localAccent, localVocab] = await Promise.all([
    loadPreferredAccent(),
    loadVocabularyList(),
  ]);
  const localRate = getSpeechRate();

  if (!authUser.isCloudSession || !authUser.id) {
    return localStats;
  }

  await ensureCloudProvisioned(authUser, localStats, {
    accent: localAccent,
    speechRate: localRate,
  });

  const cloudData = await pullCloudUserData(authUser);
  if (!cloudData) {
    return localStats;
  }

  let resolvedStats = localStats;
  if (cloudData.stats) {
    let normalizedCloud = normalizeStats(cloudData.stats);
    const cloudStreakNeedsSync =
      normalizedCloud.streakDays !== cloudData.stats.streakDays ||
      normalizedCloud.lastActiveDate !== cloudData.stats.lastActiveDate;
    const isLegacyUntouchedSeed =
      normalizedCloud.completedClasses.length === 1 &&
      normalizedCloud.completedClasses[0] === 'sn-1-1' &&
      normalizedCloud.stardustXp === 120 &&
      normalizedCloud.todayXp === 20 &&
      normalizedCloud.conversationsDone === 0 &&
      normalizedCloud.sentencesChecked === 0 &&
      normalizedCloud.wordsMastered === 0;

    if (isLegacyUntouchedSeed) {
      normalizedCloud = {
        ...normalizedCloud,
        completedClasses: [],
        stardustXp: 0,
        todayXp: 0,
        cosmicRank: computeLeagueRankName(0),
      };
    }

    const shouldMergeLocal =
      canMergeLocalProgress &&
      (localStats.stardustXp > normalizedCloud.stardustXp ||
        localStats.completedClasses.length > normalizedCloud.completedClasses.length ||
        localStats.masteredWords.length > normalizedCloud.masteredWords.length);

    resolvedStats = shouldMergeLocal
      ? mergeStats(normalizedCloud, localStats)
      : normalizedCloud;

    if (shouldMergeLocal || isLegacyUntouchedSeed || cloudStreakNeedsSync) {
      void pushProgressAndLeaderboard(authUser, resolvedStats);
    }
  } else {
    void pushProgressAndLeaderboard(authUser, resolvedStats);
  }

  if (cloudData.accent) {
    setPreferredAccent(cloudData.accent);
    await AsyncStorage.setItem(KEYS.PREFERRED_ACCENT, cloudData.accent).catch(() => {});
  }
  if (typeof cloudData.speechRate === 'number') {
    setSpeechRate(cloudData.speechRate);
    await AsyncStorage.setItem(KEYS.SPEECH_RATE, String(cloudData.speechRate)).catch(() => {});
  }
  if (cloudData.avatarId && !authUser.avatarId) {
    authUser.avatarId = cloudData.avatarId;
    await saveAuthUser(authUser);
  }

  const effectiveVocabSource = isSwitchingAccounts ? STARTER_VOCABULARY : localVocab;
  const mergedVocab = mergeVocabulary(
    cloudData.vocabulary,
    effectiveVocabSource,
    resolvedStats.masteredWords
  );
  await AsyncStorage.setItem(KEYS.SAVED_WORDS, JSON.stringify(mergedVocab)).catch(() => {});

  const syncCandidates = mergedVocab.filter(
    (w) => w.memorized || !STARTER_WORD_SET.has(w.word.toLowerCase())
  );
  if (syncCandidates.length > 0 && (!cloudData.vocabulary || cloudData.vocabulary.length === 0)) {
    void pushVocabularyToCloud(authUser, syncCandidates);
  }

  await saveUserStats(resolvedStats, true);
  return resolvedStats;
}

export async function addXp(amount: number, bonusGems = 0): Promise<UserStats> {
  const stats = await loadUserStats();
  const safeXp = Math.max(0, amount);
  stats.stardustXp += safeXp;
  stats.todayXp += safeXp;
  stats.gems += Math.max(0, bonusGems);
  secureStreakIfGoalReached(stats);
  await saveUserStats(stats);
  return stats;
}

export async function completeLessonSession(
  classId: string,
  baseXp: number,
  earnedGems: number
): Promise<{ stats: UserStats; awardedXp: number; awardedGems: number; isFirstCompletion: boolean }> {
  const stats = await loadUserStats();
  const isFirstCompletion = !stats.completedClasses.includes(classId);
  const awardedXp = isFirstCompletion ? baseXp : Math.max(25, Math.round(baseXp * 0.5));
  const awardedGems = isFirstCompletion ? earnedGems : Math.max(2, Math.round(earnedGems * 0.4));

  if (isFirstCompletion) {
    stats.completedClasses = [...stats.completedClasses, classId];
  }
  stats.stardustXp += awardedXp;
  stats.todayXp += awardedXp;
  stats.gems += awardedGems;
  secureStreakIfGoalReached(stats);

  await saveUserStats(stats);
  return { stats, awardedXp, awardedGems, isFirstCompletion };
}

export async function updateHearts(delta: number): Promise<UserStats> {
  const stats = await loadUserStats();
  stats.hearts = Math.max(0, Math.min(stats.maxHearts, stats.hearts + delta));
  await saveUserStats(stats);
  return stats;
}

export async function setHeartCount(hearts: number): Promise<UserStats> {
  const stats = await loadUserStats();
  stats.hearts = Math.max(0, Math.min(stats.maxHearts, Math.floor(hearts)));
  await saveUserStats(stats);
  return stats;
}

export async function refillHeartsWithGems(
  cost = 25
): Promise<{ success: boolean; stats: UserStats }> {
  const stats = await loadUserStats();
  if (stats.hearts >= stats.maxHearts) {
    return { success: true, stats };
  }
  if (stats.gems < cost) {
    return { success: false, stats };
  }
  stats.gems -= cost;
  stats.hearts = stats.maxHearts;
  await saveUserStats(stats);
  return { success: true, stats };
}

export async function updateDailyGoal(dailyGoalXp: number): Promise<UserStats> {
  const stats = await loadUserStats();
  stats.dailyGoalXp = dailyGoalXp;
  secureStreakIfGoalReached(stats);
  await saveUserStats(stats);
  return stats;
}

export async function updateSoundSetting(enabled: boolean): Promise<UserStats> {
  const stats = await loadUserStats();
  stats.soundEnabled = enabled;
  setSoundEffectsEnabled(enabled);
  await saveUserStats(stats);
  return stats;
}

export async function incrementMetric(
  field: 'conversationsDone' | 'sentencesChecked' | 'wordsMastered',
  amount = 1
): Promise<UserStats> {
  const stats = await loadUserStats();
  stats[field] += amount;
  const xpGain = amount * 15;
  stats.stardustXp += xpGain;
  stats.todayXp += xpGain;
  secureStreakIfGoalReached(stats);
  await saveUserStats(stats);
  return stats;
}

export async function markWordMastered(word: string): Promise<UserStats> {
  const clean = word.trim().toLowerCase();
  const stats = await loadUserStats();
  if (!stats.masteredWords.includes(clean)) {
    stats.masteredWords = [...stats.masteredWords, clean];
    stats.wordsMastered += 1;
    stats.stardustXp += 15;
    stats.todayXp += 15;
  } else {
    stats.stardustXp += 5;
    stats.todayXp += 5;
  }
  secureStreakIfGoalReached(stats);
  await saveUserStats(stats);

  const words = await loadVocabularyList();
  const updatedWords = words.map((w) =>
    w.word.toLowerCase() === clean ? { ...w, memorized: true } : w
  );
  await saveVocabularyList(
    updatedWords,
    updatedWords.filter((w) => w.word.toLowerCase() === clean)
  );
  return stats;
}

export async function toggleSavedWord(
  word: string
): Promise<{ stats: UserStats; saved: boolean }> {
  const clean = word.trim().toLowerCase();
  const stats = await loadUserStats();
  const alreadySaved = stats.masteredWords.includes(clean);

  let saved = false;
  if (alreadySaved) {
    stats.masteredWords = stats.masteredWords.filter((w) => w !== clean);
    saved = false;
  } else {
    stats.masteredWords = [...stats.masteredWords, clean];
    stats.stardustXp += 10;
    stats.todayXp += 10;
    saved = true;
  }

  stats.wordsMastered = stats.masteredWords.length;
  secureStreakIfGoalReached(stats);
  await saveUserStats(stats);

  const words = await loadVocabularyList();
  const updatedWords = words.map((w) =>
    w.word.toLowerCase() === clean ? { ...w, memorized: saved } : w
  );
  await saveVocabularyList(updatedWords, [
    ...updatedWords.filter((w) => w.word.toLowerCase() === clean),
  ]);

  return { stats, saved };
}

export async function loadVocabularyList(): Promise<WordDefinition[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SAVED_WORDS);
    if (!raw) return STARTER_VOCABULARY;
    const parsed: WordDefinition[] = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : STARTER_VOCABULARY;
  } catch {
    return STARTER_VOCABULARY;
  }
}

export async function saveVocabularyList(
  words: WordDefinition[],
  changedWords?: WordDefinition[]
): Promise<void> {
  try {
    const trimmed = words.slice(0, 60);
    await AsyncStorage.setItem(KEYS.SAVED_WORDS, JSON.stringify(trimmed));

    const user = await resolveCurrentAuthUser();
    if (user?.isCloudSession) {
      const toSync =
        changedWords && changedWords.length > 0
          ? changedWords
          : trimmed.filter(
              (w) => w.memorized || !STARTER_WORD_SET.has(w.word.toLowerCase())
            );
      if (toSync.length > 0) {
        void pushVocabularyToCloud(user, toSync);
      }
    }
  } catch (e) {
    console.warn('Failed to save vocabulary list:', e);
  }
}

export async function loadSavedApiKey(): Promise<string | null> {
  try {
    const key = await AsyncStorage.getItem(KEYS.GEMINI_API_KEY);
    if (key) {
      setGeminiApiKey(key);
    }
    return key;
  } catch {
    return null;
  }
}

export async function saveApiKey(key: string): Promise<void> {
  try {
    const clean = key.trim();
    if (!clean) {
      await AsyncStorage.removeItem(KEYS.GEMINI_API_KEY);
      setGeminiApiKey(null);
      return;
    }
    await AsyncStorage.setItem(KEYS.GEMINI_API_KEY, clean);
    setGeminiApiKey(clean);
  } catch (e) {
    console.warn('Failed to save API key:', e);
  }
}

export async function loadPreferredAccent(): Promise<EnglishAccent> {
  try {
    const accent = (await AsyncStorage.getItem(KEYS.PREFERRED_ACCENT)) as EnglishAccent;
    if (accent === 'en-US' || accent === 'en-GB' || accent === 'en-AU') {
      setPreferredAccent(accent);
      return accent;
    }
  } catch {}
  return 'en-US';
}

export async function savePreferredAccent(accent: EnglishAccent): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.PREFERRED_ACCENT, accent);
    setPreferredAccent(accent);
    const user = await resolveCurrentAuthUser();
    if (user?.isCloudSession) {
      void pushPreferencesToCloud(user, { accent });
    }
  } catch {}
}

export async function savePreferredSpeechRate(rate: number): Promise<void> {
  try {
    setSpeechRate(rate);
    await AsyncStorage.setItem(KEYS.SPEECH_RATE, String(rate));
    const user = await resolveCurrentAuthUser();
    if (user?.isCloudSession) {
      void pushPreferencesToCloud(user, { speechRate: rate });
    }
  } catch {}
}

export async function resetAllUserProgress(): Promise<UserStats> {
  const fresh = createDefaultStats();
  await Promise.all([
    AsyncStorage.setItem(KEYS.USER_STATS, JSON.stringify(fresh)),
    AsyncStorage.removeItem(KEYS.SAVED_WORDS),
  ]);
  setSoundEffectsEnabled(fresh.soundEnabled);

  const user = await resolveCurrentAuthUser();
  if (user?.isCloudSession) {
    void resetCloudUserData(user, fresh);
  }

  return fresh;
}

export async function loadAuthUser(): Promise<AuthUser | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.AUTH_USER);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (parsed && typeof parsed.name === 'string' && parsed.name.trim()) {
      return {
        id: typeof parsed.id === 'string' ? parsed.id : undefined,
        name: parsed.name.trim(),
        email: typeof parsed.email === 'string' ? parsed.email : '',
        provider:
          parsed.provider === 'google' || parsed.provider === 'guest'
            ? parsed.provider
            : 'email',
        createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
        isCloudSession: Boolean(parsed.isCloudSession),
        isAnonymous: Boolean(parsed.isAnonymous),
        avatarId: typeof parsed.avatarId === 'string' && parsed.avatarId ? parsed.avatarId : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveAuthUser(user: AuthUser): Promise<void> {
  try {
    activeCloudUserCache = user;
    await AsyncStorage.setItem(KEYS.AUTH_USER, JSON.stringify(user));
  } catch (e) {
    console.warn('Failed to save auth user:', e);
  }
}

export async function updateAuthUserProfile(updates: {
  name?: string;
  avatarId?: string;
  learningGoal?: string;
}): Promise<AuthUser | null> {
  try {
    const current = await loadAuthUser();
    if (!current) return null;
    const trimmedName = updates.name?.trim();
    const updated: AuthUser = {
      ...current,
      ...(trimmedName ? { name: trimmedName } : {}),
      ...(updates.avatarId ? { avatarId: updates.avatarId } : {}),
      ...(updates.learningGoal !== undefined ? { learningGoal: updates.learningGoal } : {}),
    };
    await saveAuthUser(updated);
    if (current.isCloudSession && current.id) {
      const stats = await loadUserStats();
      void pushProgressAndLeaderboard(updated, stats);
    }
    return updated;
  } catch (e) {
    console.warn('Failed to update user profile:', e);
    return null;
  }
}

export async function updateAuthUserAvatar(avatarId: string): Promise<AuthUser | null> {
  return updateAuthUserProfile({ avatarId });
}

export async function signOutAuthUser(): Promise<void> {
  try {
    activeCloudUserCache = null;
    await signOutSupabase();
    await AsyncStorage.multiRemove([
      KEYS.AUTH_USER,
      KEYS.USER_STATS,
      KEYS.SAVED_WORDS,
      KEYS.ACTIVE_USER_ID,
    ]);
  } catch (e) {
    console.warn('Failed to sign out user:', e);
  }
}
