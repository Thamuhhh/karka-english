import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../constants/theme';
import { UserStats } from '../types';
import { stopAllAudio } from '../services/ttsService';
import { LiveVoiceCallScreen } from './LiveVoiceCallScreen';
import { GrammarNovaScreen } from './GrammarNovaScreen';
import { VocabVaultScreen } from './VocabVaultScreen';

type SpeakMode = 'talk' | 'nila' | 'vocab';

interface SpeakHubScreenProps {
  stats: UserStats;
  onStatsUpdate?: (stats: UserStats) => void;
  onTopColorChange?: (color: string) => void;
}

const SPEAK_MODES: Array<{
  id: SpeakMode;
  label: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
  topColor: string;
}> = [
  {
    id: 'talk',
    label: 'Live Talk',
    activeIcon: 'mic',
    inactiveIcon: 'mic-outline',
    topColor: '#1E143A',
  },
  {
    id: 'nila',
    label: 'Ask Nila',
    activeIcon: 'sparkles',
    inactiveIcon: 'sparkles-outline',
    topColor: '#121E33',
  },
  {
    id: 'vocab',
    label: 'Vocab',
    activeIcon: 'book',
    inactiveIcon: 'book-outline',
    topColor: '#241830',
  },
];

/**
 * Unified Speak studio integrating Live Talk, Ask Nila, and Vocabulary Vault.
 */
export const SpeakHubScreen: React.FC<SpeakHubScreenProps> = ({
  stats,
  onStatsUpdate,
  onTopColorChange,
}) => {
  const [mode, setMode] = useState<SpeakMode>('talk');
  const activeModeColor =
    SPEAK_MODES.find((item) => item.id === mode)?.topColor ?? '#1E143A';

  useEffect(() => {
    onTopColorChange?.(activeModeColor);
  }, [activeModeColor, onTopColorChange]);

  const handleSelectMode = (nextMode: SpeakMode) => {
    if (nextMode === mode) return;
    stopAllAudio();
    setMode(nextMode);
  };

  return (
    <View style={styles.container}>
      {/* Borderless Editorial Mode Tabs with Dynamic Top Wash */}
      <LinearGradient
        colors={[activeModeColor, THEME.colors.background]}
        style={styles.modeHeader}
      >
        <View style={styles.modeRow}>
          {SPEAK_MODES.map((item) => {
            const isActive = mode === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.modeTab}
                onPress={() => handleSelectMode(item.id)}
                activeOpacity={0.8}
              >
                <View style={styles.modeTabContent}>
                  <Ionicons
                    name={isActive ? item.activeIcon : item.inactiveIcon}
                    size={16}
                    color={isActive ? THEME.colors.primaryGlow : THEME.colors.textMuted}
                  />
                  <Text style={[styles.modeLabel, isActive && styles.modeLabelActive]}>
                    {item.label}
                  </Text>
                </View>
                <View style={[styles.modeIndicator, isActive && styles.modeIndicatorActive]} />
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      {/* Active Mode Workspace */}
      <View style={styles.stage}>
        {mode === 'talk' && <LiveVoiceCallScreen onStatsUpdate={onStatsUpdate} />}
        {mode === 'nila' && <GrammarNovaScreen onStatsUpdate={onStatsUpdate} embedded />}
        {mode === 'vocab' && (
          <VocabVaultScreen stats={stats} onStatsUpdate={onStatsUpdate} embedded />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  modeHeader: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  modeRow: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
  },
  modeTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
  },
  modeLabel: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12.5,
    color: THEME.colors.textMuted,
  },
  modeLabelActive: {
    fontFamily: THEME.fonts.bold,
    color: '#FFFFFF',
  },
  modeIndicator: {
    width: '62%',
    height: 2,
    borderRadius: 1,
    backgroundColor: 'transparent',
  },
  modeIndicatorActive: {
    backgroundColor: THEME.colors.primaryGlow,
  },
  stage: {
    flex: 1,
  },
});
