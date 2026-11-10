import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser, UserStats, WordDefinition } from '../types';
import { setGeminiApiKey } from '../api/supernovaAi';
import {
  setPreferredAccent,
  EnglishAccent,
  setSpeechRate,
} from './ttsService';
import { setSoundEffectsEnabled } from './soundEffectsService';
import { computeLeagueRankName } from './leaderboardService';
import { STARTER_VOCABULARY } from '../api/dictionary';

const KEYS = {
  USER_STATS: 'nova_user_stats',
  AUTH_USER: 'nova_auth_user',
  GEMINI_API_KEY: 'nova_gemini_key',
  SAVED_WORDS: 'nova_saved_words',
  PREFERRED_ACCENT: 'nova_preferred_accent',
  SPEECH_RATE: 'nova_speech_rate',
};

function getTodayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function createDefaultStats(): UserStats {
  const today = getTodayIsoDate();
  return {
    streakDays: 1,
    lastActiveDate: today,
    stardustXp: 120,
    cosmicRank: computeLeagueRankName(120),
    gems: 450,
    hearts: 5,
    maxHearts: 5,
    todayXp: 20,
    todayDate: today,
    dailyGoalXp: 100,
    wordsMastered: 0,
    conversationsDone: 0,
    sentencesChecked: 0,
    completedClasses: ['sn-1-1'],
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
  const completedClasses = Array.isArray(raw.completedClasses) && raw.completedClasses.length > 0
    ? Array.from(new Set(raw.completedClasses))
    : defaults.completedClasses;
  const masteredWords = Array.isArray(raw.masteredWords)
    ? Array.from(new Set(raw.masteredWords))
    : [];

  let streakDays = typeof raw.streakDays === 'number' && raw.streakDays >= 1 ? raw.streakDays : 1;
  const lastActiveDate = raw.lastActiveDate || today;

  if (lastActiveDate !== today) {
    const lastMs = new Date(lastActiveDate).getTime();
    const currMs = new Date(today).getTime();
    const diffDays = Math.round((currMs - lastMs) / (1000 * 3600 * 24));
    if (diffDays === 1) {
      streakDays += 1;
    } else if (diffDays > 1) {
      streakDays = 1;
    }
  }

  const sameToday = raw.todayDate === today;
  const todayXp = sameToday && typeof raw.todayXp === 'number' ? raw.todayXp : 0;

  return {
    streakDays,
    lastActiveDate: today,
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
}

export async function loadUserStats(): Promise<UserStats> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.USER_STATS);
    if (!raw) {
      const defaults = createDefaultStats();
      await saveUserStats(defaults);
      return defaults;
    }
    const parsed: Partial<UserStats> = JSON.parse(raw);
    const normalized = normalizeStats(parsed);
    await saveUserStats(normalized);
    return normalized;
  } catch (e) {
    return createDefaultStats();
  }
}

export async function saveUserStats(stats: UserStats): Promise<void> {
  try {
    const cleanStats: UserStats = {
      ...stats,
      cosmicRank: computeLeagueRankName(stats.stardustXp),
      hearts: Math.max(0, Math.min(stats.maxHearts, stats.hearts)),
    };
    setSoundEffectsEnabled(cleanStats.soundEnabled);
    await AsyncStorage.setItem(KEYS.USER_STATS, JSON.stringify(cleanStats));
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

export async function addXp(amount: number, bonusGems = 0): Promise<UserStats> {
  const stats = await loadUserStats();
  const safeXp = Math.max(0, amount);
  stats.stardustXp += safeXp;
  stats.todayXp += safeXp;
  stats.gems += Math.max(0, bonusGems);
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

  await saveUserStats(stats);
  return { stats, awardedXp, awardedGems, isFirstCompletion };
}

export async function updateHearts(delta: number): Promise<UserStats> {
  const stats = await loadUserStats();
  stats.hearts = Math.max(0, Math.min(stats.maxHearts, stats.hearts + delta));
  await saveUserStats(stats);
  return stats;
}

export async function refillHeartsWithGems(cost = 25): Promise<{ success: boolean; stats: UserStats }> {
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
  await saveUserStats(stats);

  // Also sync flag into saved vocab cache
  const words = await loadVocabularyList();
  const updatedWords = words.map((w) =>
    w.word.toLowerCase() === clean ? { ...w, memorized: true } : w
  );
  await saveVocabularyList(updatedWords);
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
  await saveUserStats(stats);

  const words = await loadVocabularyList();
  const updatedWords = words.map((w) =>
    w.word.toLowerCase() === clean ? { ...w, memorized: saved } : w
  );
  await saveVocabularyList(updatedWords);

  return { stats, saved };
}

export async function loadVocabularyList(): Promise<WordDefinition[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SAVED_WORDS);
    if (!raw) return STARTER_VOCABULARY;
    const parsed: WordDefinition[] = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : STARTER_VOCABULARY;
  } catch (e) {
    return STARTER_VOCABULARY;
  }
}

export async function saveVocabularyList(words: WordDefinition[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SAVED_WORDS, JSON.stringify(words.slice(0, 60)));
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
  } catch (e) {
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
  } catch (e) {}
  return 'en-US';
}

export async function savePreferredAccent(accent: EnglishAccent): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.PREFERRED_ACCENT, accent);
    setPreferredAccent(accent);
  } catch (e) {}
}

export async function savePreferredSpeechRate(rate: number): Promise<void> {
  try {
    setSpeechRate(rate);
    await AsyncStorage.setItem(KEYS.SPEECH_RATE, String(rate));
  } catch (e) {}
}

export async function resetAllUserProgress(): Promise<UserStats> {
  const fresh = createDefaultStats();
  await Promise.all([
    AsyncStorage.setItem(KEYS.USER_STATS, JSON.stringify(fresh)),
    AsyncStorage.removeItem(KEYS.SAVED_WORDS),
  ]);
  setSoundEffectsEnabled(fresh.soundEnabled);
  return fresh;
}

export async function loadAuthUser(): Promise<AuthUser | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.AUTH_USER);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (parsed && typeof parsed.name === 'string' && parsed.name.trim()) {
      return {
        name: parsed.name.trim(),
        email: typeof parsed.email === 'string' ? parsed.email : '',
        provider:
          parsed.provider === 'google' || parsed.provider === 'guest'
            ? parsed.provider
            : 'email',
        createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
        learningGoal:
          typeof parsed.learningGoal === 'string' && parsed.learningGoal.trim()
            ? parsed.learningGoal.trim()
            : undefined,
        dailyGoalMinutes:
          typeof parsed.dailyGoalMinutes === 'number' && Number.isFinite(parsed.dailyGoalMinutes)
            ? parsed.dailyGoalMinutes
            : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveAuthUser(user: AuthUser): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.AUTH_USER, JSON.stringify(user));
  } catch (e) {
    console.warn('Failed to save auth user:', e);
  }
}

export async function signOutAuthUser(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEYS.AUTH_USER);
  } catch (e) {
    console.warn('Failed to sign out user:', e);
  }
}
