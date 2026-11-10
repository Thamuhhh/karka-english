export type RoleplayCategory = 'interview' | 'daily' | 'travel' | 'work' | 'social';

export interface RoleplayScenario {
  id: string;
  title: string;
  category: RoleplayCategory;
  description: string;
  avatar: string;
  persona: string;
  systemPrompt: string;
  initialMessage: string;
}

export interface GrammarCorrection {
  originalSentence: string;
  correctedSentence: string;
  hasErrors: boolean;
  explanation: string;
  tamilExplanation: string;
  formalVersion: string;
  casualVersion: string;
  nativeIdiomaticVersion: string;
  fluencyScore: number; // 0-100
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  feedback?: GrammarCorrection;
  audioPlaying?: boolean;
}

export interface WordDefinition {
  word: string;
  phonetic?: string;
  audioUrl?: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  synonyms: string[];
  tamilMeaning: string;
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  memorized?: boolean;
}

export interface UserStats {
  streakDays: number;
  lastActiveDate: string;
  stardustXp: number;
  cosmicRank: string;
  gems: number;
  hearts: number;
  maxHearts: number;
  todayXp: number;
  todayDate: string;
  dailyGoalXp: number;
  wordsMastered: number;
  conversationsDone: number;
  sentencesChecked: number;
  completedClasses: string[];
  masteredWords: string[];
  soundEnabled: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  initials: string;
  color: string;
  xp: number;
  streak: number;
  isCurrentUser?: boolean;
}
