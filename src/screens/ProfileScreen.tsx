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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../constants/theme';
import { SUPERNOVA_LEVELS } from '../constants/curriculum';
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
import { LiveStreakBadge } from '../components/LiveStreakBadge';

interface ProfileScreenProps {
  stats: UserStats;
  onStatsUpdate: (stats: UserStats) => void;
}

const MAX_CONTENT_WIDTH = 480;
const TOTAL_CURRICULUM_CLASSES = SUPERNOVA_LEVELS.reduce(
  (sum, lvl) => sum + lvl.classes.length,
  0
);

const DAILY_GOALS = [
  { xp: 50, label: 'Casual' },
  { xp: 100, label: 'Regular' },
  { xp: 200, label: 'Intensive' },
];

const ACCENT_OPTIONS: Array<{ id: EnglishAccent; shortLabel: string }> = [
  { id: 'en-US', shortLabel: 'US' },
  { id: 'en-GB', shortLabel: 'UK' },
  { id: 'en-AU', shortLabel: 'AU' },
];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ stats, onStatsUpdate }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSavedKey, setIsSavedKey] = useState(false);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [keyMessage, setKeyMessage] = useState<string | null>(null);
  const [showApiConfig, setShowApiConfig] = useState(false);
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
      setKeyMessage('API key removed. Using built-in offline engine.');
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

  const handleSpeechSpeedChange = async (enabledSlow: boolean) => {
    setIsSlowSpeech(enabledSlow);
    await savePreferredSpeechRate(enabledSlow ? 0.75 : 0.95);
  };

  const handleToggleSound = async (enabled: boolean) => {
    const updated = await updateSoundSetting(enabled);
    onStatsUpdate(updated);
  };

  const handleSelectDailyGoal = async (goalXp: number) => {
    const updated = await updateDailyGoal(goalXp);
    onStatsUpdate(updated);
  };

  const handleResetProgress = () => {
    Alert.alert(
      'Reset Learning Progress?',
      'This clears your completed lessons, XP, saved vocabulary, and daily streak.',
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
  const coursePct =
    TOTAL_CURRICULUM_CLASSES > 0
      ? Math.round((stats.completedClasses.length / TOTAL_CURRICULUM_CLASSES) * 100)
      : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Clean Real-App Account Header */}
      <View style={styles.accountHeader}>
        <View style={styles.accountLeft}>
          <View style={styles.avatarRing}>
            <Image
              source={SUPERNOVA_IMAGES.novaAvatar}
              style={styles.avatarImg}
              resizeMode="cover"
            />
          </View>
          <View style={styles.identityCol}>
            <Text style={styles.userName}>NovaBreaker Learner</Text>
            <View style={styles.rankSubRow}>
              <View style={styles.rankDot} />
              <Text style={styles.rankLabel}>{stats.cosmicRank}</Text>
              <Text style={styles.metaSep}>·</Text>
              <Text style={styles.coursePctText}>{coursePct}% Course</Text>
            </View>
          </View>
        </View>

        <LiveStreakBadge streakDays={stats.streakDays} />
      </View>

      {/* Unified Horizontal KPI Metrics Bar */}
      <View style={styles.kpiStrip}>
        <View style={styles.kpiCell}>
          <Text style={styles.kpiValue}>{stats.stardustXp}</Text>
          <Text style={styles.kpiLabel}>Total XP</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCell}>
          <Text style={styles.kpiValue}>{stats.wordsMastered}</Text>
          <Text style={styles.kpiLabel}>Saved Words</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCell}>
          <Text style={styles.kpiValue}>{stats.conversationsDone}</Text>
          <Text style={styles.kpiLabel}>Talks</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCell}>
          <Text style={styles.kpiValue}>
            {stats.completedClasses.length}/{TOTAL_CURRICULUM_CLASSES}
          </Text>
          <Text style={styles.kpiLabel}>Classes</Text>
        </View>
      </View>

      {/* Daily Target Progress & Intensity Switcher */}
      <View style={styles.goalSection}>
        <View style={styles.goalTopRow}>
          <Text style={styles.sectionEyebrow}>DAILY XP TARGET</Text>
          <Text style={styles.goalStatText}>
            {stats.todayXp} / {stats.dailyGoalXp} XP · {dailyGoalProgress}%
          </Text>
        </View>

        <View style={styles.goalTrack}>
          {dailyGoalProgress > 0 && (
            <LinearGradient
              colors={['#7F43FE', '#A78BFA']}
              style={[styles.goalFill, { width: `${dailyGoalProgress}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          )}
        </View>

        <View style={styles.goalSegmentTrack}>
          {DAILY_GOALS.map((g) => {
            const active = stats.dailyGoalXp === g.xp;
            return (
              <TouchableOpacity
                key={g.xp}
                style={[styles.goalSegmentBtn, active && styles.goalSegmentBtnActive]}
                onPress={() => handleSelectDailyGoal(g.xp)}
                activeOpacity={0.82}
              >
                <Text style={[styles.goalSegmentText, active && styles.goalSegmentTextActive]}>
                  {g.label} · {g.xp}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Voice & Audio Settings Group */}
      <Text style={styles.groupEyebrow}>VOICE &amp; AUDIO</Text>
      <View style={styles.settingsGroup}>
        {/* Inline Accent Selector Row */}
        <View style={styles.settingRow}>
          <View style={styles.settingLead}>
            <Ionicons name="globe-outline" size={18} color={THEME.colors.primaryGlow} />
            <Text style={styles.settingTitle}>Speech Accent</Text>
          </View>
          <View style={styles.inlineSegmented}>
            {ACCENT_OPTIONS.map((acc) => {
              const active = selectedAccent === acc.id;
              return (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.accentChip, active && styles.accentChipActive]}
                  onPress={() => handleAccentChange(acc.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.accentChipText, active && styles.accentChipTextActive]}>
                    {acc.shortLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.rowDivider} />

        {/* Slow Speech Toggle Row */}
        <View style={styles.settingRow}>
          <View style={styles.settingLead}>
            <Ionicons name="speedometer-outline" size={18} color={THEME.colors.primaryGlow} />
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Slow Speech Mode</Text>
              <Text style={styles.settingSub}>0.75x clearer syllable pacing</Text>
            </View>
          </View>
          <Switch
            value={isSlowSpeech}
            onValueChange={handleSpeechSpeedChange}
            trackColor={{ false: '#26233B', true: THEME.colors.primary }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#26233B"
          />
        </View>

        <View style={styles.rowDivider} />

        {/* Sound Effects Toggle Row */}
        <View style={styles.settingRow}>
          <View style={styles.settingLead}>
            <Ionicons name="volume-medium-outline" size={18} color={THEME.colors.primaryGlow} />
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Sound Effects</Text>
              <Text style={styles.settingSub}>Chimes on answers and completions</Text>
            </View>
          </View>
          <Switch
            value={stats.soundEnabled}
            onValueChange={handleToggleSound}
            trackColor={{ false: '#26233B', true: THEME.colors.primary }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#26233B"
          />
        </View>
      </View>

      {/* AI & Account Settings Group */}
      <Text style={styles.groupEyebrow}>COACHING ENGINE &amp; DATA</Text>
      <View style={styles.settingsGroup}>
        {/* Collapsible AI Key Configuration Row */}
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => setShowApiConfig((prev) => !prev)}
          activeOpacity={0.82}
        >
          <View style={styles.settingLead}>
            <Ionicons name="sparkles-outline" size={18} color={THEME.colors.primaryGlow} />
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>AI Coaching Engine</Text>
              <Text style={styles.settingSub}>
                {isSavedKey ? 'Gemini Live connected' : 'Built-in offline engine'}
              </Text>
            </View>
          </View>
          <View style={styles.rowEndAction}>
            <View style={[styles.statusDot, isSavedKey && styles.statusDotActive]} />
            <Ionicons
              name={showApiConfig ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={THEME.colors.textMuted}
            />
          </View>
        </TouchableOpacity>

        {showApiConfig && (
          <View style={styles.expandedApiPane}>
            <Text style={styles.apiHelperText}>
              Optional free Gemini key from aistudio.google.com for cloud coaching.
            </Text>
            <View style={styles.apiKeyRow}>
              <TextInput
                style={styles.keyInput}
                placeholder="Paste Gemini API key (AIza...)"
                placeholderTextColor={THEME.colors.textMuted}
                value={apiKey}
                onChangeText={setApiKey}
                secureTextEntry
              />
              <TouchableOpacity
                style={styles.saveKeyBtn}
                onPress={handleSaveApiKey}
                disabled={isValidatingKey}
                activeOpacity={0.84}
              >
                {isValidatingKey ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveKeyBtnText}>{isSavedKey ? 'Verify' : 'Save'}</Text>
                )}
              </TouchableOpacity>
            </View>
            {keyMessage && <Text style={styles.keyFeedbackText}>{keyMessage}</Text>}
          </View>
        )}

        <View style={styles.rowDivider} />

        {/* Reset Progress Action Row */}
        <TouchableOpacity
          style={styles.settingRow}
          onPress={handleResetProgress}
          activeOpacity={0.82}
        >
          <View style={styles.settingLead}>
            <Ionicons name="refresh-outline" size={18} color={THEME.colors.textSecondary} />
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Reset Learning Progress</Text>
              <Text style={styles.settingSub}>Clear XP, completed lessons, and streak</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={THEME.colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Subtle App Footer */}
      <View style={styles.footerInfo}>
        <Text style={styles.footerBrand}>NovaBreaker English · v1.0.0</Text>
        <Text style={styles.footerTagline}>
          Structured Tamil-to-English fluency training
        </Text>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },

  /* ACCOUNT HEADER */
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(167, 139, 250, 0.5)',
    backgroundColor: '#161423',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.04 }],
  },
  identityCol: {
    flex: 1,
    marginLeft: 13,
  },
  userName: {
    fontFamily: THEME.fonts.bold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  rankSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 6,
  },
  rankDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.primaryGlow,
  },
  rankLabel: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 12,
    color: '#C4B5FD',
  },
  metaSep: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  coursePctText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },

  /* UNIFIED KPI BAR */
  kpiStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151422',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    paddingVertical: 14,
    marginBottom: 20,
  },
  kpiCell: {
    flex: 1,
    alignItems: 'center',
  },
  kpiValue: {
    fontFamily: THEME.fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  kpiLabel: {
    fontFamily: THEME.fonts.body,
    fontSize: 10.5,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  kpiDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },

  /* DAILY GOAL SECTION */
  goalSection: {
    marginBottom: 22,
  },
  goalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  sectionEyebrow: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10.5,
    color: THEME.colors.textMuted,
    letterSpacing: 0.9,
  },
  goalStatText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11.5,
    color: '#C4B5FD',
  },
  goalTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#221F33',
    overflow: 'hidden',
    marginBottom: 12,
  },
  goalFill: {
    height: '100%',
    borderRadius: 2,
  },
  goalSegmentTrack: {
    flexDirection: 'row',
    backgroundColor: '#14131E',
    borderRadius: 11,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  goalSegmentBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  goalSegmentBtnActive: {
    backgroundColor: '#231E3A',
  },
  goalSegmentText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 11.5,
    color: THEME.colors.textMuted,
  },
  goalSegmentTextActive: {
    fontFamily: THEME.fonts.bold,
    color: '#FFFFFF',
  },

  /* GROUPED SETTINGS LISTS */
  groupEyebrow: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10.5,
    color: THEME.colors.textMuted,
    letterSpacing: 0.9,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  settingsGroup: {
    backgroundColor: '#151422',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    gap: 10,
  },
  settingLead: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingTextCol: {
    flex: 1,
  },
  settingTitle: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  settingSub: {
    fontFamily: THEME.fonts.body,
    fontSize: 11.5,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  rowDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  inlineSegmented: {
    flexDirection: 'row',
    backgroundColor: '#1D1B2D',
    borderRadius: 9,
    padding: 2,
    gap: 2,
  },
  accentChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  accentChipActive: {
    backgroundColor: THEME.colors.primary,
  },
  accentChipText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  accentChipTextActive: {
    fontFamily: THEME.fonts.bold,
    color: '#FFFFFF',
  },
  rowEndAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#6E6A85',
  },
  statusDotActive: {
    backgroundColor: THEME.colors.primaryGlow,
  },

  /* COLLAPSIBLE API KEY CONFIG */
  expandedApiPane: {
    paddingBottom: 14,
    paddingTop: 2,
  },
  apiHelperText: {
    fontFamily: THEME.fonts.body,
    fontSize: 11.5,
    color: THEME.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 17,
  },
  apiKeyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  keyInput: {
    flex: 1,
    fontFamily: THEME.fonts.body,
    backgroundColor: '#1D1B2D',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 12.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  saveKeyBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 66,
  },
  saveKeyBtnText: {
    fontFamily: THEME.fonts.bold,
    color: '#FFFFFF',
    fontSize: 12,
  },
  keyFeedbackText: {
    fontFamily: THEME.fonts.body,
    fontSize: 11.5,
    color: '#C4B5FD',
    marginTop: 7,
  },

  /* FOOTER */
  footerInfo: {
    alignItems: 'center',
    marginTop: 4,
  },
  footerBrand: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11.5,
    color: THEME.colors.textMuted,
  },
  footerTagline: {
    fontFamily: THEME.fonts.body,
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
});
