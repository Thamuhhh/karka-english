import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { SupernovaClass } from './src/constants/curriculum';
import { UserStats } from './src/types';
import {
  createDefaultStats,
  hydrateAppPreferences,
  completeLessonSession,
  updateHearts,
  refillHeartsWithGems,
} from './src/services/storageService';
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
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('learn');
  const [currentLesson, setCurrentLesson] = useState<SupernovaClass | null>(null);

  useEffect(() => {
    hydrateAppPreferences()
      .then((loaded) => {
        setStats(loaded);
      })
      .finally(() => {
        setHydrated(true);
      });
  }, []);

  if (!fontsLoaded || !hydrated) {
    return (
      <View style={styles.fontLoaderContainer}>
        <StatusBar style="light" backgroundColor={THEME.colors.background} translucent animated />
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  const topSurfaceColor =
    !currentLesson && activeTab === 'profile' ? '#201639' : THEME.colors.background;

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

      {/* Dedicated Full-Screen Lesson Player (Hides tabs when in a class) */}
      {currentLesson ? (
        <View style={[styles.screenContainer, { paddingBottom: insets.bottom }]}>
          <LessonPlayerScreen
            lesson={currentLesson}
            initialHearts={stats.hearts}
            onHeartsChange={handleHeartsChange}
            onClose={() => setCurrentLesson(null)}
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
              />
            )}
            {activeTab === 'call' && (
              <SpeakHubScreen stats={stats} onStatsUpdate={setStats} />
            )}
            {activeTab === 'league' && (
              <LeaderboardScreen stats={stats} onBack={() => setActiveTab('learn')} />
            )}
            {activeTab === 'profile' && (
              <ProfileScreen stats={stats} onStatsUpdate={setStats} />
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
  fontLoaderContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
