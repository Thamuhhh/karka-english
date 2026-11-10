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
import { LinearGradient } from 'expo-linear-gradient';
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

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const ACCENT_OPTIONS: Array<{ id: EnglishAccent; shortLabel: string }> = [
  { id: 'en-US', shortLabel: 'US' },
  { id: 'en-GB', shortLabel: 'UK' },
  { id: 'en-AU', shortLabel: 'AU' },
];

function getLearnerTierLabel(completedCount: number): string {
  if (completedCount >= 17) return 'B2–C1 Fluent';
  if (completedCount >= 11) return 'B1 Career';
  if (completedCount >= 6) return 'A2 Builder';
  return 'A1 Foundation';
}

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

  const completedCount = stats.completedClasses.length;
  const fluencyPct =
    TOTAL_CURRICULUM_CLASSES > 0
      ? Math.round((completedCount / TOTAL_CURRICULUM_CLASSES) * 100)
      : 0;
  const todayMonIdx = (new Date().getDay() + 6) % 7;
  const tierLabel = getLearnerTierLabel(completedCount);

  return (
    <View style={styles.container}>
      {/* Subtle Top Ambient Glow */}
      <LinearGradient
        colors={['#201639', 'rgba(14, 14, 20, 0)']}
        style={styles.topAmbientWash}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Open Account Identity Row (Zero Boxes) */}
        <View style={styles.identityHeader}>
          <View style={styles.identityLeft}>
            <View style={styles.avatarRing}>
              <Image
                source={SUPERNOVA_IMAGES.novaAvatar}
                style={styles.avatarImg}
                resizeMode="cover"
              />
            </View>
            <View style={styles.identityText}>
              <Text style={styles.userName}>NovaBreaker</Text>
              <Text style={styles.tierMeta}>
                {tierLabel} · {stats.cosmicRank}
              </Text>
            </View>
          </View>
          <LiveStreakBadge streakDays={stats.streakDays} />
        </View>

        {/* Open Course Fluency Line */}
        <View style={styles.fluencySection}>
          <View style={styles.fluencyTop}>
            <Text style={styles.eyebrow}>COURSE FLUENCY</Text>
            <Text style={styles.fluencyStat}>
              {completedCount}/{TOTAL_CURRICULUM_CLASSES} · {fluencyPct}%
            </Text>
          </View>
          <View style={styles.fluencyTrack}>
            {fluencyPct > 0 && (
              <LinearGradient
                colors={['#7F43FE', '#C4B5FD']}
                style={[styles.fluencyFill, { width: `${fluencyPct}%` }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            )}
          </View>
        </View>

        <View style={styles.sectionDivider} />

        {/* Open Typographic Stats Row (Zero Tiles / Zero Boxes) */}
        <View style={styles.openStatsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statNum}>{stats.stardustXp}</Text>
            <Text style={styles.statCap}>Total XP</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statNum}>{stats.wordsMastered}</Text>
            <Text style={styles.statCap}>Words</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statNum}>{stats.conversationsDone}</Text>
            <Text style={styles.statCap}>Talks</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statNum}>{stats.sentencesChecked}</Text>
            <Text style={styles.statCap}>Polished</Text>
          </View>
        </View>

        <View style={styles.sectionDivider} />

        {/* Open Weekly Streak Row */}
        <View style={styles.openSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.eyebrow}>THIS WEEK</Text>
            <Text style={styles.streakSubText}>
              {stats.streakDays} {stats.streakDays === 1 ? 'day' : 'days'} active
            </Text>
          </View>

          <View style={styles.weekRow}>
            {WEEK_DAYS.map((dayLetter, idx) => {
              const isToday = idx === todayMonIdx;
              const daysAgo = todayMonIdx - idx;
              const isActiveDay = daysAgo >= 0 && daysAgo < stats.streakDays;

              return (
                <View key={idx} style={styles.dayItem}>
                  <View
                    style={[
                      styles.dayDotWrap,
                      isActiveDay && styles.dayDotWrapActive,
                      isToday && styles.dayDotWrapToday,
                    ]}
                  >
                    {isActiveDay ? (
                      <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                    ) : (
                      <View style={styles.dayDotIdle} />
                    )}
                  </View>
                  <Text style={[styles.dayText, isToday && styles.dayTextToday]}>
                    {dayLetter}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionDivider} />

        {/* Open Borderless Settings List */}
        <View style={styles.openSection}>
          <Text style={[styles.eyebrow, { marginBottom: 6 }]}>PREFERENCES</Text>

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

        <View style={styles.sectionDivider} />

        {/* Quiet Footer */}
        <View style={styles.footerRow}>
          <Text style={styles.versionText}>NovaBreaker · v1.0.0</Text>
          <TouchableOpacity onPress={handleResetProgress} activeOpacity={0.75}>
            <Text style={styles.resetText}>Reset Progress</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    position: 'relative',
  },
  topAmbientWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },

  /* OPEN HEADER */
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  identityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(167, 139, 250, 0.55)',
    backgroundColor: '#161423',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.04 }],
  },
  identityText: {
    flex: 1,
    marginLeft: 13,
  },
  userName: {
    fontFamily: THEME.fonts.bold,
    fontSize: 19,
    color: '#FFFFFF',
  },
  tierMeta: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12,
    color: '#C4B5FD',
    marginTop: 2,
  },

  /* COURSE FLUENCY */
  fluencySection: {
    marginBottom: 4,
  },
  fluencyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 7,
  },
  eyebrow: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textMuted,
    letterSpacing: 1,
  },
  fluencyStat: {
    fontFamily: THEME.fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  fluencyTrack: {
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#221F33',
    overflow: 'hidden',
  },
  fluencyFill: {
    height: '100%',
    borderRadius: 2,
  },

  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 18,
  },

  /* OPEN STATS ROW */
  openStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontFamily: THEME.fonts.bold,
    fontSize: 19,
    color: '#FFFFFF',
  },
  statCap: {
    fontFamily: THEME.fonts.body,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },

  /* OPEN SECTIONS */
  openSection: {
    width: '100%',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },
  streakSubText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11.5,
    color: '#C4B5FD',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayItem: {
    alignItems: 'center',
    gap: 6,
  },
  dayDotWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayDotWrapActive: {
    backgroundColor: THEME.colors.primary,
  },
  dayDotWrapToday: {
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  dayDotIdle: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4E496B',
  },
  dayText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  dayTextToday: {
    fontFamily: THEME.fonts.bold,
    color: '#FFFFFF',
  },

  /* PREFERENCES ROWS */
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  inlineSegmented: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
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

  /* FOOTER */
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
