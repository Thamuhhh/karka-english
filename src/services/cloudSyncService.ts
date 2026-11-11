import { supabase } from '../lib/supabase';
import { AuthUser, LeaderboardEntry, UserStats, WordDefinition } from '../types';
import { EnglishAccent } from './ttsService';
import { computeLeagueRankName } from './leaderboardService';

const AVATAR_PALETTE = [
  '#7F43FE',
  '#F59E0B',
  '#06B6D4',
  '#EC4899',
  '#10B981',
  '#8B5CF6',
  '#3B82F6',
  '#14B8A6',
];

export interface CloudUserBundle {
  stats: UserStats | null;
  vocabulary: WordDefinition[] | null;
  accent?: EnglishAccent;
  speechRate?: number;
  profileName?: string;
  avatarId?: string;
}

interface ProfileRow {
  display_name: string | null;
  avatar_color: string | null;
  avatar_id: string | null;
  preferred_accent: string | null;
  speech_rate: number | string | null;
  daily_goal_xp: number | null;
  sound_enabled: boolean | null;
}

interface UserProgressRow {
  user_id?: string;
  streak_days: number;
  last_active_date: string;
  stardust_xp: number;
  cosmic_rank: string;
  gems: number;
  hearts: number;
  max_hearts: number;
  today_xp: number;
  today_date: string;
  daily_goal_xp: number;
  words_mastered: number;
  conversations_done: number;
  sentences_checked: number;
  completed_classes: string[] | null;
  mastered_words: string[] | null;
  sound_enabled: boolean;
}

interface UserVocabularyRow {
  word: string;
  phonetic: string | null;
  audio_url: string | null;
  part_of_speech: string;
  definition: string;
  example: string;
  synonyms: string[] | null;
  tamil_meaning: string;
  cefr_level: string;
  memorized: boolean;
}

interface LeaderboardRow {
  user_id: string;
  display_name: string;
  avatar_initials: string;
  avatar_color: string;
  avatar_id?: string | null;
  stardust_xp: number;
  streak_days: number;
  cosmic_rank: string;
}

export function computeAvatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  const single = parts[0] || 'KL';
  return single.slice(0, 2).toUpperCase();
}

export function pickAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function isValidCefr(level: string): WordDefinition['cefrLevel'] {
  if (
    level === 'A1' ||
    level === 'A2' ||
    level === 'B1' ||
    level === 'B2' ||
    level === 'C1' ||
    level === 'C2'
  ) {
    return level;
  }
  return 'B1';
}

function isValidAccent(accent: string | null | undefined): accent is EnglishAccent {
  return accent === 'en-US' || accent === 'en-GB' || accent === 'en-AU';
}

function mapProgressRowToUserStats(row: UserProgressRow): UserStats {
  const completed = Array.isArray(row.completed_classes)
    ? Array.from(new Set(row.completed_classes))
    : [];
  const mastered = Array.isArray(row.mastered_words)
    ? Array.from(new Set(row.mastered_words))
    : [];

  return {
    streakDays: row.streak_days,
    lastActiveDate: row.last_active_date,
    stardustXp: row.stardust_xp,
    cosmicRank: computeLeagueRankName(row.stardust_xp),
    gems: row.gems,
    hearts: row.hearts,
    maxHearts: row.max_hearts,
    todayXp: row.today_xp,
    todayDate: row.today_date,
    dailyGoalXp: row.daily_goal_xp,
    wordsMastered: row.words_mastered,
    conversationsDone: row.conversations_done,
    sentencesChecked: row.sentences_checked,
    completedClasses: completed,
    masteredWords: mastered,
    soundEnabled: row.sound_enabled,
  };
}

function mapUserStatsToProgressRow(userId: string, stats: UserStats): UserProgressRow {
  return {
    user_id: userId,
    streak_days: Math.max(1, stats.streakDays),
    last_active_date: stats.lastActiveDate,
    stardust_xp: Math.max(0, stats.stardustXp),
    cosmic_rank: computeLeagueRankName(stats.stardustXp),
    gems: Math.max(0, stats.gems),
    hearts: Math.max(0, Math.min(stats.maxHearts, stats.hearts)),
    max_hearts: Math.max(1, stats.maxHearts),
    today_xp: Math.max(0, stats.todayXp),
    today_date: stats.todayDate,
    daily_goal_xp: Math.max(10, stats.dailyGoalXp),
    words_mastered: Math.max(0, stats.wordsMastered),
    conversations_done: Math.max(0, stats.conversationsDone),
    sentences_checked: Math.max(0, stats.sentencesChecked),
    completed_classes: stats.completedClasses,
    mastered_words: stats.masteredWords,
    sound_enabled: stats.soundEnabled,
  };
}

function canUseCloud(authUser: AuthUser | null): authUser is AuthUser & { id: string } {
  return Boolean(supabase && authUser?.id && authUser.isCloudSession);
}

export async function ensureCloudProvisioned(
  authUser: AuthUser,
  seedStats: UserStats,
  prefs: { accent: EnglishAccent; speechRate: number }
): Promise<void> {
  if (!supabase || !canUseCloud(authUser)) return;
  const userId = authUser.id;
  const displayName = authUser.name.trim() || 'Elvate Learner';
  const avatarColor = pickAvatarColor(userId);
  const avatarInitials = computeAvatarInitials(displayName);

  try {
    await Promise.all([
      supabase.from('profiles').upsert(
        {
          id: userId,
          display_name: displayName,
          avatar_color: avatarColor,
          avatar_id: authUser.avatarId || 'lion',
          preferred_accent: prefs.accent,
          speech_rate: prefs.speechRate,
          daily_goal_xp: seedStats.dailyGoalXp,
          sound_enabled: seedStats.soundEnabled,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      ),
      supabase
        .from('user_progress')
        .upsert(mapUserStatsToProgressRow(userId, seedStats), {
          onConflict: 'user_id',
          ignoreDuplicates: true,
        }),
      supabase.from('leaderboard_entries').upsert(
        {
          user_id: userId,
          display_name: displayName,
          avatar_initials: avatarInitials,
          avatar_color: avatarColor,
          avatar_id: authUser.avatarId || 'lion',
          stardust_xp: seedStats.stardustXp,
          streak_days: seedStats.streakDays,
          cosmic_rank: computeLeagueRankName(seedStats.stardustXp),
        },
        { onConflict: 'user_id', ignoreDuplicates: true }
      ),
    ]);
  } catch (e) {
    console.warn('Cloud provisioning skipped:', e);
  }
}

export async function pullCloudUserData(authUser: AuthUser): Promise<CloudUserBundle | null> {
  if (!supabase || !canUseCloud(authUser)) return null;

  try {
    const [profileRes, progressRes, vocabRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('display_name, avatar_color, avatar_id, preferred_accent, speech_rate, daily_goal_xp, sound_enabled')
        .eq('id', authUser.id)
        .maybeSingle<ProfileRow>(),
      supabase
        .from('user_progress')
        .select(
          'streak_days, last_active_date, stardust_xp, cosmic_rank, gems, hearts, max_hearts, today_xp, today_date, daily_goal_xp, words_mastered, conversations_done, sentences_checked, completed_classes, mastered_words, sound_enabled'
        )
        .eq('user_id', authUser.id)
        .maybeSingle<UserProgressRow>(),
      supabase
        .from('user_vocabulary')
        .select(
          'word, phonetic, audio_url, part_of_speech, definition, example, synonyms, tamil_meaning, cefr_level, memorized'
        )
        .eq('user_id', authUser.id)
        .order('updated_at', { ascending: false })
        .limit(60),
    ]);

    if (profileRes.error) console.warn('Cloud profile pull warning:', profileRes.error.message);
    if (progressRes.error) console.warn('Cloud progress pull warning:', progressRes.error.message);
    if (vocabRes.error) console.warn('Cloud vocabulary pull warning:', vocabRes.error.message);

    const profile = profileRes.data;
    const progress = progressRes.data;
    const vocabRows = (vocabRes.data || []) as UserVocabularyRow[];

    const parsedRate =
      profile?.speech_rate !== null && profile?.speech_rate !== undefined
        ? Number(profile.speech_rate)
        : undefined;

    const mappedVocab: WordDefinition[] | null =
      vocabRows.length > 0
        ? vocabRows.map((row) => ({
            word: row.word,
            phonetic: row.phonetic || undefined,
            audioUrl: row.audio_url || undefined,
            partOfSpeech: row.part_of_speech,
            definition: row.definition,
            example: row.example,
            synonyms: Array.isArray(row.synonyms) ? row.synonyms : [],
            tamilMeaning: row.tamil_meaning,
            cefrLevel: isValidCefr(row.cefr_level),
            memorized: Boolean(row.memorized),
          }))
        : null;

    return {
      stats: progress ? mapProgressRowToUserStats(progress) : null,
      vocabulary: mappedVocab,
      accent: isValidAccent(profile?.preferred_accent) ? profile?.preferred_accent : undefined,
      speechRate:
        typeof parsedRate === 'number' && !Number.isNaN(parsedRate) && parsedRate >= 0.5 && parsedRate <= 1.5
          ? parsedRate
          : undefined,
      profileName: profile?.display_name || undefined,
      avatarId: profile?.avatar_id || undefined,
    };
  } catch (e) {
    console.warn('Cloud sync pull failed (using offline cache):', e);
    return null;
  }
}

export async function pushProgressAndLeaderboard(
  authUser: AuthUser | null,
  stats: UserStats
): Promise<void> {
  if (!supabase || !canUseCloud(authUser)) return;
  const userId = authUser.id;
  const displayName = authUser.name.trim() || 'Elvate Learner';
  const avatarInitials = computeAvatarInitials(displayName);
  const avatarColor = pickAvatarColor(userId);
  const rankName = computeLeagueRankName(stats.stardustXp);

  try {
    const [progRes, lbRes, profRes] = await Promise.all([
      supabase
        .from('user_progress')
        .upsert(mapUserStatsToProgressRow(userId, stats), { onConflict: 'user_id' }),
      supabase.from('leaderboard_entries').upsert(
        {
          user_id: userId,
          display_name: displayName,
          avatar_initials: avatarInitials,
          avatar_color: avatarColor,
          avatar_id: authUser.avatarId || 'lion',
          stardust_xp: Math.max(0, stats.stardustXp),
          streak_days: Math.max(1, stats.streakDays),
          cosmic_rank: rankName,
        },
        { onConflict: 'user_id' }
      ),
      supabase
        .from('profiles')
        .update({
          display_name: displayName,
          daily_goal_xp: Math.max(10, stats.dailyGoalXp),
          sound_enabled: stats.soundEnabled,
          avatar_id: authUser.avatarId || 'lion',
        })
        .eq('id', userId),
    ]);

    if (progRes.error) console.warn('Cloud progress push warning:', progRes.error.message);
    if (lbRes.error) console.warn('Cloud leaderboard push warning:', lbRes.error.message);
    if (profRes.error) console.warn('Cloud profile push warning:', profRes.error.message);
  } catch (e) {
    console.warn('Cloud progress push failed:', e);
  }
}

export async function pushPreferencesToCloud(
  authUser: AuthUser | null,
  prefs: { accent?: EnglishAccent; speechRate?: number }
): Promise<void> {
  if (!supabase || !canUseCloud(authUser)) return;
  const patch: Record<string, unknown> = {};
  if (prefs.accent) patch.preferred_accent = prefs.accent;
  if (typeof prefs.speechRate === 'number') patch.speech_rate = prefs.speechRate;
  if (Object.keys(patch).length === 0) return;

  try {
    const { error } = await supabase.from('profiles').update(patch).eq('id', authUser.id);
    if (error) console.warn('Cloud preferences push warning:', error.message);
  } catch (e) {
    console.warn('Cloud preferences push failed:', e);
  }
}

export async function pushVocabularyToCloud(
  authUser: AuthUser | null,
  words: WordDefinition[]
): Promise<void> {
  if (!supabase || !canUseCloud(authUser) || words.length === 0) return;
  const userId = authUser.id;
  const deduped = new Map<string, WordDefinition>();
  for (const item of words.slice(0, 60)) {
    const cleanWord = item.word.trim().toLowerCase();
    if (cleanWord && !deduped.has(cleanWord)) {
      deduped.set(cleanWord, { ...item, word: item.word.trim() });
    }
  }

  const rows = Array.from(deduped.values()).map((item) => ({
    user_id: userId,
    word: item.word.toLowerCase(),
    phonetic: item.phonetic || null,
    audio_url: item.audioUrl || null,
    part_of_speech: item.partOfSpeech || 'noun',
    definition: item.definition,
    example: item.example || '',
    synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
    tamil_meaning: item.tamilMeaning || '',
    cefr_level: isValidCefr(item.cefrLevel),
    memorized: Boolean(item.memorized),
  }));

  try {
    const { error } = await supabase
      .from('user_vocabulary')
      .upsert(rows, { onConflict: 'user_id,word' });
    if (error) console.warn('Cloud vocabulary push warning:', error.message);
  } catch (e) {
    console.warn('Cloud vocabulary push failed:', e);
  }
}

export async function resetCloudUserData(
  authUser: AuthUser | null,
  freshStats: UserStats
): Promise<void> {
  if (!supabase || !canUseCloud(authUser)) return;
  try {
    await supabase.from('user_vocabulary').delete().eq('user_id', authUser.id);
    await pushProgressAndLeaderboard(authUser, freshStats);
  } catch (e) {
    console.warn('Cloud reset failed:', e);
  }
}

export async function fetchCloudLeaderboard(
  stats: UserStats,
  authUser: AuthUser | null
): Promise<LeaderboardEntry[] | null> {
  if (!supabase || !canUseCloud(authUser)) return null;

  try {
    const { data, error } = await supabase
      .from('leaderboard_entries')
      .select('user_id, display_name, avatar_initials, avatar_color, avatar_id, stardust_xp, streak_days, cosmic_rank')
      .order('stardust_xp', { ascending: false })
      .order('streak_days', { ascending: false })
      .limit(50);

    if (error || !data || data.length === 0) {
      return null;
    }

    const rows = data as LeaderboardRow[];
    let foundMe = false;

    const combined: Omit<LeaderboardEntry, 'rank'>[] = rows.map((row) => {
      const isMe = row.user_id === authUser.id;
      if (isMe) foundMe = true;
      return {
        name: isMe ? `${authUser.name} (You)` : row.display_name,
        initials: row.avatar_initials || computeAvatarInitials(row.display_name),
        color: row.avatar_color || pickAvatarColor(row.user_id),
        avatarId: (isMe ? authUser.avatarId : undefined) || row.avatar_id || undefined,
        xp: isMe ? Math.max(row.stardust_xp, stats.stardustXp) : row.stardust_xp,
        streak: isMe ? Math.max(row.streak_days, stats.streakDays) : row.streak_days,
        isCurrentUser: isMe,
      };
    });

    if (!foundMe) {
      combined.push({
        name: `${authUser.name} (You)`,
        initials: computeAvatarInitials(authUser.name),
        color: pickAvatarColor(authUser.id),
        avatarId: authUser.avatarId || 'lion',
        xp: stats.stardustXp,
        streak: stats.streakDays,
        isCurrentUser: true,
      });
    }

    combined.sort((a, b) => {
      if (b.xp !== a.xp) return b.xp - a.xp;
      if (b.streak !== a.streak) return b.streak - a.streak;
      return a.isCurrentUser ? -1 : b.isCurrentUser ? 1 : 0;
    });

    return combined.map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));
  } catch (e) {
    console.warn('Cloud leaderboard fetch failed:', e);
    return null;
  }
}
