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
  Modal,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../constants/theme';
import { SUPERNOVA_LEVELS } from '../constants/curriculum';
import { SUPERNOVA_IMAGES } from '../constants/supernovaAssets';
import { AuthUser, UserStats } from '../types';
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
  authUser?: AuthUser | null;
  onStatsUpdate: (stats: UserStats) => void;
  onSignOut?: () => void;
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

type LegalDocKey = 'privacy' | 'terms' | 'licenses';

const LEGAL_LINKS: Array<{
  key: LegalDocKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'privacy', label: 'Privacy Policy', icon: 'shield-checkmark-outline' },
  { key: 'terms', label: 'Terms of Service', icon: 'document-text-outline' },
  { key: 'licenses', label: 'Data & Open Source', icon: 'information-circle-outline' },
];

const LEGAL_DOCS: Record<
  LegalDocKey,
  {
    title: string;
    updated: string;
    sections: Array<{ heading: string; body: string }>;
  }
> = {
  privacy: {
    title: 'Privacy Policy',
    updated: 'Effective November 2026',
    sections: [
      {
        heading: 'Local Storage First',
        body: 'Your completed classes, XP, saved vocabulary words, daily streak, and voice settings are stored locally on your device using AsyncStorage.',
      },
      {
        heading: 'Voice & Grammar Practice',
        body: 'Sentences typed or spoken for grammar coaching are processed strictly to generate fluency corrections and Tamil explanations for your current session.',
      },
      {
        heading: 'Data Control',
        body: 'You can clear all stored learning history, vocabulary bookmarks, and streak data anytime via Reset Progress in Preferences.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    updated: 'Effective November 2026',
    sections: [
      {
        heading: 'Educational Use',
        body: 'NovaBreaker English is provided as a personal Tamil-to-English fluency and speaking practice companion.',
      },
      {
        heading: 'AI & Offline Feedback',
        body: 'Grammar tips, translations, and conversational replies are designed for self-study assistance and should be reviewed alongside your real-world context.',
      },
      {
        heading: 'Content & Fair Use',
        body: 'Course lessons, prompts, and visual assets within NovaBreaker are intended for your personal, non-commercial learning experience.',
      },
    ],
  },
  licenses: {
    title: 'Data & Open Source',
    updated: 'NovaBreaker v1.0.0',
    sections: [
      {
        heading: 'Core Stack',
        body: 'Built with Expo, React Native, React Native SVG, Expo Speech, and Google Noto Sans Tamil, Poppins, and Montserrat fonts.',
      },
      {
        heading: 'Dictionary Services',
        body: 'Corporate Lexicon lookups query public English dictionary and Datamuse thesaurus endpoints when online, falling back cleanly to curated offline terms.',
      },
    ],
  },
};

function getLearnerTierLabel(completedCount: number): string {
  if (completedCount >= 17) return 'B2–C1 Fluent';
  if (completedCount >= 11) return 'B1 Career';
  if (completedCount >= 6) return 'A2 Builder';
  return 'A1 Foundation';
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  stats,
  authUser,
  onStatsUpdate,
  onSignOut,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [selectedAccent, setSelectedAccent] = useState<EnglishAccent>('en-US');
  const [isSlowSpeech, setIsSlowSpeech] = useState(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocKey | null>(null);

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
              <Text style={styles.userName}>{authUser?.name || 'NovaBreaker'}</Text>
              <Text style={styles.tierMeta}>
                {tierLabel} · {stats.cosmicRank}
              </Text>
              {!!authUser?.email && (
                <Text style={styles.emailSubText} numberOfLines={1}>
                  {authUser.email}
                </Text>
              )}
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

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleResetProgress}
            activeOpacity={0.78}
          >
            <View style={styles.settingLead}>
              <Ionicons name="refresh-outline" size={18} color={THEME.colors.textSecondary} />
              <Text style={styles.settingTitle}>Reset Progress</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          {onSignOut && (
            <>
              <View style={styles.rowDivider} />
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() =>
                  Alert.alert('Sign Out?', 'Your learning progress stays saved on this device.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign Out', onPress: onSignOut },
                  ])
                }
                activeOpacity={0.78}
              >
                <View style={styles.settingLead}>
                  <Ionicons name="log-out-outline" size={18} color={THEME.colors.primaryGlow} />
                  <Text style={styles.settingTitle}>Sign Out</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.sectionDivider} />

        {/* Open Borderless Legal Links */}
        <View style={styles.openSection}>
          <Text style={[styles.eyebrow, { marginBottom: 6 }]}>LEGAL</Text>
          {LEGAL_LINKS.map((item, idx) => (
            <React.Fragment key={item.key}>
              {idx > 0 && <View style={styles.rowDivider} />}
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => setActiveLegalDoc(item.key)}
                activeOpacity={0.78}
              >
                <View style={styles.settingLead}>
                  <Ionicons name={item.icon} size={18} color={THEME.colors.textSecondary} />
                  <Text style={styles.settingTitle}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        <View style={styles.sectionDivider} />

        {/* Production App Footer */}
        <View style={styles.appFooter}>
          <Text style={styles.footerBrand}>NovaBreaker English</Text>
          <Text style={styles.footerSub}>Tamil-to-English Fluency Studio</Text>

          <View style={styles.footerLegalLinks}>
            <TouchableOpacity onPress={() => setActiveLegalDoc('privacy')} activeOpacity={0.75}>
              <Text style={styles.footerLinkText}>Privacy</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>·</Text>
            <TouchableOpacity onPress={() => setActiveLegalDoc('terms')} activeOpacity={0.75}>
              <Text style={styles.footerLinkText}>Terms</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>·</Text>
            <TouchableOpacity onPress={() => setActiveLegalDoc('licenses')} activeOpacity={0.75}>
              <Text style={styles.footerLinkText}>Open Source</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerVersion}>Version 1.0.0 · © 2026 NovaBreaker</Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* In-App Legal Document Reader Modal */}
      <Modal
        visible={!!activeLegalDoc}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setActiveLegalDoc(null)}
      >
        <View style={styles.legalOverlay}>
          <TouchableOpacity
            style={styles.legalBackdrop}
            activeOpacity={1}
            onPress={() => setActiveLegalDoc(null)}
          />

          {activeLegalDoc && (
            <View
              style={[
                styles.legalSheet,
                { width: Math.min(windowWidth - 32, 420), maxHeight: windowHeight * 0.78 },
              ]}
            >
              <View style={styles.legalHeader}>
                <View>
                  <Text style={styles.legalEyebrow}>{LEGAL_DOCS[activeLegalDoc].updated}</Text>
                  <Text style={styles.legalTitle}>{LEGAL_DOCS[activeLegalDoc].title}</Text>
                </View>
                <TouchableOpacity
                  style={styles.legalCloseBtn}
                  onPress={() => setActiveLegalDoc(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={16} color="#C9C5DE" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.legalScroll}
                contentContainerStyle={styles.legalBodyContent}
                showsVerticalScrollIndicator={false}
              >
                {LEGAL_DOCS[activeLegalDoc].sections.map((sec, sIdx) => (
                  <View key={sIdx} style={[styles.legalSection, sIdx > 0 && { marginTop: 16 }]}>
                    <Text style={styles.legalSectionHeading}>{sec.heading}</Text>
                    <Text style={styles.legalSectionBody}>{sec.body}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
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
  emailSubText: {
    fontFamily: THEME.fonts.body,
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
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

  /* APP FOOTER */
  appFooter: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 6,
  },
  footerBrand: {
    fontFamily: THEME.fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  footerSub: {
    fontFamily: THEME.fonts.body,
    fontSize: 11.5,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  footerLegalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  footerLinkText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11.5,
    color: '#A78BFA',
  },
  footerDot: {
    fontFamily: THEME.fonts.medium,
    fontSize: 11.5,
    color: THEME.colors.textMuted,
  },
  footerVersion: {
    fontFamily: THEME.fonts.body,
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 8,
  },

  /* LEGAL DOCUMENT READER MODAL */
  legalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(6, 6, 10, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  legalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  legalSheet: {
    backgroundColor: '#151422',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.28)',
    overflow: 'hidden',
  },
  legalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  legalEyebrow: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: '#A78BFA',
    letterSpacing: 0.8,
  },
  legalTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 2,
  },
  legalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legalScroll: {
    flexGrow: 0,
  },
  legalBodyContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  legalSection: {
    width: '100%',
  },
  legalSectionHeading: {
    fontFamily: THEME.fonts.bold,
    fontSize: 13.5,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  legalSectionBody: {
    fontFamily: THEME.fonts.body,
    fontSize: 12.5,
    color: THEME.colors.textSecondary,
    lineHeight: 19,
  },
});
