import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../constants/theme';
import { SUPERNOVA_IMAGES } from '../constants/supernovaAssets';
import { UserStats } from '../types';
import {
  loadUserStats,
  loadSavedApiKey,
  saveApiKey,
  loadPreferredAccent,
  savePreferredAccent,
} from '../services/storageService';
import { EnglishAccent, setSpeechRate, getSpeechRate } from '../services/ttsService';

export const ProfileScreen: React.FC = () => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [isSavedKey, setIsSavedKey] = useState(false);
  const [selectedAccent, setSelectedAccent] = useState<EnglishAccent>('en-US');
  const [isSlowSpeech, setIsSlowSpeech] = useState(false);

  useEffect(() => {
    loadUserStats().then(setStats);
    loadSavedApiKey().then((key) => {
      if (key) {
        setApiKey(key);
        setIsSavedKey(true);
      }
    });
    loadPreferredAccent().then(setSelectedAccent);
    setIsSlowSpeech(getSpeechRate() < 0.9);
  }, []);

  const handleSaveApiKey = async () => {
    const trimmed = apiKey.trim();
    await saveApiKey(trimmed);
    setIsSavedKey(!!trimmed);
  };

  const handleAccentChange = async (acc: EnglishAccent) => {
    setSelectedAccent(acc);
    await savePreferredAccent(acc);
  };

  const toggleSpeechSpeed = () => {
    const newSlow = !isSlowSpeech;
    setIsSlowSpeech(newSlow);
    setSpeechRate(newSlow ? 0.75 : 1.0);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header Card */}
      <LinearGradient
        colors={THEME.gradients.banner}
        style={styles.profileCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.avatar}>
          <Image source={SUPERNOVA_IMAGES.streakNova} style={styles.streakNovaAvatar} resizeMode="contain" />
        </View>
        <Text style={styles.userName}>Supernova Learner</Text>
        <Text style={styles.userRank}>{stats?.cosmicRank || 'SuperFluency Champion'}</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{stats?.streakDays || 1}</Text>
            <Text style={styles.statLabel}>Day Streak 🔥</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{stats?.stardustXp || 120}</Text>
            <Text style={styles.statLabel}>Stardust XP ✨</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{stats?.wordsMastered || 6}</Text>
            <Text style={styles.statLabel}>Words Mastered 📚</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{stats?.sentencesChecked || 0}</Text>
            <Text style={styles.statLabel}>Sentences Fixed ⚡</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Free Gemini API Key Settings */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="key-outline" size={20} color={THEME.colors.primaryGlow} />
          <Text style={styles.sectionTitle}>Free Google Gemini AI Key</Text>
        </View>
        <Text style={styles.sectionDesc}>
          Get unlimited, high-speed AI responses with your personal free API key from{' '}
          <Text style={{ color: THEME.colors.secondary }}>aistudio.google.com</Text>.
        </Text>

        <View style={styles.apiKeyInputRow}>
          <TextInput
            style={styles.keyInput}
            placeholder="AIzaSy..."
            placeholderTextColor={THEME.colors.textMuted}
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry
          />
          <TouchableOpacity style={styles.saveKeyBtn} onPress={handleSaveApiKey}>
            <Text style={styles.saveKeyBtnText}>{isSavedKey ? 'Updated' : 'Save'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.keyStatusBox}>
          <Ionicons
            name={isSavedKey ? 'checkmark-circle' : 'information-circle'}
            size={16}
            color={isSavedKey ? THEME.colors.success : THEME.colors.gold}
          />
          <Text style={styles.keyStatusText}>
            {isSavedKey
              ? 'Active: Powered by live Gemini 1.5 Flash'
              : 'Using built-in Supernova Local Engine (No key needed!)'}
          </Text>
        </View>
      </View>

      {/* Audio & Accent Customization */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="volume-high-outline" size={20} color={THEME.colors.secondary} />
          <Text style={styles.sectionTitle}>Native Accent & Speed</Text>
        </View>

        <Text style={styles.subHeading}>PREFERRED ENGLISH ACCENT:</Text>
        <View style={styles.accentRow}>
          {[
            { id: 'en-US' as EnglishAccent, label: 'American 🇺🇸' },
            { id: 'en-GB' as EnglishAccent, label: 'British 🇬🇧' },
            { id: 'en-AU' as EnglishAccent, label: 'Australian 🇦🇺' },
          ].map((acc) => {
            const isSelected = selectedAccent === acc.id;
            return (
              <TouchableOpacity
                key={acc.id}
                style={[styles.accentPill, isSelected && styles.accentPillSelected]}
                onPress={() => handleAccentChange(acc.id)}
              >
                <Text style={[styles.accentPillText, isSelected && styles.accentPillTextSelected]}>
                  {acc.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.subHeading, { marginTop: 16 }]}>PRONUNCIATION SPEED:</Text>
        <TouchableOpacity style={styles.speedToggleRow} onPress={toggleSpeechSpeed}>
          <View>
            <Text style={styles.speedLabel}>Slow Speed (0.75x)</Text>
            <Text style={styles.speedDesc}>Easier to hear individual phonemes and syllable stress</Text>
          </View>
          <View style={[styles.toggleCircle, isSlowSpeech && styles.toggleCircleActive]}>
            <Ionicons
              name={isSlowSpeech ? 'checkmark' : 'close'}
              size={14}
              color={THEME.colors.text}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* About Supernova AI Engine */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons name="rocket-launch-outline" size={20} color={THEME.colors.gold} />
          <Text style={styles.sectionTitle}>NovaBreaker: Supernova AI</Text>
        </View>
        <Text style={styles.aboutText}>
          Designed specifically for learners looking to speak confident, natural English without hesitation.
          Features intelligent grammar diagnostics, spaced repetition vocabulary, and bilingual Tamil mental-model explanations.
        </Text>
        <Text style={styles.versionText}>Version 1.0.0 (Supernova Core)</Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    padding: 16,
  },
  profileCard: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radius.lg,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 16,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  streakNovaAvatar: {
    width: 68,
    height: 68,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  userRank: {
    fontSize: 13,
    color: THEME.colors.gold,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    width: '100%',
    justifyContent: 'space-between',
    gap: 10,
  },
  statBox: {
    width: '47%',
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginLeft: 8,
  },
  sectionDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  apiKeyInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  keyInput: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: THEME.colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  saveKeyBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  saveKeyBtnText: {
    color: THEME.colors.text,
    fontWeight: 'bold',
    fontSize: 13,
  },
  keyStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  keyStatusText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginLeft: 6,
  },
  subHeading: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  accentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  accentPill: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceElevated,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  accentPillSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: THEME.colors.primary,
  },
  accentPillText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  accentPillTextSelected: {
    color: THEME.colors.primaryGlow,
    fontWeight: '700',
  },
  speedToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 12,
    borderRadius: 8,
  },
  speedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  speedDesc: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  toggleCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: THEME.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleCircleActive: {
    backgroundColor: THEME.colors.primary,
  },
  aboutText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  versionText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 10,
  },
});

