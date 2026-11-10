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
          <Image source={SUPERNOVA_IMAGES.streakNova} style={styles.streakNovaAvatar} resizeMode="cover" />
        </View>
        <Text style={styles.userName}>Learner Profile</Text>
        <Text style={styles.userRank}>{stats?.cosmicRank || 'Gold League'}</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <View style={styles.statRowTop}>
              <MaterialCommunityIcons name="fire" size={18} color={THEME.colors.gold} />
              <Text style={styles.statVal}>{stats?.streakDays || 1}</Text>
            </View>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.statRowTop}>
              <Ionicons name="flash" size={16} color={THEME.colors.secondary} />
              <Text style={styles.statVal}>{stats?.stardustXp || 120}</Text>
            </View>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.statRowTop}>
              <Ionicons name="book" size={16} color={THEME.colors.accent} />
              <Text style={styles.statVal}>{stats?.wordsMastered || 6}</Text>
            </View>
            <Text style={styles.statLabel}>Words Learned</Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.statRowTop}>
              <Ionicons name="checkmark-circle" size={16} color={THEME.colors.primaryGlow} />
              <Text style={styles.statVal}>{stats?.sentencesChecked || 0}</Text>
            </View>
            <Text style={styles.statLabel}>Grammar Checks</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Free Gemini API Key Settings */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="key-outline" size={20} color={THEME.colors.primaryGlow} />
          <Text style={styles.sectionTitle}>Google Gemini AI Key</Text>
        </View>
        <Text style={styles.sectionDesc}>
          Add your free API key from{' '}
          <Text style={{ color: THEME.colors.secondary }}>aistudio.google.com</Text> for faster live AI replies.
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
              ? 'Active: Powered by Gemini 1.5 Flash'
              : 'Using offline Supernova engine (No key needed)'}
          </Text>
        </View>
      </View>

      {/* Audio & Accent Customization */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="volume-high-outline" size={20} color={THEME.colors.secondary} />
          <Text style={styles.sectionTitle}>Voice Accent & Speed</Text>
        </View>

        <Text style={styles.subHeading}>ENGLISH ACCENT</Text>
        <View style={styles.accentRow}>
          {[
            { id: 'en-US' as EnglishAccent, label: 'US English' },
            { id: 'en-GB' as EnglishAccent, label: 'UK English' },
            { id: 'en-AU' as EnglishAccent, label: 'AU English' },
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

        <Text style={[styles.subHeading, { marginTop: 16 }]}>PLAYBACK SPEED</Text>
        <TouchableOpacity style={styles.speedToggleRow} onPress={toggleSpeechSpeed}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.speedLabel}>Slow Mode (0.75x)</Text>
            <Text style={styles.speedDesc}>Clearer syllable pronunciation for beginners</Text>
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

      {/* About */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="school-outline" size={20} color={THEME.colors.gold} />
          <Text style={styles.sectionTitle}>Supernova English</Text>
        </View>
        <Text style={styles.aboutText}>
          Built for learners aiming to speak fluent English naturally. Combines grammar diagnostics, vocabulary practice, and Tamil mental-model guides.
        </Text>
        <Text style={styles.versionText}>Version 1.0.0</Text>
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#181724',
    borderWidth: 2.5,
    borderColor: THEME.colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  streakNovaAvatar: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.08 }],
  },
  userName: {
    fontFamily: THEME.fonts.bold,
    fontSize: 20,
    color: THEME.colors.text,
  },
  userRank: {
    fontFamily: THEME.fonts.bold,
    fontSize: 12,
    color: THEME.colors.gold,
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
  statRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statVal: {
    fontFamily: THEME.fonts.bold,
    fontSize: 18,
    color: THEME.colors.text,
  },
  statLabel: {
    fontFamily: THEME.fonts.body,
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
    fontFamily: THEME.fonts.bold,
    fontSize: 15,
    color: THEME.colors.text,
    marginLeft: 8,
  },
  sectionDesc: {
    fontFamily: THEME.fonts.body,
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
    fontFamily: THEME.fonts.body,
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
    fontFamily: THEME.fonts.bold,
    color: THEME.colors.text,
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
    fontFamily: THEME.fonts.body,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginLeft: 6,
  },
  subHeading: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textSecondary,
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
    backgroundColor: 'rgba(127, 67, 254, 0.2)',
    borderColor: THEME.colors.primary,
  },
  accentPillText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  accentPillTextSelected: {
    fontFamily: THEME.fonts.bold,
    color: THEME.colors.primaryGlow,
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
    fontFamily: THEME.fonts.semiBold,
    fontSize: 13,
    color: THEME.colors.text,
  },
  speedDesc: {
    fontFamily: THEME.fonts.body,
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
    fontFamily: THEME.fonts.body,
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  versionText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 10,
  },
});

