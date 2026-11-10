import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
  const [activeTab, setActiveTab] = useState<TabType>('learn');
  const [currentLesson, setCurrentLesson] = useState<SupernovaClass | null>(null);
  const [completedClasses, setCompletedClasses] = useState<string[]>(['sn-1-1']);

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
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
                />
              )}
              {activeTab === 'call' && <LiveVoiceCallScreen />}
              {activeTab === 'grammar' && <GrammarNovaScreen />}
              {activeTab === 'vocab' && <VocabVaultScreen />}
              {activeTab === 'league' && <LeaderboardScreen />}
              {activeTab === 'profile' && <ProfileScreen />}
            </View>

            {/* Ultra-Premium Supernova Bottom Navigation Bar */}
            <View style={styles.bottomNavWrapper}>
              <View style={styles.bottomNav}>
                <TouchableOpacity
                  style={[styles.navItem, activeTab === 'learn' && styles.navItemActive]}
                  onPress={() => setActiveTab('learn')}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={activeTab === 'learn' ? 'compass' : 'compass-outline'}
                    size={24}
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
                    size={22}
                    color={activeTab === 'grammar' ? THEME.colors.gold : THEME.colors.textMuted}
                  />
                  <Text style={[styles.navText, activeTab === 'grammar' && styles.navTextActiveGold]}>
                    Doctor
                  </Text>
                </TouchableOpacity>

                {/* Center Floating Nova Call Tab with Glowing Gradient */}
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
                    <Ionicons name="mic" size={24} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={[styles.navText, activeTab === 'call' && styles.navTextActiveCall]}>
                    Nova Call
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.navItem, activeTab === 'vocab' && styles.navItemActive]}
                  onPress={() => setActiveTab('vocab')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={activeTab === 'vocab' ? 'book' : 'book-outline'}
                    size={22}
                    color={activeTab === 'vocab' ? THEME.colors.accent : THEME.colors.textMuted}
                  />
                  <Text style={[styles.navText, activeTab === 'vocab' && styles.navTextActiveAccent]}>
                    Vault
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.navItem, activeTab === 'profile' && styles.navItemActive]}
                  onPress={() => setActiveTab('profile')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={activeTab === 'profile' ? 'person' : 'person-outline'}
                    size={22}
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
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  screenContainer: {
    flex: 1,
  },
  bottomNavWrapper: {
    backgroundColor: THEME.colors.background,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surfaceDark,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 22 : 10,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 14,
  },
  navItemActive: {
    backgroundColor: 'rgba(127, 67, 254, 0.08)',
  },
  centerCallWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    top: -12,
  },
  callTabGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#A78BFA',
    shadowColor: '#7F43FE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    borderBottomWidth: 4,
    borderBottomColor: '#5B21B6',
  },
  navText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 4,
    fontWeight: '600',
  },
  navTextActive: {
    color: THEME.colors.primaryGlow,
    fontWeight: '800',
  },
  navTextActiveCall: {
    color: THEME.colors.primaryGlow,
    fontWeight: '800',
  },
  navTextActiveGold: {
    color: THEME.colors.gold,
    fontWeight: '800',
  },
  navTextActiveAccent: {
    color: THEME.colors.accent,
    fontWeight: '800',
  },
});
