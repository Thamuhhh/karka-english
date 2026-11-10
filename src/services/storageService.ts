import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserStats, WordDefinition } from '../types';
import { setGeminiApiKey } from '../api/supernovaAi';
import { setPreferredAccent, EnglishAccent } from './ttsService';

const KEYS = {
  USER_STATS: 'nova_user_stats',
  GEMINI_API_KEY: 'nova_gemini_key',
  SAVED_WORDS: 'nova_saved_words',
  PREFERRED_ACCENT: 'nova_preferred_accent',
};

const DEFAULT_STATS: UserStats = {
  streakDays: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
  stardustXp: 120,
  cosmicRank: 'Star Cadet',
  wordsMastered: 6,
  conversationsDone: 0,
  sentencesChecked: 0,
};

export async function loadUserStats(): Promise<UserStats> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.USER_STATS);
    if (!raw) {
      await saveUserStats(DEFAULT_STATS);
      return DEFAULT_STATS;
    }
    const stats: UserStats = JSON.parse(raw);
    
    // Check streak continuation
    const today = new Date().toISOString().split('T')[0];
    if (stats.lastActiveDate !== today) {
      const lastDate = new Date(stats.lastActiveDate);
      const currDate = new Date(today);
      const diffDays = Math.round((currDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
      
      if (diffDays === 1) {
        stats.streakDays += 1;
      } else if (diffDays > 1) {
        stats.streakDays = 1;
      }
      stats.lastActiveDate = today;
      await saveUserStats(stats);
    }
    return stats;
  } catch (e) {
    return DEFAULT_STATS;
  }
}

export async function saveUserStats(stats: UserStats): Promise<void> {
  try {
    // Calculate cosmic rank based on XP
    if (stats.stardustXp >= 1500) {
      stats.cosmicRank = 'Supernova Legend';
    } else if (stats.stardustXp >= 800) {
      stats.cosmicRank = 'Nebula Master';
    } else if (stats.stardustXp >= 350) {
      stats.cosmicRank = 'Solar Voyager';
    } else {
      stats.cosmicRank = 'Star Cadet';
    }
    await AsyncStorage.setItem(KEYS.USER_STATS, JSON.stringify(stats));
  } catch (e) {
    console.warn('Failed to save stats:', e);
  }
}

export async function addXp(amount: number): Promise<UserStats> {
  const stats = await loadUserStats();
  stats.stardustXp += amount;
  await saveUserStats(stats);
  return stats;
}

export async function incrementMetric(field: 'conversationsDone' | 'sentencesChecked' | 'wordsMastered', amount = 1): Promise<UserStats> {
  const stats = await loadUserStats();
  stats[field] += amount;
  stats.stardustXp += amount * 15; // Award 15 XP per activity
  await saveUserStats(stats);
  return stats;
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
    await AsyncStorage.setItem(KEYS.GEMINI_API_KEY, key);
    setGeminiApiKey(key);
  } catch (e) {
    console.warn('Failed to save API key:', e);
  }
}

export async function loadPreferredAccent(): Promise<EnglishAccent> {
  try {
    const accent = (await AsyncStorage.getItem(KEYS.PREFERRED_ACCENT)) as EnglishAccent;
    if (accent) {
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
