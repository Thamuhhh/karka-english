import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
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
import { SupernovaClass } from './src/constants/curriculum';

type TabType = 'learn' | 'call' | 'grammar' | 'vocab' | 'league' | 'profile';

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

  const [activeTab, setActiveTab] = useState<TabType>('learn');
  const [currentLesson, setCurrentLesson] = useState<SupernovaClass | null>(null);
  const [completedClasses, setCompletedClasses] = useState<string[]>(['sn-1-1']);

  if (!fontsLoaded) {
    return (
      <View style={styles.fontLoaderContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  const handleStartLesson = (lesson: SupernovaClass) => {
    setCurrentLesson(lesson);
  };

  const handleLessonComplete = (classId: string) => {
    if (!completedClasses.includes(classId)) {
      setCompletedClasses([...completedClasses, classId]);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar style="light" backgroundColor={THEME.colors.background} />

        {/* Dedicated Full-Screen Lesson Player (Hides tabs when in a class) */}
        {currentLesson ? (
          <LessonPlayerScreen
            lesson={currentLesson}
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
                  completedClasses={completedClasses}
                  onOpenLeague={() => setActiveTab('league')}
                />
              )}
              {activeTab === 'call' && <LiveVoiceCallScreen />}
              {activeTab === 'grammar' && <GrammarNovaScreen />}
              {activeTab === 'vocab' && <VocabVaultScreen />}
              {activeTab === 'league' && (
                <LeaderboardScreen onBack={() => setActiveTab('learn')} />
              )}
              {activeTab === 'profile' && <ProfileScreen />}
            </View>

            {/* Compact Mobile-Scaled Bottom Navigation Bar */}
            <View style={styles.bottomNavWrapper}>
              <View style={styles.bottomNav}>
                <TouchableOpacity
                  style={[styles.navItem, activeTab === 'learn' && styles.navItemActive]}
                  onPress={() => setActiveTab('learn')}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={activeTab === 'learn' ? 'compass' : 'compass-outline'}
                    size={21}
                    color={activeTab === 'learn' ? THEME.colors.primaryGlow : THEME.colors.textMuted}
                  />
                  <Text style={[styles.navText, activeTab === 'learn' && styles.navTextActive]}>
                    Course
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.navItem, activeTab === 'grammar' && styles.navItemActive]}
                  onPress={() => setActiveTab('grammar')}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={activeTab === 'grammar' ? 'chat-question' : 'chat-question-outline'}
                    size={20}
                    color={activeTab === 'grammar' ? THEME.colors.gold : THEME.colors.textMuted}
                  />
                  <Text style={[styles.navText, activeTab === 'grammar' && styles.navTextActiveGold]}>
                    Ask Nova
                  </Text>
                </TouchableOpacity>

                {/* Center Floating Nova Call Tab */}
                <TouchableOpacity
                  style={styles.centerCallWrapper}
                  onPress={() => setActiveTab('call')}
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
                  <Text style={[styles.navText, activeTab === 'call' && styles.navTextActiveCall]}>
                    Speak
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.navItem, activeTab === 'vocab' && styles.navItemActive]}
                  onPress={() => setActiveTab('vocab')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={activeTab === 'vocab' ? 'book' : 'book-outline'}
                    size={20}
                    color={activeTab === 'vocab' ? THEME.colors.accent : THEME.colors.textMuted}
                  />
                  <Text style={[styles.navText, activeTab === 'vocab' && styles.navTextActiveAccent]}>
                    Vocab
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.navItem, activeTab === 'profile' && styles.navItemActive]}
                  onPress={() => setActiveTab('profile')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={activeTab === 'profile' ? 'person' : 'person-outline'}
                    size={20}
                    color={activeTab === 'profile' ? THEME.colors.primaryGlow : THEME.colors.textMuted}
                  />
                  <Text style={[styles.navText, activeTab === 'profile' && styles.navTextActive]}>
                    Profile
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
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
    paddingBottom: 6,
    alignItems: 'center',
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
    paddingVertical: 3,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: 'rgba(127, 67, 254, 0.08)',
  },
  centerCallWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 3,
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
  navTextActiveCall: {
    fontFamily: THEME.fonts.bold,
    color: THEME.colors.primaryGlow,
  },
  navTextActiveGold: {
    fontFamily: THEME.fonts.bold,
    color: THEME.colors.gold,
  },
  navTextActiveAccent: {
    fontFamily: THEME.fonts.bold,
    color: THEME.colors.accent,
  },
});
