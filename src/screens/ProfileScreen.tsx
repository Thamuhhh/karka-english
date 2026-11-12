import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../constants/theme';
import { SUPERNOVA_LEVELS, SupernovaLevel } from '../constants/curriculum';
import { EditProfileModal } from '../components/EditProfileModal';
import { getAvatarPackItem, AvatarPackId } from '../constants/avatarPack';
import { AuthUser, UserStats } from '../types';
import { updateAuthUserProfile } from '../services/storageService';
import { ElvateWordmark } from '../components/ElvateBrand';
import { SettingsScreen } from './SettingsScreen';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface ProfileScreenProps {
  stats: UserStats;
  authUser?: AuthUser | null;
  onStatsUpdate: (stats: UserStats) => void;
  onSignOut?: () => void;
  onRefillHearts?: () => Promise<boolean>;
  onAuthUserUpdate?: (user: AuthUser) => void;
  onTopColorChange?: (color: string) => void;
  extraLevels?: SupernovaLevel[];
}

const MAX_CONTENT_WIDTH = 480;

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
        body: 'You can clear all stored learning history, vocabulary bookmarks, and streak data anytime via Reset Progress in Settings.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    updated: 'Effective November 2026',
    sections: [
      {
        heading: 'Educational Use',
        body: 'Elvate English is provided as a personal Tamil-to-English fluency and speaking practice companion.',
      },
      {
        heading: 'AI & Offline Feedback',
        body: 'Grammar tips, translations, and conversational replies are designed for self-study assistance and should be reviewed alongside your real-world context.',
      },
      {
        heading: 'Content & Fair Use',
        body: 'Course lessons, prompts, and visual assets within Elvate are intended for your personal, non-commercial learning experience.',
      },
    ],
  },
  licenses: {
    title: 'Data & Open Source',
    updated: 'Elvate v1.0.0',
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

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  stats,
  authUser,
  onStatsUpdate,
  onSignOut,
  onRefillHearts,
  onAuthUserUpdate,
  onTopColorChange,
  extraLevels = [],
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocKey | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [showHeartDialog, setShowHeartDialog] = useState(false);
  const [isRefillingHearts, setIsRefillingHearts] = useState(false);

  const playerAvatar = getAvatarPackItem(authUser?.avatarId);

  useEffect(() => {
    if (onTopColorChange) {
      onTopColorChange('#201639');
    }
  }, [onTopColorChange]);

  const handleSaveProfile = async (updates: { name: string; avatarId: AvatarPackId }) => {
    const updated = await updateAuthUserProfile(updates);
    if (updated && onAuthUserUpdate) {
      onAuthUserUpdate(updated);
    }
  };

  const handleSignOut = () => {
    if (!onSignOut) return;
    setShowSignOutDialog(true);
  };

  const handleHeartRefill = async () => {
    if (isRefillingHearts || !onRefillHearts) return;
    if (stats.hearts >= stats.maxHearts || stats.gems < 25) {
      setShowHeartDialog(false);
      return;
    }
    setIsRefillingHearts(true);
    try {
      if (await onRefillHearts()) setShowHeartDialog(false);
    } finally {
      setIsRefillingHearts(false);
    }
  };

  const curriculumClassIds = [...SUPERNOVA_LEVELS, ...extraLevels]
    .flatMap((level) => level.classes.map((lesson) => lesson.id));
  const completedClassIds = new Set(stats.completedClasses);
  const totalCurriculumClasses = curriculumClassIds.length;
  const completedCount = curriculumClassIds.filter((id) => completedClassIds.has(id)).length;
  const fluencyPct =
    totalCurriculumClasses > 0
      ? Math.round((completedCount / totalCurriculumClasses) * 100)
      : 0;
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
        {/* Open Account Identity Row */}
        <View style={styles.identityHeader}>
          <View style={styles.identityLeft}>
            <TouchableOpacity
              onPress={() => setShowEditProfile(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              style={styles.avatarTouchable}
            >
              <View
                style={[
                  styles.avatarRing,
                  { borderColor: THEME.colors.primaryGlow },
                ]}
              >
                <Image
                  source={playerAvatar.source}
                  style={styles.avatarImg}
                  resizeMode="contain"
                />
              </View>
              <View
                style={[
                  styles.editBadge,
                  { backgroundColor: THEME.colors.primary },
                ]}
              >
                <Ionicons name="camera-outline" size={10} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <View style={styles.identityText}>
              <TouchableOpacity
                onPress={() => setShowEditProfile(true)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Edit profile"
              >
                <Text style={styles.userName}>{authUser?.name || 'Elvate Learner'}</Text>
              </TouchableOpacity>
              <Text style={styles.tierMeta}>
                {stats.cosmicRank}
              </Text>
              {!!authUser?.email && (
                <Text style={styles.emailSubText} numberOfLines={1}>
                  {authUser.email}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.profileStreakBadge} accessibilityLabel={`${stats.streakDays} day streak`}>
            <MaterialCommunityIcons name="fire" size={23} color={THEME.colors.gold} />
            <Text style={styles.profileStreakCount}>{stats.streakDays}</Text>
          </View>
        </View>

        {/* Open Course Fluency Line */}
        <View style={styles.fluencySection}>
          <View style={styles.fluencyTop}>
            <Text style={styles.eyebrow}>COURSE FLUENCY</Text>
            <Text style={styles.fluencyStat}>
              {completedCount}/{totalCurriculumClasses} · {fluencyPct}%
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

        {onRefillHearts && (
          <TouchableOpacity
            style={styles.heartHealthRow}
            onPress={() => setShowHeartDialog(true)}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel={`${stats.hearts} of ${stats.maxHearts} hearts. Tap to manage heart health.`}
          >
            <View style={styles.heartHealthLead}>
              <Ionicons name="heart" size={17} color={THEME.colors.primaryGlow} />
              <View>
                <Text style={styles.heartHealthTitle}>Heart Health</Text>
                <Text style={styles.heartHealthSubtitle}>
                  {stats.hearts >= stats.maxHearts ? 'All hearts ready' : 'Tap to refill for 25 Gems'}
                </Text>
              </View>
            </View>
            <View style={styles.heartHealthCountPill}>
              {Array.from({ length: stats.maxHearts }, (_, index) => (
                <Ionicons
                  key={index}
                  name={index < stats.hearts ? 'heart' : 'heart-outline'}
                  size={13}
                  color={index < stats.hearts ? THEME.colors.primaryGlow : THEME.colors.textMuted}
                />
              ))}
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.sectionDivider} />
        <TouchableOpacity
          style={styles.profileUtilityRow}
          onPress={() => setShowSettings(true)}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="Open Settings"
        >
          <View style={styles.utilityLead}>
            <Ionicons name="settings-outline" size={19} color={THEME.colors.primaryGlow} />
            <Text style={styles.utilityTitle}>Settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={THEME.colors.textMuted} />
        </TouchableOpacity>
        {onSignOut && (
          <>
          <View style={styles.rowDivider} />
          <TouchableOpacity
            style={styles.profileUtilityRow}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <View style={styles.utilityLead}>
              <Ionicons name="log-out-outline" size={18} color={THEME.colors.primaryGlow} />
              <Text style={styles.utilityTitle}>Sign Out</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={THEME.colors.textMuted} />
          </TouchableOpacity>
          </>
        )}
        <View style={styles.profileLegalSection}>
          <Text style={styles.profileLegalLabel}>LEGAL</Text>
          {LEGAL_LINKS.map((item, index) => (
            <React.Fragment key={item.key}>
              {index > 0 && <View style={styles.rowDivider} />}
              <TouchableOpacity
                style={styles.profileUtilityRow}
                onPress={() => setActiveLegalDoc(item.key)}
                activeOpacity={0.8}
              >
                <View style={styles.utilityLead}>
                  <Ionicons name={item.icon} size={18} color={THEME.colors.textSecondary} />
                  <Text style={styles.utilityTitle}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
        <View style={styles.sectionDivider} />
        {/* Production App Footer */}
        <View style={styles.appFooter}>
          <ElvateWordmark width={82} height={24} showIcon iconSize={20} style={styles.footerLogoWrap} />
          <Text style={styles.footerSub}>Tamil-to-English Fluency Studio</Text>
          <Text style={styles.footerVersion}>Version 1.0.0 · © 2026 Elvate</Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <Modal
        visible={showSettings}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowSettings(false)}
      >
        <SettingsScreen
          stats={stats}
          onStatsUpdate={onStatsUpdate}
          onClose={() => setShowSettings(false)}
        />
      </Modal>

      <ConfirmDialog
        visible={showSignOutDialog}
        title="Sign out?"
        message={authUser?.isCloudSession
          ? 'Your learning progress is synced to your cloud account.'
          : 'Your learning progress stays saved on this device.'}
        icon="log-out-outline"
        confirmLabel="Sign Out"
        destructive
        onCancel={() => setShowSignOutDialog(false)}
        onConfirm={() => {
          setShowSignOutDialog(false);
          onSignOut?.();
        }}
      />

      <ConfirmDialog
        visible={showHeartDialog}
        title={stats.hearts >= stats.maxHearts ? 'Hearts are full' : 'Refill your hearts?'}
        message={stats.hearts >= stats.maxHearts
          ? `You have all ${stats.maxHearts} hearts ready for lessons.`
          : stats.gems >= 25
            ? `Restore all ${stats.maxHearts} hearts for 25 Gems. You have ${stats.gems} Gems.`
            : `You have ${stats.hearts} of ${stats.maxHearts} hearts, but need 25 Gems to refill. Earn Gems by completing lessons.`}
        icon="heart"
        confirmLabel={stats.hearts >= stats.maxHearts || stats.gems < 25
          ? 'Got it'
          : isRefillingHearts ? 'Refilling...' : 'Refill - 25 Gems'}
        cancelLabel="Close"
        onCancel={() => setShowHeartDialog(false)}
        onConfirm={handleHeartRefill}
      />

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

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={showEditProfile}
        authUser={authUser}
        onSave={handleSaveProfile}
        onClose={() => setShowEditProfile(false)}
      />
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
    paddingTop: 10,
    paddingBottom: 16,
    marginBottom: 12,
  },
  profileStreakBadge: {
    minWidth: 54,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 9,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  profileStreakCount: {
    fontFamily: THEME.fonts.extraBold,
    fontSize: 15,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  identityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(167, 139, 250, 0.55)',
    backgroundColor: '#161423',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#161423',
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
  profileUtilityRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  utilityLead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  utilityTitle: {
    fontFamily: THEME.fonts.semiBold,
    color: THEME.colors.textWhite,
    fontSize: 13,
  },
  profileLegalSection: { marginTop: 10 },
  profileLegalLabel: {
    marginBottom: 4,
    fontFamily: THEME.fonts.bold,
    color: THEME.colors.textMuted,
    fontSize: 9,
    letterSpacing: 1.1,
  },
  rowDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.055)' },

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
  heartHealthRow: {
    minHeight: 58,
    marginTop: 16,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heartHealthLead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  heartHealthTitle: {
    fontFamily: THEME.fonts.semiBold,
    color: THEME.colors.textWhite,
    fontSize: 12.5,
  },
  heartHealthSubtitle: {
    marginTop: 3,
    fontFamily: THEME.fonts.body,
    color: THEME.colors.textMuted,
    fontSize: 10.5,
  },
  heartHealthCountPill: {
    minWidth: 78,
    height: 30,
    paddingHorizontal: 9,
    borderRadius: 15,
    backgroundColor: 'rgba(127,67,254,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },

  /* APP FOOTER */
  appFooter: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 6,
  },
  footerLogoWrap: {
    marginBottom: 4,
  },
  footerSub: {
    fontFamily: THEME.fonts.body,
    fontSize: 11.5,
    color: THEME.colors.textSecondary,
    marginTop: 2,
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
