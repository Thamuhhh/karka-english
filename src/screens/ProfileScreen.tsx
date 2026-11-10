import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../constants/theme';
import { SUPERNOVA_IMAGES } from '../constants/supernovaAssets';
import { UserStats } from '../types';
import {
  loadSavedApiKey,
  saveApiKey,
  loadPreferredAccent,
  savePreferredAccent,
  savePreferredSpeechRate,
  updateDailyGoal,
  updateSoundSetting,
  resetAllUserProgress,
} from '../services/storageService';
import { validateGeminiApiKey } from '../api/supernovaAi';
import { EnglishAccent, getSpeechRate } from '../services/ttsService';

interface ProfileScreenProps {
  stats: UserStats;
  onStatsUpdate: (stats: UserStats) => void;
}

const DAILY_GOALS = [
  { xp: 50, label: 'Casual' },
  { xp: 100, label: 'Regular' },
  { xp: 200, label: 'Intensive' },
];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ stats, onStatsUpdate }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSavedKey, setIsSavedKey] = useState(false);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [keyMessage, setKeyMessage] = useState<string | null>(null);
  const [selectedAccent, setSelectedAccent] = useState<EnglishAccent>('en-US');
  const [isSlowSpeech, setIsSlowSpeech] = useState(false);

  useEffect(() => {
    loadSavedApiKey().then((key) => {
      if (key) {
        setApiKey(key);
        setIsSavedKey(true);
      }
    });
    loadPreferredAccent().then(setSelectedAccent);
    setIsSlowSpeech(getSpeechRate() < 0.9);
  }, []);

  const handleSaveApiKey = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      await saveApiKey('');
      setIsSavedKey(false);
      setKeyMessage('API key removed. Using offline engine.');
      return;
    }

    setIsValidatingKey(true);
    setKeyMessage(null);
    await saveApiKey(trimmed);
    setIsSavedKey(true);

    const check = await validateGeminiApiKey(trimmed);
    setKeyMessage(check.message);
    setIsValidatingKey(false);
  };

  const handleAccentChange = async (acc: EnglishAccent) => {
    setSelectedAccent(acc);
    await savePreferredAccent(acc);
  };

  const toggleSpeechSpeed = async () => {
    const newSlow = !isSlowSpeech;
    setIsSlowSpeech(newSlow);
    await savePreferredSpeechRate(newSlow ? 0.75 : 0.95);
  };

  const handleToggleSound = async () => {
    const updated = await updateSoundSetting(!stats.soundEnabled);
    onStatsUpdate(updated);
  };

  const handleSelectDailyGoal = async (goalXp: number) => {
    const updated = await updateDailyGoal(goalXp);
    onStatsUpdate(updated);
  };

  const handleResetProgress = () => {
    Alert.alert(
      'Reset Learning Progress?',
      'This clears your completed lessons, XP, vocabulary mastery, and daily streak.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const fresh = await resetAllUserProgress();
            onStatsUpdate(fresh);
          },
        },
      ]
    );
  };

  const dailyGoalProgress = Math.min(
    100,
    Math.round((stats.todayXp / Math.max(1, stats.dailyGoalXp)) * 100)
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header Card */}
      <LinearGradient
        colors={THEME.gradients.banner}
        style={styles.profileCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.avatar}>
          <Image
            source={SUPERNOVA_IMAGES.streakNova}
            style={styles.streakNovaAvatar}
            resizeMode="cover"
          />
        </View>
        <Text style={styles.userName}>Learner Profile</Text>
        <Text style={styles.userRank}>{stats.cosmicRank}</Text>

        {/* Daily Goal Progress */}
        <View style={styles.dailyGoalBox}>
          <View style={styles.dailyGoalTopRow}>
            <Text style={styles.dailyGoalLabel}>DAILY XP GOAL</Text>
            <Text style={styles.dailyGoalCount}>
              {stats.todayXp}/{stats.dailyGoalXp} XP ({dailyGoalProgress}%)
            </Text>
          </View>
          <View style={styles.dailyGoalTrack}>
            <View style={[styles.dailyGoalFill, { width: `${Math.max(4, dailyGoalProgress)}%` }]} />
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <View style={styles.statRowTop}>
              <MaterialCommunityIcons name="fire" size={18} color={THEME.colors.gold} />
              <Text style={styles.statVal}>{stats.streakDays}</Text>
            </View>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.statRowTop}>
              <Ionicons name="flash" size={16} color={THEME.colors.secondary} />
              <Text style={styles.statVal}>{stats.stardustXp}</Text>
            </View>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.statRowTop}>
              <Ionicons name="book" size={16} color={THEME.colors.accent} />
              <Text style={styles.statVal}>{stats.wordsMastered}</Text>
            </View>
            <Text style={styles.statLabel}>Words Learned</Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.statRowTop}>
              <Ionicons name="checkmark-circle" size={16} color={THEME.colors.primaryGlow} />
              <Text style={styles.statVal}>{stats.completedClasses.length}/22</Text>
            </View>
            <Text style={styles.statLabel}>Lessons Done</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Daily Goal Target Selector */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="flag-outline" size={19} color={THEME.colors.accent} />
          <Text style={styles.sectionTitle}>Daily Target</Text>
        </View>
        <View style={styles.accentRow}>
          {DAILY_GOALS.map((g) => {
            const active = stats.dailyGoalXp === g.xp;
            return (
              <TouchableOpacity
                key={g.xp}
                style={[styles.accentPill, active && styles.accentPillSelected]}
                onPress={() => handleSelectDailyGoal(g.xp)}
              >
                <Text style={[styles.accentPillText, active && styles.accentPillTextSelected]}>
                  {g.label} • {g.xp} XP
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Gemini API Key Settings */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="key-outline" size={20} color={THEME.colors.primaryGlow} />
          <Text style={styles.sectionTitle}>Google Gemini AI Key</Text>
        </View>
        <Text style={styles.sectionDesc}>
          Add your free API key from{' '}
          <Text style={{ color: THEME.colors.secondary }}>aistudio.google.com</Text> for live AI coaching replies.
        </Text>

        <View style={styles.apiKeyInputRow}>
          <TextInput
            style={styles.keyInput}
            placeholder="AIzaSy..."
            placeholderTextColor={THEME.colors.textMuted}
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry
          />
          <TouchableOpacity
            style={styles.saveKeyBtn}
            onPress={handleSaveApiKey}
            disabled={isValidatingKey}
          >
            {isValidatingKey ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveKeyBtnText}>{isSavedKey ? 'Verify' : 'Save'}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.keyStatusBox}>
          <Ionicons
            name={isSavedKey ? 'checkmark-circle' : 'information-circle'}
            size={16}
            color={isSavedKey ? THEME.colors.success : THEME.colors.gold}
          />
          <Text style={styles.keyStatusText}>
            {keyMessage ||
              (isSavedKey
                ? 'Active: Gemini Flash enabled with automatic offline fallback'
                : 'Using built-in offline diagnostics engine (No key required)')}
          </Text>
        </View>
      </View>

      {/* Audio & Preferences */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="volume-high-outline" size={20} color={THEME.colors.secondary} />
          <Text style={styles.sectionTitle}>Voice Accent & Sound</Text>
        </View>

        <Text style={styles.subHeading}>ENGLISH ACCENT</Text>
        <View style={styles.accentRow}>
          {[
            { id: 'en-US' as EnglishAccent, label: 'US English' },
            { id: 'en-GB' as EnglishAccent, label: 'UK English' },
            { id: 'en-AU' as EnglishAccent, label: 'AU English' },
          ].map((acc) => {
            const isSelected = selectedAccent === acc.id;
            return (
              <TouchableOpacity
                key={acc.id}
                style={[styles.accentPill, isSelected && styles.accentPillSelected]}
                onPress={() => handleAccentChange(acc.id)}
              >
                <Text style={[styles.accentPillText, isSelected && styles.accentPillTextSelected]}>
                  {acc.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.subHeading, { marginTop: 14 }]}>PREFERENCES</Text>
        <TouchableOpacity style={styles.speedToggleRow} onPress={toggleSpeechSpeed}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.speedLabel}>Slow Speech Mode (0.75x)</Text>
            <Text style={styles.speedDesc}>Clearer syllable pronunciation for learners</Text>
          </View>
          <View style={[styles.toggleCircle, isSlowSpeech && styles.toggleCircleActive]}>
            <Ionicons
              name={isSlowSpeech ? 'checkmark' : 'close'}
              size={14}
              color={THEME.colors.text}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.speedToggleRow, { marginTop: 8 }]}
          onPress={handleToggleSound}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.speedLabel}>Lesson Sound Effects</Text>
            <Text style={styles.speedDesc}>Play chimes on answers and completions</Text>
          </View>
          <View style={[styles.toggleCircle, stats.soundEnabled && styles.toggleCircleActive]}>
            <Ionicons
              name={stats.soundEnabled ? 'checkmark' : 'close'}
              size={14}
              color={THEME.colors.text}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Account Data & About */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="school-outline" size={20} color={THEME.colors.gold} />
          <Text style={styles.sectionTitle}>Supernova English</Text>
        </View>
        <Text style={styles.aboutText}>
          Built for learners aiming to speak fluent English naturally. Combines structured lessons, grammar diagnostics, vocabulary mastery, and Tamil mental-model guides.
        </Text>

        <View style={styles.footerActionRow}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
          <TouchableOpacity onPress={handleResetProgress} style={styles.resetBtn}>
            <Ionicons name="refresh-outline" size={14} color={THEME.colors.error} />
            <Text style={styles.resetBtnText}>Reset Progress</Text>
          </TouchableOpacity>
        </View>
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
    padding: 14,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  profileCard: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radius.lg,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 14,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#181724',
    borderWidth: 2,
    borderColor: THEME.colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  streakNovaAvatar: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.04 }],
  },
  userName: {
    fontFamily: THEME.fonts.bold,
    fontSize: 18,
    color: THEME.colors.text,
  },
  userRank: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: THEME.colors.gold,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dailyGoalBox: {
    width: '100%',
    marginTop: 12,
    backgroundColor: 'rgba(14, 14, 20, 0.45)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dailyGoalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dailyGoalLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    letterSpacing: 0.6,
  },
  dailyGoalCount: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: THEME.colors.accent,
  },
  dailyGoalTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  dailyGoalFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: THEME.colors.accent,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    width: '100%',
    justifyContent: 'space-between',
    gap: 8,
  },
  statBox: {
    width: '48%',
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  statRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statVal: {
    fontFamily: THEME.fonts.bold,
    fontSize: 16,
    color: THEME.colors.text,
  },
  statLabel: {
    fontFamily: THEME.fonts.body,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 15,
    color: THEME.colors.text,
    marginLeft: 8,
  },
  sectionDesc: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  apiKeyInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  keyInput: {
    fontFamily: THEME.fonts.body,
    flex: 1,
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: THEME.colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  saveKeyBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: 'center',
    minWidth: 68,
    alignItems: 'center',
  },
  saveKeyBtnText: {
    fontFamily: THEME.fonts.bold,
    color: THEME.colors.text,
    fontSize: 12.5,
  },
  keyStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  keyStatusText: {
    fontFamily: THEME.fonts.body,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  subHeading: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  accentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  accentPill: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceElevated,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  accentPillSelected: {
    backgroundColor: 'rgba(127, 67, 254, 0.2)',
    borderColor: THEME.colors.primary,
  },
  accentPillText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  accentPillTextSelected: {
    fontFamily: THEME.fonts.bold,
    color: THEME.colors.primaryGlow,
  },
  speedToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 12,
    borderRadius: 8,
  },
  speedLabel: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 13,
    color: THEME.colors.text,
  },
  speedDesc: {
    fontFamily: THEME.fonts.body,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  toggleCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: THEME.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleCircleActive: {
    backgroundColor: THEME.colors.primary,
  },
  aboutText: {
    fontFamily: THEME.fonts.body,
    fontSize: 12.5,
    color: THEME.colors.textSecondary,
    lineHeight: 19,
    marginTop: 2,
  },
  footerActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  versionText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  resetBtnText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.error,
  },
});
