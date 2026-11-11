import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { THEME } from '../constants/theme';
import { EnglishAccent, getSpeechRate } from '../services/ttsService';
import {
  loadPreferredAccent,
  resetAllUserProgress,
  savePreferredAccent,
  savePreferredSpeechRate,
  updateDailyGoal,
  updateSoundSetting,
} from '../services/storageService';
import { UserStats } from '../types';

const ACCENT_OPTIONS: Array<{ id: EnglishAccent; shortLabel: string }> = [
  { id: 'en-US', shortLabel: 'US' },
  { id: 'en-GB', shortLabel: 'UK' },
  { id: 'en-AU', shortLabel: 'AU' },
];
const DAILY_GOALS = [50, 100, 200];
interface SettingsScreenProps {
  stats: UserStats;
  onStatsUpdate: (stats: UserStats) => void;
  onClose: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  stats,
  onStatsUpdate,
  onClose,
}) => {
  const [selectedAccent, setSelectedAccent] = useState<EnglishAccent>('en-US');
  const [isSlowSpeech, setIsSlowSpeech] = useState(false);

  useEffect(() => {
    loadPreferredAccent().then(setSelectedAccent);
    setIsSlowSpeech(getSpeechRate() < 0.9);
  }, []);

  const handleAccentChange = async (accent: EnglishAccent) => {
    setSelectedAccent(accent);
    await savePreferredAccent(accent);
  };

  const handleSpeechSpeedChange = async (enabled: boolean) => {
    setIsSlowSpeech(enabled);
    await savePreferredSpeechRate(enabled ? 0.75 : 0.95);
  };

  const handleSoundChange = async (enabled: boolean) => {
    onStatsUpdate(await updateSoundSetting(enabled));
  };

  const handleDailyGoalChange = async (goal: number) => {
    onStatsUpdate(await updateDailyGoal(goal));
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
          onPress: async () => onStatsUpdate(await resetAllUserProgress()),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar style="light" backgroundColor={THEME.colors.background} translucent animated />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back to profile"
        >
          <Ionicons name="chevron-back" size={21} color={THEME.colors.textWhite} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>ELVATE</Text>
          <Text style={styles.title}>Settings</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>VOICE & PLAYBACK</Text>
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingLead}>
              <Ionicons name="globe-outline" size={19} color={THEME.colors.primaryGlow} />
              <Text style={styles.settingTitle}>Voice Accent</Text>
            </View>
            <View style={styles.inlineSegmented}>
              {ACCENT_OPTIONS.map((accent) => {
                const active = selectedAccent === accent.id;
                return (
                  <TouchableOpacity
                    key={accent.id}
                    style={[styles.accentChip, active && styles.accentChipActive]}
                    onPress={() => handleAccentChange(accent.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.accentChipText, active && styles.accentChipTextActive]}>
                      {accent.shortLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingLead}>
              <Ionicons name="speedometer-outline" size={19} color={THEME.colors.primaryGlow} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Slow Speech</Text>
                <Text style={styles.settingSubtitle}>0.75x clearer pronunciation</Text>
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
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingLead}>
              <Ionicons name="volume-medium-outline" size={19} color={THEME.colors.primaryGlow} />
              <Text style={styles.settingTitle}>Sound Effects</Text>
            </View>
            <Switch
              value={stats.soundEnabled}
              onValueChange={handleSoundChange}
              trackColor={{ false: '#26233B', true: THEME.colors.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#26233B"
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>DAILY PRACTICE</Text>
        <View style={styles.section}>
          <View style={styles.goalHeader}>
            <View style={styles.settingLead}>
              <Ionicons name="flame-outline" size={19} color={THEME.colors.primaryGlow} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Daily XP Goal</Text>
                <Text style={styles.settingSubtitle}>Practice goal for your daily streak</Text>
              </View>
            </View>
            <Text style={styles.goalCurrent}>{stats.dailyGoalXp} XP</Text>
          </View>
          <View style={styles.goalOptions}>
            {DAILY_GOALS.map((goal) => {
              const active = stats.dailyGoalXp === goal;
              return (
                <TouchableOpacity
                  key={goal}
                  onPress={() => handleDailyGoalChange(goal)}
                  style={[styles.goalChip, active && styles.goalChipActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.goalChipText, active && styles.goalChipTextActive]}>
                    {goal} XP
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionLabel}>PROGRESS</Text>
        <View style={styles.section}>
          <TouchableOpacity style={styles.linkRow} onPress={handleResetProgress} activeOpacity={0.78}>
            <View style={styles.settingLead}>
              <Ionicons name="refresh-outline" size={19} color={THEME.colors.textSecondary} />
              <Text style={styles.settingTitle}>Reset Progress</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        </View>
        <Text style={styles.version}>Elvate · Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  header: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
  headerCopy: { flex: 1, marginLeft: 12 },
  eyebrow: {
    fontFamily: THEME.fonts.bold,
    color: THEME.colors.primaryGlow,
    fontSize: 9,
    letterSpacing: 1.3,
  },
  title: { marginTop: 2, fontFamily: THEME.fonts.extraBold, color: '#FFFFFF', fontSize: 19 },
  headerSpacer: { width: 38 },
  content: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 32 },
  sectionLabel: {
    marginTop: 20,
    marginBottom: 9,
    fontFamily: THEME.fonts.bold,
    color: THEME.colors.textMuted,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  section: {
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: 'rgba(31,29,48,0.62)',
  },
  settingRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  settingLead: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingText: { flex: 1 },
  settingTitle: { fontFamily: THEME.fonts.semiBold, color: THEME.colors.textWhite, fontSize: 13 },
  settingSubtitle: { marginTop: 3, fontFamily: THEME.fonts.body, color: THEME.colors.textMuted, fontSize: 10.5 },
  inlineSegmented: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  accentChip: { minWidth: 34, alignItems: 'center', paddingHorizontal: 7, paddingVertical: 7, borderRadius: 9 },
  accentChipActive: { backgroundColor: THEME.colors.primary },
  accentChipText: { fontFamily: THEME.fonts.bold, color: THEME.colors.textMuted, fontSize: 10 },
  accentChipTextActive: { color: '#FFFFFF' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.065)' },
  goalHeader: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  goalCurrent: { fontFamily: THEME.fonts.bold, color: THEME.colors.primaryGlow, fontSize: 12 },
  goalOptions: { flexDirection: 'row', gap: 8, paddingBottom: 13 },
  goalChip: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: THEME.colors.border, backgroundColor: THEME.colors.surfaceDark },
  goalChipActive: { borderColor: THEME.colors.primaryGlow, backgroundColor: THEME.colors.primaryLight },
  goalChipText: { fontFamily: THEME.fonts.semiBold, color: THEME.colors.textSecondary, fontSize: 11 },
  goalChipTextActive: { color: '#EDE5FF' },
  linkRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  version: { marginTop: 22, textAlign: 'center', fontFamily: THEME.fonts.body, color: THEME.colors.textMuted, fontSize: 10 },
});
