import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
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

import { THEME } from './src/constants/theme';
import { CurriculumScreen } from './src/screens/CurriculumScreen';
import { LessonPlayerScreen } from './src/screens/LessonPlayerScreen';
import { LiveVoiceCallScreen } from './src/screens/LiveVoiceCallScreen';
import { GrammarNovaScreen } from './src/screens/GrammarNovaScreen';
import { VocabVaultScreen } from './src/screens/VocabVaultScreen';
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

type TabType = 'learn' | 'call' | 'grammar' | 'vocab' | 'league' | 'profile';

interface NavTabConfig {
  id: Exclude<TabType, 'league'>;
  label: string;
  family: 'mci' | 'ion';
  activeIcon: string;
  inactiveIcon: string;
  isHero?: boolean;
}

const NAV_TABS: NavTabConfig[] = [
  { id: 'learn', label: 'Course', family: 'mci', activeIcon: 'compass', inactiveIcon: 'compass-outline' },
  { id: 'grammar', label: 'Ask Nova', family: 'mci', activeIcon: 'chat-question', inactiveIcon: 'chat-question-outline' },
  { id: 'call', label: 'Speak', family: 'ion', activeIcon: 'mic', inactiveIcon: 'mic-outline', isHero: true },
  { id: 'vocab', label: 'Vocab', family: 'ion', activeIcon: 'book', inactiveIcon: 'book-outline' },
  { id: 'profile', label: 'Profile', family: 'ion', activeIcon: 'person', inactiveIcon: 'person-outline' },
];

export default function App() {
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
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

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
    <ErrorBoundary>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar style="light" backgroundColor={THEME.colors.background} />

        {/* Dedicated Full-Screen Lesson Player (Hides tabs when in a class) */}
        {currentLesson ? (
          <LessonPlayerScreen
            lesson={currentLesson}
            initialHearts={stats.hearts}
            onHeartsChange={handleHeartsChange}
            onClose={() => setCurrentLesson(null)}
            onComplete={handleLessonComplete}
          />
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
              {activeTab === 'call' && <LiveVoiceCallScreen onStatsUpdate={setStats} />}
              {activeTab === 'grammar' && <GrammarNovaScreen onStatsUpdate={setStats} />}
              {activeTab === 'vocab' && (
                <VocabVaultScreen stats={stats} onStatsUpdate={setStats} />
              )}
              {activeTab === 'league' && (
                <LeaderboardScreen stats={stats} onBack={() => setActiveTab('learn')} />
              )}
              {activeTab === 'profile' && (
                <ProfileScreen stats={stats} onStatsUpdate={setStats} />
              )}
            </View>

            {/* Sleek Floating Obsidian Capsule Navigation Dock */}
            <View style={styles.bottomNavWrapper}>
              <View style={styles.bottomNav}>
                {NAV_TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const iconName = (isActive ? tab.activeIcon : tab.inactiveIcon) as any;
                  const iconColor = tab.isHero
                    ? isActive
                      ? '#FFFFFF'
                      : '#C4B5FD'
                    : isActive
                    ? '#FFFFFF'
                    : '#76728E';

                  return (
                    <TouchableOpacity
                      key={tab.id}
                      style={styles.navItem}
                      onPress={() => setActiveTab(tab.id)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.activeTopBar, isActive && styles.activeTopBarOn]} />

                      {tab.isHero ? (
                        <LinearGradient
                          colors={isActive ? ['#8B5CF6', '#6D28D9'] : ['#292246', '#1F1A36']}
                          style={[styles.speakIconPill, isActive && styles.speakIconPillActive]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Ionicons name={iconName} size={18} color={iconColor} />
                        </LinearGradient>
                      ) : (
                        <View style={[styles.navIconWrap, isActive && styles.navIconWrapActive]}>
                          {tab.family === 'mci' ? (
                            <MaterialCommunityIcons name={iconName} size={19} color={iconColor} />
                          ) : (
                            <Ionicons name={iconName} size={18} color={iconColor} />
                          )}
                        </View>
                      )}

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
      </SafeAreaView>
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
    backgroundColor: THEME.colors.background,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
    alignItems: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#171624',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#2B2842',
    paddingVertical: 7,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 460,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTopBar: {
    width: 18,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginBottom: 5,
  },
  activeTopBarOn: {
    backgroundColor: THEME.colors.primaryGlow,
  },
  navIconWrap: {
    width: 38,
    height: 28,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navIconWrapActive: {
    backgroundColor: 'rgba(127, 67, 254, 0.2)',
  },
  speakIconPill: {
    width: 44,
    height: 28,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.35)',
  },
  speakIconPillActive: {
    borderColor: '#C4B5FD',
    shadowColor: '#7F43FE',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  navText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 10,
    color: '#76728E',
    marginTop: 3,
  },
  navTextActive: {
    fontFamily: THEME.fonts.semiBold,
    color: '#FFFFFF',
  },
});
