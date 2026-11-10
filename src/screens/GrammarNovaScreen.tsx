import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../constants/theme';
import { GrammarCorrection, UserStats } from '../types';
import { analyzeSentenceGrammar, isGeminiConfigured } from '../api/supernovaAi';
import { speakText, stopAllAudio } from '../services/ttsService';
import { incrementMetric } from '../services/storageService';
import { playSoundEffect } from '../services/soundEffectsService';

interface GrammarNovaScreenProps {
  onStatsUpdate?: (stats: UserStats) => void;
}

const SAMPLE_SENTENCES = [
  "I didn't went to the office yesterday.",
  "He don't know the answer to this question.",
  "I am having doubt in this report.",
  "Yesterday only I have completed the full presentation.",
  "We will discuss about this tomorrow and revert back.",
];

const TONE_VARIANTS: Array<{
  key: 'formalVersion' | 'casualVersion' | 'nativeIdiomaticVersion';
  fieldId: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'formalVersion', fieldId: 'formal', label: 'Professional', icon: 'briefcase-outline' },
  { key: 'casualVersion', fieldId: 'casual', label: 'Casual', icon: 'cafe-outline' },
  {
    key: 'nativeIdiomaticVersion',
    fieldId: 'native',
    label: 'Native Phrasing',
    icon: 'chatbubble-ellipses-outline',
  },
];

const MAX_CONTENT_WIDTH = 500;

export const GrammarNovaScreen: React.FC<GrammarNovaScreenProps> = ({ onStatsUpdate }) => {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<GrammarCorrection | null>(null);
  const [recentResults, setRecentResults] = useState<GrammarCorrection[]>([]);
  const [activeAudioField, setActiveAudioField] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  const handleAnalyze = async (sentenceToTest?: string) => {
    const text = (sentenceToTest ?? inputText).trim();
    if (!text || isAnalyzing) return;

    if (sentenceToTest) {
      setInputText(sentenceToTest);
    }

    setIsAnalyzing(true);
    try {
      const res = await analyzeSentenceGrammar(text);
      setResult(res);
      setRecentResults((prev) => [
        res,
        ...prev.filter((r) => r.originalSentence !== res.originalSentence).slice(0, 4),
      ]);
      playSoundEffect(res.hasErrors ? 'chime' : 'success');
      const updated = await incrementMetric('sentencesChecked', 1);
      onStatsUpdate?.(updated);
    } catch (e) {
      console.warn('Grammar check error:', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const playVoice = (text: string, fieldId: string) => {
    setActiveAudioField(fieldId);
    speakText(text, () => setActiveAudioField(null));
  };

  const onlineMode = isGeminiConfigured();
  const hasInput = inputText.trim().length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Minimalist Obsidian Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.iconBadge}>
            <Ionicons name="sparkles" size={19} color="#C4B5FD" />
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Ask Nila</Text>
            <Text style={styles.subtitle}>Sentence polish &amp; Tamil grammar breakdown</Text>
          </View>
        </View>

        <View style={styles.enginePill}>
          <View
            style={[
              styles.engineDot,
              { backgroundColor: onlineMode ? '#A78BFA' : '#76728E' },
            ]}
          />
          <Text style={styles.engineText}>{onlineMode ? 'Gemini' : 'Local'}</Text>
        </View>
      </View>

      {/* Monochrome Obsidian Sentence Composer */}
      <View style={[styles.composerCard, hasInput && styles.composerCardActive]}>
        <TextInput
          style={styles.textInput}
          placeholder="Paste or type any English sentence..."
          placeholderTextColor={THEME.colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          textAlignVertical="top"
        />

        <View style={styles.composerFooter}>
          {hasInput ? (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => {
                setInputText('');
                setResult(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.charHint}>English → Natural Polish</Text>
          )}

          <TouchableOpacity
            style={[styles.analyzeTouchable, (!hasInput || isAnalyzing) && styles.analyzeDisabled]}
            onPress={() => handleAnalyze()}
            disabled={!hasInput || isAnalyzing}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={hasInput ? ['#8B5CF6', '#6D28D9'] : ['#26233B', '#1F1D30']}
              style={styles.analyzeBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isAnalyzing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.analyzeRow}>
                  <Text style={[styles.analyzeBtnText, !hasInput && styles.analyzeBtnTextMuted]}>
                    Check
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={15}
                    color={hasInput ? '#FFFFFF' : '#76728E'}
                  />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Test Samples */}
      <View style={styles.stripSection}>
        <Text style={styles.stripLabel}>TRY A SENTENCE</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stripRow}
        >
          {SAMPLE_SENTENCES.map((sample, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.sampleChip, inputText.trim() === sample && styles.sampleChipActive]}
              onPress={() => handleAnalyze(sample)}
              activeOpacity={0.8}
            >
              <Text style={styles.sampleChipText}>"{sample}"</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Recent Session Checks */}
      {recentResults.length > 1 && (
        <View style={styles.stripSection}>
          <Text style={styles.stripLabel}>RECENT</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stripRow}
          >
            {recentResults.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.historyChip}
                onPress={() => {
                  setInputText(item.originalSentence);
                  setResult(item);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.historyScore}>{item.fluencyScore}</Text>
                <Text style={styles.historyText} numberOfLines={1}>
                  {item.originalSentence}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Consolidated Diagnosis Results */}
      {result && (
        <View style={styles.resultsStack}>
          {/* Primary Correction + Explanation Block */}
          <View style={styles.analysisCard}>
            <View style={styles.verdictHeader}>
              <View>
                <Text style={styles.eyebrowMuted}>FLUENCY SCORE</Text>
                <Text style={styles.verdictScore}>{result.fluencyScore}/100</Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  !result.hasErrors && styles.statusBadgePolished,
                ]}
              >
                <Ionicons
                  name={result.hasErrors ? 'create-outline' : 'checkmark-circle'}
                  size={15}
                  color={result.hasErrors ? '#D7D3EB' : '#C4B5FD'}
                />
                <Text
                  style={[
                    styles.statusBadgeText,
                    !result.hasErrors && styles.statusBadgeTextPolished,
                  ]}
                >
                  {result.hasErrors ? 'Polished' : 'Natural'}
                </Text>
              </View>
            </View>

            <View style={styles.correctedCallout}>
              <View style={styles.correctedTopRow}>
                <Text style={styles.correctedLabel}>NATURAL ENGLISH</Text>
                <TouchableOpacity
                  style={styles.audioBtn}
                  onPress={() => playVoice(result.correctedSentence, 'corrected')}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons
                    name={activeAudioField === 'corrected' ? 'volume-high' : 'volume-medium-outline'}
                    size={18}
                    color="#A78BFA"
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.correctedText}>{result.correctedSentence}</Text>
            </View>

            <View style={styles.explanationSection}>
              <Text style={styles.eyebrowMuted}>KEY NOTE</Text>
              <Text style={styles.explanationText}>{result.explanation}</Text>
            </View>

            <View style={styles.tamilCallout}>
              <Text style={styles.tamilCalloutEyebrow}>TAMIL EXPLANATION</Text>
              <Text style={styles.tamilCalloutBody}>{result.tamilExplanation}</Text>
            </View>
          </View>

          {/* Single Unified Alternative Tones Card */}
          <View style={styles.tonesCard}>
            <Text style={styles.tonesTitle}>ALTERNATIVE TONES</Text>

            {TONE_VARIANTS.map((tone, idx) => {
              const phrase = result[tone.key];
              const isPlaying = activeAudioField === tone.fieldId;
              return (
                <View
                  key={tone.fieldId}
                  style={[styles.toneRow, idx > 0 && styles.toneRowBorder]}
                >
                  <View style={styles.toneTopRow}>
                    <View style={styles.toneTag}>
                      <Ionicons name={tone.icon} size={13.5} color="#A78BFA" />
                      <Text style={styles.toneTagText}>{tone.label}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.audioBtn}
                      onPress={() => playVoice(phrase, tone.fieldId)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons
                        name={isPlaying ? 'volume-high' : 'volume-medium-outline'}
                        size={17}
                        color="#A78BFA"
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.toneSentence}>{phrase}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },

  /* HEADER */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#181628',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleBlock: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontFamily: THEME.fonts.bold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily: THEME.fonts.body,
    fontSize: 11.5,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  enginePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171624',
    borderColor: '#2A2740',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
    gap: 5,
  },
  engineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  engineText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 10.5,
    color: '#D7D3EB',
  },

  /* COMPOSER */
  composerCard: {
    backgroundColor: '#151422',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#29263F',
    overflow: 'hidden',
  },
  composerCardActive: {
    borderColor: 'rgba(127, 67, 254, 0.55)',
  },
  textInput: {
    fontFamily: THEME.fonts.bodyMedium,
    color: '#FFFFFF',
    fontSize: 14.5,
    minHeight: 84,
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 12,
    lineHeight: 22,
  },
  composerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#13121E',
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearText: {
    fontFamily: THEME.fonts.medium,
    color: THEME.colors.textSecondary,
    fontSize: 12.5,
  },
  charHint: {
    fontFamily: THEME.fonts.body,
    color: THEME.colors.textMuted,
    fontSize: 11.5,
  },
  analyzeTouchable: {
    borderRadius: 11,
    overflow: 'hidden',
  },
  analyzeBtnGradient: {
    height: 38,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  analyzeDisabled: {
    opacity: 0.75,
  },
  analyzeBtnText: {
    fontFamily: THEME.fonts.bold,
    color: '#FFFFFF',
    fontSize: 13,
  },
  analyzeBtnTextMuted: {
    color: '#76728E',
  },

  /* STRIPS */
  stripSection: {
    marginTop: 16,
  },
  stripLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  stripRow: {
    gap: 8,
  },
  sampleChip: {
    backgroundColor: '#171625',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#28253E',
  },
  sampleChipActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(127, 67, 254, 0.14)',
  },
  sampleChipText: {
    fontFamily: THEME.fonts.body,
    color: '#D5D0E6',
    fontSize: 12,
  },
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171625',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2740',
    maxWidth: 200,
    gap: 6,
  },
  historyScore: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: '#C4B5FD',
  },
  historyText: {
    fontFamily: THEME.fonts.body,
    fontSize: 11.5,
    color: '#D5D0E6',
    flexShrink: 1,
  },

  /* RESULTS */
  resultsStack: {
    marginTop: 18,
    gap: 14,
  },
  analysisCard: {
    backgroundColor: '#151422',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#29263F',
    gap: 14,
  },
  verdictHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrowMuted: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  verdictScore: {
    fontFamily: THEME.fonts.bold,
    fontSize: 24,
    color: '#FFFFFF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#1F1D30',
    borderWidth: 1,
    borderColor: '#322E4D',
  },
  statusBadgePolished: {
    backgroundColor: 'rgba(127, 67, 254, 0.16)',
    borderColor: 'rgba(167, 139, 250, 0.35)',
  },
  statusBadgeText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11.5,
    color: '#D7D3EB',
  },
  statusBadgeTextPolished: {
    color: '#C4B5FD',
  },
  correctedCallout: {
    backgroundColor: '#1B182E',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  correctedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  correctedLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: '#A78BFA',
    letterSpacing: 0.8,
  },
  audioBtn: {
    padding: 3,
  },
  correctedText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 15.5,
    color: '#FFFFFF',
    lineHeight: 22,
    marginTop: 5,
  },
  explanationSection: {
    paddingTop: 2,
  },
  explanationText: {
    fontFamily: THEME.fonts.body,
    fontSize: 13,
    color: '#C9C5DE',
    lineHeight: 20,
  },
  tamilCallout: {
    backgroundColor: '#1A1829',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.primaryGlow,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tamilCalloutEyebrow: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: '#A78BFA',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  tamilCalloutBody: {
    fontFamily: THEME.fonts.tamilMedium,
    fontSize: 13.5,
    color: '#F1EFFC',
    lineHeight: 23,
  },

  /* UNIFIED TONES CARD */
  tonesCard: {
    backgroundColor: '#151422',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: '#29263F',
  },
  tonesTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10.5,
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  toneRow: {
    paddingVertical: 12,
  },
  toneRowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  toneTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  toneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toneTagText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11.5,
    color: '#C4B5FD',
  },
  toneSentence: {
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 13.5,
    color: '#FFFFFF',
    lineHeight: 20,
  },
});
