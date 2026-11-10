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
import { DashboardScreen } from './src/screens/DashboardScreen';
import { AiCoachScreen } from './src/screens/AiCoachScreen';
import { GrammarNovaScreen } from './src/screens/GrammarNovaScreen';
import { VocabVaultScreen } from './src/screens/VocabVaultScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

type TabType = 'home' | 'coach' | 'grammar' | 'vocab' | 'profile';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | undefined>(undefined);

  const handleLaunchScenario = (scenarioId: string) => {
    setSelectedScenarioId(scenarioId);
    setActiveTab('coach');
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar style="light" backgroundColor={THEME.colors.background} />

        {/* Screen Content */}
        <View style={styles.screenContainer}>
          {activeTab === 'home' && (
            <DashboardScreen
              onSelectTab={(tab) => setActiveTab(tab)}
              onSelectScenario={handleLaunchScenario}
            />
          )}
          {activeTab === 'coach' && (
            <AiCoachScreen initialScenarioId={selectedScenarioId} />
          )}
          {activeTab === 'grammar' && <GrammarNovaScreen />}
          {activeTab === 'vocab' && <VocabVaultScreen />}
          {activeTab === 'profile' && <ProfileScreen />}
        </View>

        {/* Cosmic Bottom Navigation Bar */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('home')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === 'home' ? 'planet' : 'planet-outline'}
              size={22}
              color={activeTab === 'home' ? THEME.colors.primaryGlow : THEME.colors.textMuted}
            />
            <Text style={[styles.navText, activeTab === 'home' && styles.navTextActive]}>
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('coach')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === 'coach' ? 'mic' : 'mic-outline'}
              size={22}
              color={activeTab === 'coach' ? THEME.colors.primaryGlow : THEME.colors.textMuted}
            />
            <Text style={[styles.navText, activeTab === 'coach' && styles.navTextActive]}>
              AI Coach
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('grammar')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={activeTab === 'grammar' ? 'lightning-bolt' : 'lightning-bolt-outline'}
              size={22}
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
              Vocab
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
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 16 : 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 4,
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
