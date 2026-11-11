import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import {
  NotoSansTamil_400Regular,
  NotoSansTamil_500Medium,
  NotoSansTamil_600SemiBold,
  NotoSansTamil_700Bold,
} from '@expo-google-fonts/noto-sans-tamil';

import { THEME } from './src/constants/theme';
import { CurriculumScreen } from './src/screens/CurriculumScreen';
import { LessonPlayerScreen } from './src/screens/LessonPlayerScreen';
import { SpeakHubScreen } from './src/screens/SpeakHubScreen';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { AnimatedSplashScreen } from './src/components/AnimatedSplashScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { SupernovaClass } from './src/constants/curriculum';
import { AuthUser, UserStats } from './src/types';
import {
  createDefaultStats,
  hydrateAppPreferences,
  hydrateUserCloudSession,
  loadUserStats,
  completeLessonSession,
  updateHearts,
  refillHeartsWithGems,
  loadAuthUser,
  signOutAuthUser,
} from './src/services/storageService';
import {
  completeAuthSessionFromUrl,
  extractOAuthUrlError,
  getVerifiedAuthUser,
  subscribeToSupabaseAuth,
} from './src/services/authService';
import { getUserLeaderboardRank } from './src/services/leaderboardService';

type TabType = 'learn' | 'call' | 'league' | 'profile';

interface NavTabItem {
  id: Exclude<TabType, 'league'>;
  label: string;
  family: 'mci' | 'ion';
  activeIcon: string;
  inactiveIcon: string;
  isCenter?: boolean;
}

const NAV_TABS: NavTabItem[] = [
  { id: 'learn', label: 'Course', family: 'mci', activeIcon: 'compass', inactiveIcon: 'compass-outline' },
  { id: 'call', label: 'Speak', family: 'ion', activeIcon: 'mic', inactiveIcon: 'mic-outline', isCenter: true },
  { id: 'profile', label: 'Profile', family: 'ion', activeIcon: 'person', inactiveIcon: 'person-outline' },
];

function AppContent() {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    NotoSansTamil_400Regular,
    NotoSansTamil_500Medium,
    NotoSansTamil_600SemiBold,
    NotoSansTamil_700Bold,
  });

  const [stats, setStats] = useState<UserStats>(createDefaultStats);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('learn');
  const [currentLesson, setCurrentLesson] = useState<SupernovaClass | null>(null);
  const [authTopColor, setAuthTopColor] = useState('#1D1436');
  const [courseTopColor, setCourseTopColor] = useState('#1E1438');
  const [speakTopColor, setSpeakTopColor] = useState('#1E143A');
  const [lessonTopColor, setLessonTopColor] = useState('#1B1535');
  const [authInitialError, setAuthInitialError] = useState<string | null>(null);
  const activeAuthKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const bootstrapSession = async () => {
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const urlErr = extractOAuthUrlError(window.location.href);
          if (urlErr && mounted) {
            setAuthInitialError(urlErr);
            window.history.replaceState(null, '', window.location.pathname || '/');
          }
        }

        const [loadedStats, loadedAuth] = await Promise.all([
          hydrateAppPreferences(),
          loadAuthUser(),
        ]);
        if (!mounted) return;
        setStats(loadedStats);

        let verifiedUser = await getVerifiedAuthUser(loadedAuth);
        if (!mounted) return;

        if (
          !verifiedUser &&
          Platform.OS === 'web' &&
          typeof window !== 'undefined' &&
          (window.location.href.includes('access_token=') || window.location.href.includes('code='))
        ) {
          const fallbackRes = await completeAuthSessionFromUrl(window.location.href);
          if (!mounted) return;
          if (fallbackRes.error) {
            setAuthInitialError(fallbackRes.error);
          } else if (fallbackRes.user) {
            verifiedUser = fallbackRes.user;
          }
          window.history.replaceState(null, '', window.location.pathname || '/');
        }

        if (verifiedUser) {
          activeAuthKeyRef.current =
            verifiedUser.id ||
            (verifiedUser.provider === 'guest'
              ? `local-guest:${verifiedUser.name}`
              : verifiedUser.name);
          const cloudStats = await hydrateUserCloudSession(verifiedUser);
          if (!mounted) return;
          setAuthInitialError(null);
          setStats(cloudStats);
          setAuthUser(verifiedUser);
        } else {
          if (loadedAuth) {
            await signOutAuthUser();
          }
          activeAuthKeyRef.current = null;
          setAuthUser(null);
        }
      } catch (err) {
        console.warn('Bootstrap session error:', err);
      } finally {
        if (mounted) {
          setHydrated(true);
        }
      }
    };

    bootstrapSession();

    let linkingSubscription: { remove: () => void } | null = null;
    if (Platform.OS !== 'web') {
      const handleIncomingAuthUrl = async (incomingUrl: string | null) => {
        if (!incomingUrl) return;
        if (
          incomingUrl.includes('access_token=') ||
          incomingUrl.includes('code=') ||
          incomingUrl.includes('error=')
        ) {
          const res = await completeAuthSessionFromUrl(incomingUrl);
          if (res.error && mounted) {
            Alert.alert('Sign-In Failed', res.error);
          }
        }
      };

      Linking.getInitialURL().then(handleIncomingAuthUrl).catch(() => {});
      linkingSubscription = Linking.addEventListener('url', (ev) => {
        void handleIncomingAuthUrl(ev.url);
      });
    }

    const unsubscribe = subscribeToSupabaseAuth(async (event, nextUser) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT' || !nextUser) {
        if (activeAuthKeyRef.current && !activeAuthKeyRef.current.startsWith('local-guest:')) {
          activeAuthKeyRef.current = null;
          setCurrentLesson(null);
          setActiveTab('learn');
          setStats(createDefaultStats());
          setAuthUser(null);
        }
        return;
      }

      const nextKey = nextUser.id || nextUser.name;
      if (activeAuthKeyRef.current !== nextKey) {
        activeAuthKeyRef.current = nextKey;
        const cloudStats = await hydrateUserCloudSession(nextUser);
        if (!mounted) return;
        setStats(cloudStats);
        setAuthUser(nextUser);
        setActiveTab('learn');
      } else if (event === 'USER_UPDATED') {
        setAuthUser(nextUser);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
      linkingSubscription?.remove();
    };
  }, []);

  const isAppReady = fontsLoaded && hydrated;

  const activeScreenTopColor = !authUser
    ? authTopColor
    : currentLesson
      ? lessonTopColor
      : activeTab === 'learn'
        ? courseTopColor
        : activeTab === 'call'
          ? speakTopColor
          : activeTab === 'league'
            ? '#251842'
            : activeTab === 'profile'
              ? '#201639'
              : THEME.colors.background;

  const topSurfaceColor =
    !isAppReady || (splashVisible && !splashExiting)
      ? THEME.colors.background
      : activeScreenTopColor;

  const handleAuthenticated = async (user: AuthUser) => {
    activeAuthKeyRef.current =
      user.id || (user.provider === 'guest' ? `local-guest:${user.name}` : user.name);
    const latestStats = await loadUserStats();
    setStats(latestStats);
    setAuthUser(user);
    setActiveTab('learn');
  };

  const handleSignOut = async () => {
    activeAuthKeyRef.current = null;
    await signOutAuthUser();
    setCurrentLesson(null);
    setActiveTab('learn');
    setStats(createDefaultStats());
    setAuthUser(null);
  };

  const userRank = getUserLeaderboardRank(stats);

  const handleStartLesson = (lesson: SupernovaClass) => {
    setCurrentLesson(lesson);
  };

  const handleLessonComplete = async (
    classId: string,
    xpReward: number,
    earnedGems: number
  ) => {
    const result = await completeLessonSession(classId, xpReward, earnedGems);
    setStats(result.stats);
    return result;
  };

  const handleHeartsChange = async (newHearts: number) => {
    const delta = newHearts - stats.hearts;
    if (delta !== 0) {
      const updated = await updateHearts(delta);
      setStats(updated);
    }
  };

  const handleRefillHearts = () => {
    if (stats.hearts >= stats.maxHearts) {
      Alert.alert('Full Hearts', 'You already have all 5 hearts ready for lessons.');
      return;
    }
    Alert.alert(
      'Refill Hearts?',
      `Restore all 5 hearts using 25 Gems? (Current Gems: ${stats.gems})`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refill (25 Gems)',
          onPress: async () => {
            const res = await refillHeartsWithGems(25);
            setStats(res.stats);
            if (!res.success) {
              Alert.alert('Not Enough Gems', 'Complete lessons to earn more Gems first!');
            }
          },
        },
      ]
    );
  };

  return (
    <View
      style={[
        styles.container,
        { paddingLeft: insets.left, paddingRight: insets.right },
      ]}
    >
      <StatusBar style="light" backgroundColor={topSurfaceColor} translucent animated />

      {/* Dynamic Top Status Bar Safe Area Strip */}
      <View style={{ height: insets.top, backgroundColor: topSurfaceColor }} />

      {/* Duolingo-Style Auth / Onboarding Gate */}
      {!isAppReady ? (
        <View style={styles.screenContainer} />
      ) : !authUser ? (
        <View style={[styles.screenContainer, { paddingBottom: insets.bottom }]}>
          <AuthScreen
            onAuthenticated={handleAuthenticated}
            onTopColorChange={setAuthTopColor}
            initialError={authInitialError}
          />
        </View>
      ) : currentLesson ? (
        <View style={[styles.screenContainer, { paddingBottom: insets.bottom }]}>
          <LessonPlayerScreen
            lesson={currentLesson}
            initialHearts={stats.hearts}
            onHeartsChange={handleHeartsChange}
            onClose={() => setCurrentLesson(null)}
            onTopColorChange={setLessonTopColor}
            onComplete={handleLessonComplete}
          />
        </View>
      ) : (
        <>
          {/* Screen Container */}
          <View style={styles.screenContainer}>
            {activeTab === 'learn' && (
              <CurriculumScreen
                onStartLesson={handleStartLesson}
                stats={stats}
                userRank={userRank}
                onRefillHearts={handleRefillHearts}
                onOpenLeague={() => setActiveTab('league')}
                onTopColorChange={setCourseTopColor}
              />
            )}
            {activeTab === 'call' && (
              <SpeakHubScreen
                stats={stats}
                onStatsUpdate={setStats}
                onTopColorChange={setSpeakTopColor}
              />
            )}
            {activeTab === 'league' && (
              <LeaderboardScreen
                stats={stats}
                authUser={authUser}
                onBack={() => setActiveTab('learn')}
              />
            )}
            {activeTab === 'profile' && (
              <ProfileScreen
                stats={stats}
                authUser={authUser}
                onStatsUpdate={setStats}
                onSignOut={handleSignOut}
              />
            )}
          </View>

          {/* Unified Bottom Navigation Bar (Extends smoothly under gesture inset) */}
          <View style={[styles.bottomNavWrapper, { paddingBottom: insets.bottom }]}>
              <View style={styles.bottomNav}>
                {NAV_TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const iconColor = isActive ? THEME.colors.primaryGlow : THEME.colors.textMuted;
                  const iconName = (isActive ? tab.activeIcon : tab.inactiveIcon) as any;

                  if (tab.isCenter) {
                    return (
                      <TouchableOpacity
                        key={tab.id}
                        style={styles.centerCallWrapper}
                        onPress={() => setActiveTab(tab.id)}
                        activeOpacity={0.85}
                      >
                        <LinearGradient
                          colors={THEME.gradients.primary}
                          style={styles.callTabGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Ionicons name="mic" size={20} color="#FFFFFF" />
                        </LinearGradient>
                        <Text style={[styles.navText, isActive && styles.navTextActive]}>
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  }

                  return (
                    <TouchableOpacity
                      key={tab.id}
                      style={styles.navItem}
                      onPress={() => setActiveTab(tab.id)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.navIconWrap}>
                        {tab.family === 'mci' ? (
                          <MaterialCommunityIcons name={iconName} size={20} color={iconColor} />
                        ) : (
                          <Ionicons name={iconName} size={20} color={iconColor} />
                        )}
                      </View>
                      <Text style={[styles.navText, isActive && styles.navTextActive]}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}

      {/* Custom Animated Launch Splash Screen */}
      {splashVisible && (
        <AnimatedSplashScreen
          isReady={isAppReady}
          fontsLoaded={fontsLoaded}
          onExiting={() => setSplashExiting(true)}
          onFinish={() => setSplashVisible(false)}
        />
      )}
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  screenContainer: {
    flex: 1,
  },
  bottomNavWrapper: {
    backgroundColor: THEME.colors.surfaceDark,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surfaceDark,
    paddingVertical: 6,
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 4,
  },
  navIconWrap: {
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerCallWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 4,
  },
  callTabGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginTop: -16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#A78BFA',
    shadowColor: '#7F43FE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
    borderBottomWidth: 3,
    borderBottomColor: '#5B21B6',
  },
  navText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  navTextActive: {
    fontFamily: THEME.fonts.bold,
    color: THEME.colors.primaryGlow,
  },
});
