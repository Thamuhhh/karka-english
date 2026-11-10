import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { UserStats, WordDefinition } from '../types';
import { loadUserStats, addXp } from '../services/storageService';
import { STARTER_VOCABULARY, fetchWordDetails } from '../api/dictionary';
import { SCENARIOS } from '../constants/scenarios';
import { speakText, playRemoteAudio } from '../services/ttsService';

interface DashboardProps {
  onSelectTab: (tab: 'coach' | 'grammar' | 'vocab' | 'profile') => void;
  onSelectScenario: (scenarioId: string) => void;
}

export const DashboardScreen: React.FC<DashboardProps> = ({ onSelectTab, onSelectScenario }) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [dailyWord, setDailyWord] = useState<WordDefinition>(STARTER_VOCABULARY[0]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [quizAnswered, setQuizAnswered] = useState<boolean>(false);
  const [quizCorrect, setQuizCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    loadUserStats().then(setStats);
    // Pick daily word based on day of month
    const day = new Date().getDate();
    const word = STARTER_VOCABULARY[day % STARTER_VOCABULARY.length];
    setDailyWord(word);
  }, []);

  const handlePlayWordAudio = async () => {
    setIsPlayingAudio(true);
    if (dailyWord.audioUrl) {
      await playRemoteAudio(dailyWord.audioUrl, () => setIsPlayingAudio(false));
    } else {
      await speakText(dailyWord.word, () => setIsPlayingAudio(false));
    }
  };

  const handleQuizOption = async (option: string) => {
    if (quizAnswered) return;
    setQuizAnswered(true);
    const isCorrect = option === 'did not go';
    setQuizCorrect(isCorrect);
    if (isCorrect) {
      const updated = await addXp(25);
      setStats(updated);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Banner */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Vanakkam! Ready to speak?</Text>
          <Text style={styles.title}>Supernova AI English</Text>
        </View>
        <View style={styles.streakBadge}>
          <MaterialCommunityIcons name="fire" size={22} color={THEME.colors.gold} />
          <Text style={styles.streakText}>{stats?.streakDays || 1} Day Streak</Text>
        </View>
      </View>

      {/* Cosmic XP Card */}
      <View style={styles.cosmicCard}>
        <View style={styles.cosmicRow}>
          <View style={styles.rankIconCircle}>
            <MaterialCommunityIcons name="star-shooting" size={24} color={THEME.colors.gold} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.rankLabel}>COSMIC FLUENCY RANK</Text>
            <Text style={styles.rankName}>{stats?.cosmicRank || 'Star Cadet'}</Text>
          </View>
          <View style={styles.xpPill}>
            <Ionicons name="sparkles" size={14} color={THEME.colors.secondary} />
            <Text style={styles.xpText}>{stats?.stardustXp || 120} XP</Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(100, ((stats?.stardustXp || 120) % 500) / 5)}%` },
            ]}
          />
        </View>
      </View>

      {/* Word of the Day */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🌟 Word of the Day</Text>
        <TouchableOpacity onPress={() => onSelectTab('vocab')}>
          <Text style={styles.sectionLink}>View Vault</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.wordCard}>
        <View style={styles.wordTopRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.wordHeading}>
              <Text style={styles.wordText}>{dailyWord.word}</Text>
              <View style={styles.cefrBadge}>
                <Text style={styles.cefrText}>{dailyWord.cefrLevel}</Text>
              </View>
            </View>
            <Text style={styles.phoneticText}>{dailyWord.phonetic}</Text>
          </View>
          <TouchableOpacity
            style={[styles.audioBtn, isPlayingAudio && styles.audioBtnActive]}
            onPress={handlePlayWordAudio}
            disabled={isPlayingAudio}
          >
            <Ionicons
              name={isPlayingAudio ? 'volume-high' : 'volume-medium-outline'}
              size={22}
              color={THEME.colors.text}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.definitionText}>{dailyWord.definition}</Text>
        <View style={styles.tamilBox}>
          <Text style={styles.tamilLabel}>தமிழ் விளக்கம்:</Text>
          <Text style={styles.tamilMeaning}>{dailyWord.tamilMeaning}</Text>
        </View>
        <Text style={styles.exampleText}>"{dailyWord.example}"</Text>
      </View>

      {/* Quick Launch Roleplay Scenarios */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🎙️ Speaking Roleplays</Text>
        <TouchableOpacity onPress={() => onSelectTab('coach')}>
          <Text style={styles.sectionLink}>All Missions</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {SCENARIOS.slice(0, 3).map((scenario) => (
          <TouchableOpacity
            key={scenario.id}
            style={styles.scenarioCard}
            onPress={() => {
              onSelectScenario(scenario.id);
              onSelectTab('coach');
            }}
          >
            <Text style={styles.scenarioAvatar}>{scenario.avatar}</Text>
            <Text style={styles.scenarioTitle}>{scenario.title}</Text>
            <Text style={styles.scenarioPersona} numberOfLines={1}>
              {scenario.persona}
            </Text>
            <View style={styles.startPill}>
              <Text style={styles.startPillText}>Start Practice</Text>
              <Ionicons name="arrow-forward" size={12} color={THEME.colors.primaryGlow} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Daily 30s Grammar Challenge */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>⚡ 30-Second Grammar Fix</Text>
      </View>
      <View style={styles.challengeCard}>
        <Text style={styles.challengeQuestion}>
          Which one is grammatically correct?
        </Text>
        <Text style={styles.challengeSentence}>
          "Yesterday, I ______ to the client meeting."
        </Text>

        <View style={styles.optionsRow}>
          {['didn\'t went', 'did not go', 'have gone'].map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.optionBtn,
                quizAnswered && opt === 'did not go' && styles.optionCorrect,
                quizAnswered && opt !== 'did not go' && styles.optionDimmed,
              ]}
              onPress={() => handleQuizOption(opt)}
            >
              <Text style={styles.optionBtnText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {quizAnswered && (
          <View style={styles.quizFeedback}>
            <Text style={[styles.quizFeedbackText, { color: quizCorrect ? THEME.colors.success : THEME.colors.error }]}>
              {quizCorrect ? '🎉 Semma! Correct answer! +25 XP' : '❌ Thappu! Correct: "did not go"'}
            </Text>
            <Text style={styles.quizTamilHint}>
              💡 'Did' வந்த பிறகு எப்போதுமே base verb 'go' தான் வர வேண்டும்.
            </Text>
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceCard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  streakText: {
    color: THEME.colors.gold,
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 4,
  },
  cosmicCard: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 24,
  },
  cosmicRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankLabel: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  rankName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  xpText: {
    color: THEME.colors.secondary,
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: 3,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  sectionLink: {
    fontSize: 13,
    color: THEME.colors.primaryGlow,
    fontWeight: '600',
  },
  wordCard: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 24,
  },
  wordTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  wordHeading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  cefrBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  cefrText: {
    color: THEME.colors.primaryGlow,
    fontSize: 11,
    fontWeight: '700',
  },
  phoneticText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  audioBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioBtnActive: {
    backgroundColor: THEME.colors.primary,
  },
  definitionText: {
    fontSize: 14,
    color: THEME.colors.text,
    lineHeight: 20,
    marginTop: 10,
  },
  tamilBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  tamilLabel: {
    fontSize: 11,
    color: THEME.colors.gold,
    fontWeight: '600',
  },
  tamilMeaning: {
    fontSize: 13,
    color: THEME.colors.text,
    marginTop: 2,
  },
  exampleText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: THEME.colors.textSecondary,
    marginTop: 10,
  },
  horizontalScroll: {
    marginBottom: 24,
  },
  scenarioCard: {
    width: 170,
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginRight: 12,
  },
  scenarioAvatar: {
    fontSize: 32,
    marginBottom: 8,
  },
  scenarioTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  scenarioPersona: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  startPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
  },
  startPillText: {
    fontSize: 12,
    color: THEME.colors.primaryGlow,
    fontWeight: '600',
    marginRight: 4,
  },
  challengeCard: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 20,
  },
  challengeQuestion: {
    fontSize: 12,
    color: THEME.colors.secondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  challengeSentence: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.text,
    marginTop: 6,
    marginBottom: 14,
  },
  optionsRow: {
    gap: 8,
  },
  optionBtn: {
    backgroundColor: THEME.colors.surfaceElevated,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  optionCorrect: {
    backgroundColor: THEME.colors.successBg,
    borderColor: THEME.colors.success,
  },
  optionDimmed: {
    opacity: 0.5,
  },
  optionBtnText: {
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  quizFeedback: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  quizFeedbackText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  quizTamilHint: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
});

