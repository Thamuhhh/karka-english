import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
}

const SPEAK_MODES: Array<{
  id: SpeakMode;
  label: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
}> = [
  { id: 'talk', label: 'Live Talk', activeIcon: 'mic', inactiveIcon: 'mic-outline' },
  { id: 'nila', label: 'Ask Nila', activeIcon: 'sparkles', inactiveIcon: 'sparkles-outline' },
  { id: 'vocab', label: 'Vocab', activeIcon: 'book', inactiveIcon: 'book-outline' },
];

/**
 * Unified Speak hub integrating Live Talk, Ask Nila, and Vocabulary Vault.
 */
export const SpeakHubScreen: React.FC<SpeakHubScreenProps> = ({ stats, onStatsUpdate }) => {
  const [mode, setMode] = useState<SpeakMode>('talk');

  const handleSelectMode = (nextMode: SpeakMode) => {
    if (nextMode === mode) return;
    stopAllAudio();
    setMode(nextMode);
  };

  return (
    <View style={styles.container}>
      {/* Unified Top Segmented Mode Switcher */}
      <View style={styles.modeBarOuter}>
        <View style={styles.modeTrack}>
          {SPEAK_MODES.map((item) => {
            const isActive = mode === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.modePill, isActive && styles.modePillActive]}
                onPress={() => handleSelectMode(item.id)}
                activeOpacity={0.82}
              >
                <Ionicons
                  name={isActive ? item.activeIcon : item.inactiveIcon}
                  size={15}
                  color={isActive ? '#FFFFFF' : THEME.colors.textSecondary}
                />
                <Text style={[styles.modeLabel, isActive && styles.modeLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Active Mode Content Stage */}
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
  modeBarOuter: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: THEME.colors.background,
  },
  modeTrack: {
    flexDirection: 'row',
    backgroundColor: '#14131E',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#252238',
    gap: 4,
  },
  modePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  modePillActive: {
    backgroundColor: THEME.colors.primary,
  },
  modeLabel: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  modeLabelActive: {
    fontFamily: THEME.fonts.bold,
    color: '#FFFFFF',
  },
  stage: {
    flex: 1,
  },
});
