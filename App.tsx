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

        {/* If a Lesson is active, show the DEDICATED FULL-SCREEN INDIVIDUAL LESSON PAGE (Hides bottom tabs!) */}
        {currentLesson ? (
          <LessonPlayerScreen
            lesson={currentLesson}
            onClose={() => setCurrentLesson(null)}
            onComplete={handleLessonComplete}
          />
        ) : (
          <>
            {/* Main Tabs Screen Container */}
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

            {/* Supernova 5-Tab Cosmic Navigation Bar */}
            <View style={styles.bottomNav}>
              <TouchableOpacity
                style={styles.navItem}
                onPress={() => setActiveTab('learn')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={activeTab === 'learn' ? 'compass' : 'compass-outline'}
                  size={24}
                  color={activeTab === 'learn' ? THEME.colors.primaryGlow : THEME.colors.textMuted}
                />
                <Text style={[styles.navText, activeTab === 'learn' && styles.navTextActive]}>
                  Learn
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => setActiveTab('call')}
                activeOpacity={0.7}
              >
                <View style={styles.callTabCircle}>
                  <Ionicons name="mic" size={20} color={THEME.colors.text} />
                </View>
                <Text style={[styles.navText, activeTab === 'call' && styles.navTextActiveGold]}>
                  Nova Call
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => setActiveTab('grammar')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={activeTab === 'grammar' ? 'lightning-bolt' : 'lightning-bolt-outline'}
                  size={24}
                  color={activeTab === 'grammar' ? THEME.colors.gold : THEME.colors.textMuted}
                />
                <Text style={[styles.navText, activeTab === 'grammar' && styles.navTextActiveGold]}>
                  Grammar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => setActiveTab('vocab')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={activeTab === 'vocab' ? 'book' : 'book-outline'}
                  size={22}
                  color={activeTab === 'vocab' ? THEME.colors.secondary : THEME.colors.textMuted}
                />
                <Text style={[styles.navText, activeTab === 'vocab' && styles.navTextActiveCyan]}>
                  Vault
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => setActiveTab('league')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={activeTab === 'league' ? 'trophy' : 'trophy-outline'}
                  size={22}
                  color={activeTab === 'league' ? THEME.colors.gold : THEME.colors.textMuted}
                />
                <Text style={[styles.navText, activeTab === 'league' && styles.navTextActiveGold]}>
                  League
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
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
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingVertical: 6,
    paddingBottom: Platform.OS === 'ios' ? 16 : 6,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callTabCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  navTextActive: {
    color: THEME.colors.primaryGlow,
    fontWeight: '700',
  },
  navTextActiveGold: {
    color: THEME.colors.gold,
    fontWeight: '700',
  },
  navTextActiveCyan: {
    color: THEME.colors.secondary,
    fontWeight: '700',
  },
});
