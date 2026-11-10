import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { SUPERNOVA_LEVELS } from '../constants/curriculum';
import { SUPERNOVA_IMAGES } from '../constants/supernovaAssets';
import { UserStats } from '../types';
import {
  loadPreferredAccent,
  savePreferredAccent,
  savePreferredSpeechRate,
  updateSoundSetting,
  resetAllUserProgress,
} from '../services/storageService';
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

const ACCENT_OPTIONS: Array<{ id: EnglishAccent; shortLabel: string }> = [
  { id: 'en-US', shortLabel: 'US' },
  { id: 'en-GB', shortLabel: 'UK' },
  { id: 'en-AU', shortLabel: 'AU' },
];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ stats, onStatsUpdate }) => {
  const [selectedAccent, setSelectedAccent] = useState<EnglishAccent>('en-US');
  const [isSlowSpeech, setIsSlowSpeech] = useState(false);

  useEffect(() => {
    loadPreferredAccent().then(setSelectedAccent);
    setIsSlowSpeech(getSpeechRate() < 0.9);
  }, []);

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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Essential Account Header */}
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
            <Text style={styles.userName}>Learner</Text>
            <Text style={styles.rankLabel}>{stats.cosmicRank}</Text>
          </View>
        </View>

        <LiveStreakBadge streakDays={stats.streakDays} />
      </View>

      {/* Essential 3-Metric Summary */}
      <View style={styles.kpiStrip}>
        <View style={styles.kpiCell}>
          <Text style={styles.kpiValue}>
            {stats.completedClasses.length}/{TOTAL_CURRICULUM_CLASSES}
          </Text>
          <Text style={styles.kpiLabel}>Classes</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCell}>
          <Text style={styles.kpiValue}>{stats.wordsMastered}</Text>
          <Text style={styles.kpiLabel}>Saved Words</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCell}>
          <Text style={styles.kpiValue}>{stats.stardustXp}</Text>
          <Text style={styles.kpiLabel}>Total XP</Text>
        </View>
      </View>

      {/* Single Clean Preferences Group */}
      <Text style={styles.groupEyebrow}>PREFERENCES</Text>
      <View style={styles.settingsGroup}>
        <View style={styles.settingRow}>
          <View style={styles.settingLead}>
            <Ionicons name="globe-outline" size={18} color={THEME.colors.primaryGlow} />
            <Text style={styles.settingTitle}>Voice Accent</Text>
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

        <View style={styles.settingRow}>
          <View style={styles.settingLead}>
            <Ionicons name="speedometer-outline" size={18} color={THEME.colors.primaryGlow} />
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Slow Speech</Text>
              <Text style={styles.settingSub}>0.75x clearer pronunciation</Text>
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

        <View style={styles.settingRow}>
          <View style={styles.settingLead}>
            <Ionicons name="volume-medium-outline" size={18} color={THEME.colors.primaryGlow} />
            <Text style={styles.settingTitle}>Sound Effects</Text>
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

      {/* Quiet Footer Action */}
      <View style={styles.footerRow}>
        <Text style={styles.versionText}>NovaBreaker · v1.0.0</Text>
        <TouchableOpacity onPress={handleResetProgress} activeOpacity={0.75}>
          <Text style={styles.resetText}>Reset Progress</Text>
        </TouchableOpacity>
      </View>
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
    paddingTop: 22,
    paddingBottom: 28,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },

  /* HEADER */
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  avatarRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
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
  rankLabel: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12.5,
    color: '#A78BFA',
    marginTop: 1,
  },

  /* 3-METRIC SUMMARY */
  kpiStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151422',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    paddingVertical: 15,
    marginBottom: 24,
  },
  kpiCell: {
    flex: 1,
    alignItems: 'center',
  },
  kpiValue: {
    fontFamily: THEME.fonts.bold,
    fontSize: 17,
    color: '#FFFFFF',
  },
  kpiLabel: {
    fontFamily: THEME.fonts.body,
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  kpiDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },

  /* PREFERENCES GROUP */
  groupEyebrow: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10.5,
    color: THEME.colors.textMuted,
    letterSpacing: 0.9,
    marginBottom: 9,
    paddingHorizontal: 2,
  },
  settingsGroup: {
    backgroundColor: '#151422',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: 15,
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
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
    fontSize: 14,
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
    paddingHorizontal: 11,
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

  /* FOOTER */
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  versionText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 11.5,
    color: THEME.colors.textMuted,
  },
  resetText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
});
