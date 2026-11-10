import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../constants/theme';
import { SUPERNOVA_IMAGES } from '../constants/supernovaAssets';
import { GrammarCorrection, UserStats } from '../types';
import { analyzeSentenceGrammar, isGeminiConfigured } from '../api/supernovaAi';
import { speakText, speakTamil, stopAllAudio } from '../services/ttsService';
import { incrementMetric } from '../services/storageService';
import { playSoundEffect } from '../services/soundEffectsService';

interface GrammarNovaScreenProps {
  onStatsUpdate?: (stats: UserStats) => void;
  embedded?: boolean;
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

const MAX_CONTENT_WIDTH = 480;

export const GrammarNovaScreen: React.FC<GrammarNovaScreenProps> = ({
  onStatsUpdate,
  embedded = false,
}) => {
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

  const playTamilVoice = (text: string, fieldId: string) => {
    setActiveAudioField(fieldId);
    speakTamil(text, () => setActiveAudioField(null));
  };

  const onlineMode = isGeminiConfigured();
  const hasInput = inputText.trim().length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, embedded && styles.contentEmbedded]}
      showsVerticalScrollIndicator={false}
    >
      {/* Lean Open Header */}
      <View style={[styles.headerRow, embedded && styles.headerRowEmbedded]}>
        {embedded ? (
          <View style={styles.embeddedIdentity}>
            <Image
              source={SUPERNOVA_IMAGES.novaAvatar}
              style={styles.miniAvatar}
              resizeMode="cover"
            />
            <Text style={styles.embeddedSubnote} numberOfLines={1}>
              English polish &amp; Tamil clarity
            </Text>
          </View>
        ) : (
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Ask Nila</Text>
            <Text style={styles.subtitle}>Sentence polish &amp; Tamil breakdown</Text>
          </View>
        )}

        <View style={styles.engineStatus}>
          <View
            style={[
              styles.engineDot,
              { backgroundColor: onlineMode ? THEME.colors.primaryGlow : '#76728E' },
            ]}
          />
          <Text style={styles.engineText}>{onlineMode ? 'Gemini' : 'Local'}</Text>
        </View>
      </View>

      {/* Sleek Single-Surface Sentence Composer */}
      <View style={[styles.composerSurface, hasInput && styles.composerSurfaceActive]}>
        <TextInput
          style={styles.textInput}
          placeholder="Type or paste an English sentence..."
          placeholderTextColor={THEME.colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          textAlignVertical="top"
        />

        <View style={styles.composerBar}>
          {hasInput ? (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => {
                stopAllAudio();
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
            onPress={() => handleAnalyze()}
            disabled={!hasInput || isAnalyzing}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={hasInput ? ['#8B5CF6', '#7F43FE'] : ['#242136', '#1C1A2B']}
              style={styles.checkBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isAnalyzing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.checkBtnInner}>
                  <Text style={[styles.checkBtnText, !hasInput && styles.checkBtnTextMuted]}>
                    Polish
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={15}
                    color={hasInput ? '#FFFFFF' : '#6E6A85'}
                  />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Whisper-Light Sample Sentences */}
      <View style={styles.stripSection}>
        <Text style={styles.stripLabel}>TRY A SENTENCE</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stripRow}
        >
          {SAMPLE_SENTENCES.map((sample, idx) => {
            const active = inputText.trim() === sample;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.samplePill, active && styles.samplePillActive]}
                onPress={() => handleAnalyze(sample)}
                activeOpacity={0.8}
              >
                <Text style={[styles.samplePillText, active && styles.samplePillTextActive]}>
                  "{sample}"
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Recent Session History */}
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
                style={styles.historyPill}
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

      {/* Minimal Empty Cue */}
      {!result && !isAnalyzing && (
        <Text style={styles.emptyMinimalHint}>
          Tap a sample above or enter any English sentence for natural polish and Tamil tips.
        </Text>
      )}

      {/* Open Borderless Editorial Diagnosis */}
      {result && (
        <View style={styles.editorialReport}>
          {/* Left-Accent Natural Improvement Hero */}
          <View
            style={[
              styles.heroRewriteBlock,
              {
                borderLeftColor: result.hasErrors
                  ? THEME.colors.gold
                  : THEME.colors.primaryGlow,
              },
            ]}
          >
            <View style={styles.blockTopRow}>
              <View style={styles.verdictBadge}>
                <View
                  style={[
                    styles.verdictDot,
                    {
                      backgroundColor: result.hasErrors
                        ? THEME.colors.gold
                        : THEME.colors.primaryGlow,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.violetEyebrow,
                    result.hasErrors && { color: THEME.colors.gold },
                  ]}
                >
                  NATURAL IMPROVEMENT · {result.fluencyScore}/100
                </Text>
              </View>
              <TouchableOpacity
                style={styles.listenChip}
                onPress={() => playVoice(result.correctedSentence, 'corrected')}
                activeOpacity={0.78}
              >
                <Ionicons
                  name={activeAudioField === 'corrected' ? 'volume-high' : 'volume-medium-outline'}
                  size={14}
                  color={THEME.colors.primaryGlow}
                />
                <Text style={styles.listenChipText}>Listen</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.heroRewriteText}>{result.correctedSentence}</Text>
          </View>

          {/* Unified Tamil + Key Note */}
          <View style={styles.editorialSection}>
            <View style={styles.blockTopRow}>
              <Text style={styles.violetEyebrow}>TAMIL & GRAMMAR NOTE</Text>
              <TouchableOpacity
                style={styles.listenChip}
                onPress={() => playTamilVoice(result.tamilExplanation, 'tamil-explain')}
                activeOpacity={0.78}
              >
                <Ionicons
                  name={
                    activeAudioField === 'tamil-explain' ? 'volume-high' : 'volume-medium-outline'
                  }
                  size={14}
                  color={THEME.colors.primaryGlow}
                />
                <Text style={styles.listenChipText}>Speak Tamil</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.tamilBody}>{result.tamilExplanation}</Text>
            <Text style={styles.explanationBody}>{result.explanation}</Text>
          </View>

          <View style={styles.hairlineDivider} />

          {/* Open Hairline-Separated Alternative Tones */}
          <View style={styles.editorialSection}>
            <Text style={styles.eyebrowMuted}>OTHER WAYS TO SAY IT</Text>
            {TONE_VARIANTS.map((tone, idx) => {
              const phrase = result[tone.key];
              const isPlaying = activeAudioField === tone.fieldId;
              return (
                <View
                  key={tone.fieldId}
                  style={[styles.toneRow, idx > 0 && styles.toneRowSeparated]}
                >
                  <View style={styles.blockTopRow}>
                    <View style={styles.toneTag}>
                      <Ionicons name={tone.icon} size={13.5} color={THEME.colors.primaryGlow} />
                      <Text style={styles.toneTagText}>{tone.label}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.audioIconBtn}
                      onPress={() => playVoice(phrase, tone.fieldId)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons
                        name={isPlaying ? 'volume-high' : 'volume-medium-outline'}
                        size={17}
                        color={THEME.colors.primaryGlow}
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
    paddingTop: 16,
    paddingBottom: 24,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  contentEmbedded: {
    paddingTop: 10,
  },

  /* HEADER */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerRowEmbedded: {
    marginBottom: 12,
  },
  embeddedIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
    paddingRight: 10,
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  embeddedSubnote: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    flexShrink: 1,
  },
  titleBlock: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    fontFamily: THEME.fonts.bold,
    fontSize: 20,
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  engineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  engineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  engineText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },

  /* COMPOSER */
  composerSurface: {
    backgroundColor: '#151422',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  composerSurfaceActive: {
    borderColor: 'rgba(167, 139, 250, 0.45)',
  },
  textInput: {
    fontFamily: THEME.fonts.bodyMedium,
    color: '#FFFFFF',
    fontSize: 15,
    minHeight: 72,
    lineHeight: 22,
  },
  composerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  clearBtn: {
    paddingVertical: 4,
    paddingRight: 10,
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
  checkBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkBtnText: {
    fontFamily: THEME.fonts.bold,
    color: '#FFFFFF',
    fontSize: 13,
  },
  checkBtnTextMuted: {
    color: '#6E6A85',
  },

  /* SAMPLES & HISTORY */
  stripSection: {
    marginTop: 16,
  },
  stripLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginBottom: 8,
    letterSpacing: 0.9,
  },
  stripRow: {
    gap: 8,
  },
  samplePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.045)',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
  },
  samplePillActive: {
    backgroundColor: 'rgba(127, 67, 254, 0.2)',
  },
  samplePillText: {
    fontFamily: THEME.fonts.body,
    color: THEME.colors.textSecondary,
    fontSize: 12,
  },
  samplePillTextActive: {
    color: '#FFFFFF',
  },
  historyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    maxWidth: 210,
    gap: 6,
  },
  historyScore: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: THEME.colors.primaryGlow,
  },
  historyText: {
    fontFamily: THEME.fonts.body,
    fontSize: 11.5,
    color: THEME.colors.textSecondary,
    flexShrink: 1,
  },

  /* MINIMAL EMPTY CUE */
  emptyMinimalHint: {
    fontFamily: THEME.fonts.body,
    fontSize: 12.5,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    lineHeight: 19,
  },

  /* OPEN EDITORIAL REPORT */
  editorialReport: {
    marginTop: 20,
  },
  eyebrowMuted: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textMuted,
    letterSpacing: 0.9,
    marginBottom: 4,
  },
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  verdictDot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.5,
  },
  heroRewriteBlock: {
    backgroundColor: 'rgba(127, 67, 254, 0.06)',
    borderLeftWidth: 2.5,
    borderLeftColor: THEME.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 18,
  },
  blockTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  violetEyebrow: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.primaryGlow,
    letterSpacing: 0.9,
  },
  listenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(127, 67, 254, 0.16)',
  },
  listenChipText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11,
    color: '#C4B5FD',
  },
  heroRewriteText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 17,
    color: '#FFFFFF',
    lineHeight: 25,
    marginTop: 7,
  },
  editorialSection: {
    paddingVertical: 4,
  },
  explanationBody: {
    fontFamily: THEME.fonts.body,
    fontSize: 12.5,
    color: THEME.colors.textSecondary,
    lineHeight: 19,
    marginTop: 6,
  },
  tamilBody: {
    fontFamily: THEME.fonts.tamilMedium,
    fontSize: 13.5,
    color: '#F1EFFC',
    lineHeight: 23,
    marginTop: 8,
  },
  hairlineDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 15,
  },
  toneRow: {
    paddingVertical: 11,
  },
  toneRowSeparated: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
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
  audioIconBtn: {
    padding: 3,
  },
  toneSentence: {
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    marginTop: 4,
  },
});
