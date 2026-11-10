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

function formatShortUnitName(fullName: string): string {
  return fullName.replace(/^Unit\s+\d+:\s*/i, '').trim();
}

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Learner Showcase Card */}
      <View style={styles.heroWrap}>
        <LinearGradient
          colors={['#1E163B', '#141320']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <Image
          source={SUPERNOVA_IMAGES.mapTopographyBg}
          style={styles.heroTexture}
          resizeMode="cover"
        />

        <View style={styles.heroTopRow}>
          <View style={styles.heroIdentity}>
            <View style={styles.avatarRing}>
              <Image
                source={SUPERNOVA_IMAGES.novaAvatar}
                style={styles.avatarImg}
                resizeMode="cover"
              />
            </View>
            <View style={styles.identityCol}>
              <Text style={styles.userName}>NovaBreaker</Text>
              <View style={styles.badgeLine}>
                <Text style={styles.tierText}>{tierLabel}</Text>
                <Text style={styles.badgeSep}>·</Text>
                <Text style={styles.leagueText}>{stats.cosmicRank}</Text>
              </View>
            </View>
          </View>

          <LiveStreakBadge streakDays={stats.streakDays} />
        </View>

        {/* Course Fluency Progress Strip */}
        <View style={styles.heroProgressBlock}>
          <View style={styles.heroProgressMeta}>
            <Text style={styles.heroProgressEyebrow}>
              COURSE FLUENCY · {completedCount}/{TOTAL_CURRICULUM_CLASSES} CLASSES
            </Text>
            <Text style={styles.heroProgressPct}>{fluencyPct}%</Text>
          </View>
          <View style={styles.heroTrack}>
            {fluencyPct > 0 && (
              <LinearGradient
                colors={['#7F43FE', '#C4B5FD']}
                style={[styles.heroFill, { width: `${fluencyPct}%` }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            )}
          </View>
        </View>
      </View>

      {/* Weekly Streak Consistency Strip */}
      <View style={styles.weekCard}>
        <View style={styles.weekHeaderRow}>
          <Text style={styles.cardEyebrow}>THIS WEEK</Text>
          <Text style={styles.weekStreakNote}>
            {stats.streakDays} {stats.streakDays === 1 ? 'day' : 'days'} streak
          </Text>
        </View>

        <View style={styles.weekDaysRow}>
          {WEEK_DAYS.map((dayLetter, idx) => {
            const isToday = idx === todayMonIdx;
            const daysAgo = todayMonIdx - idx;
            const isActiveDay = daysAgo >= 0 && daysAgo < stats.streakDays;

            return (
              <View key={idx} style={styles.dayCol}>
                <View
                  style={[
                    styles.dayCircle,
                    isActiveDay && styles.dayCircleActive,
                    isToday && styles.dayCircleToday,
                  ]}
                >
                  {isActiveDay ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : (
                    <View style={styles.dayDotIdle} />
                  )}
                </View>
                <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                  {dayLetter}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Cohesive 2x2 Learning Activity Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricTile}>
          <View style={styles.metricIconWell}>
            <Ionicons name="flash-outline" size={16} color={THEME.colors.primaryGlow} />
          </View>
          <View style={styles.metricTextCol}>
            <Text style={styles.metricVal}>{stats.stardustXp}</Text>
            <Text style={styles.metricName}>Total XP</Text>
          </View>
        </View>

        <View style={styles.metricTile}>
          <View style={styles.metricIconWell}>
            <Ionicons name="bookmark-outline" size={16} color={THEME.colors.primaryGlow} />
          </View>
          <View style={styles.metricTextCol}>
            <Text style={styles.metricVal}>{stats.wordsMastered}</Text>
            <Text style={styles.metricName}>Saved Words</Text>
          </View>
        </View>

        <View style={styles.metricTile}>
          <View style={styles.metricIconWell}>
            <Ionicons name="mic-outline" size={16} color={THEME.colors.primaryGlow} />
          </View>
          <View style={styles.metricTextCol}>
            <Text style={styles.metricVal}>{stats.conversationsDone}</Text>
            <Text style={styles.metricName}>Voice Talks</Text>
          </View>
        </View>

        <View style={styles.metricTile}>
          <View style={styles.metricIconWell}>
            <Ionicons name="sparkles-outline" size={16} color={THEME.colors.primaryGlow} />
          </View>
          <View style={styles.metricTextCol}>
            <Text style={styles.metricVal}>{stats.sentencesChecked}</Text>
            <Text style={styles.metricName}>Polished</Text>
          </View>
        </View>
      </View>

      {/* 4-Unit Curriculum Mastery Breakdown */}
      <Text style={styles.groupEyebrow}>CURRICULUM MASTERY</Text>
      <View style={styles.sheetCard}>
        {SUPERNOVA_LEVELS.map((lvl, idx) => {
          const doneInUnit = lvl.classes.filter((c) =>
            stats.completedClasses.includes(c.id)
          ).length;
          const unitPct = Math.round((doneInUnit / lvl.classes.length) * 100);
          return (
            <View key={lvl.levelNumber} style={[styles.unitRow, idx > 0 && styles.unitRowBorder]}>
              <View style={styles.unitTopLine}>
                <Text style={styles.unitLabel} numberOfLines={1}>
                  U{lvl.levelNumber} · {formatShortUnitName(lvl.levelName)}
                </Text>
                <Text style={styles.unitCount}>
                  {doneInUnit}/{lvl.classes.length}
                </Text>
              </View>
              <View style={styles.unitTrack}>
                {unitPct > 0 && (
                  <View style={[styles.unitFill, { width: `${unitPct}%` }]} />
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Clean Audio Preferences Group */}
      <Text style={styles.groupEyebrow}>AUDIO &amp; APP</Text>
      <View style={styles.sheetCard}>
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

      <View style={{ height: 24 }} />
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

  /* HERO CARD */
  heroWrap: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.24)',
    padding: 18,
    marginBottom: 14,
    position: 'relative',
  },
  heroTexture: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.09,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  heroIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  avatarRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: 'rgba(167, 139, 250, 0.55)',
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
    fontSize: 18.5,
    color: '#FFFFFF',
  },
  badgeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  tierText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11.5,
    color: '#C4B5FD',
  },
  badgeSep: {
    fontFamily: THEME.fonts.medium,
    fontSize: 11.5,
    color: THEME.colors.textMuted,
  },
  leagueText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 11.5,
    color: THEME.colors.textSecondary,
  },
  heroProgressBlock: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroProgressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 7,
  },
  heroProgressEyebrow: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: '#C9C5DE',
    letterSpacing: 0.8,
  },
  heroProgressPct: {
    fontFamily: THEME.fonts.extraBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  heroTrack: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  heroFill: {
    height: '100%',
    borderRadius: 2.5,
  },

  /* WEEKLY STREAK STRIP */
  weekCard: {
    backgroundColor: '#151422',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    padding: 15,
    marginBottom: 14,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardEyebrow: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textMuted,
    letterSpacing: 0.9,
  },
  weekStreakNote: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11.5,
    color: '#C4B5FD',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1D1B2D',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primaryGlow,
  },
  dayCircleToday: {
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  dayDotIdle: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#4E496B',
  },
  dayLabel: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  dayLabelToday: {
    fontFamily: THEME.fonts.bold,
    color: '#FFFFFF',
  },

  /* 2X2 METRICS GRID */
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 20,
  },
  metricTile: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151422',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: 13,
    paddingVertical: 12,
    gap: 11,
  },
  metricIconWell: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(127, 67, 254, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricTextCol: {
    flex: 1,
  },
  metricVal: {
    fontFamily: THEME.fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  metricName: {
    fontFamily: THEME.fonts.body,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },

  /* CURRICULUM MASTERY & SETTINGS */
  groupEyebrow: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textMuted,
    letterSpacing: 0.9,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sheetCard: {
    backgroundColor: '#151422',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: 15,
    marginBottom: 18,
  },
  unitRow: {
    paddingVertical: 11,
  },
  unitRowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  unitTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  unitLabel: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 12.5,
    color: '#FFFFFF',
    flex: 1,
    paddingRight: 10,
  },
  unitCount: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11.5,
    color: '#C4B5FD',
  },
  unitTrack: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#232036',
    overflow: 'hidden',
  },
  unitFill: {
    height: '100%',
    borderRadius: 1.5,
    backgroundColor: THEME.colors.primaryGlow,
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

  /* FOOTER */
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 2,
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
