import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../constants/theme';
import { GrammarCorrection } from '../types';
import { analyzeSentenceGrammar } from '../api/supernovaAi';
import { speakText } from '../services/ttsService';
import { incrementMetric } from '../services/storageService';

const SAMPLE_SENTENCES = [
  "I didn't went to the office yesterday.",
  "He don't know the answer to this question.",
  "I am having doubt in this react native code.",
  "Yesterday only I have completed the full report.",
];

export const GrammarNovaScreen: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<GrammarCorrection | null>(null);
  const [activeAudioField, setActiveAudioField] = useState<string | null>(null);

  const handleAnalyze = async (sentenceToTest?: string) => {
    const text = (sentenceToTest || inputText).trim();
    if (!text || isAnalyzing) return;

    if (sentenceToTest) {
      setInputText(sentenceToTest);
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const res = await analyzeSentenceGrammar(text);
      setResult(res);
      await incrementMetric('sentencesChecked', 1);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="chat-question-outline" size={24} color={THEME.colors.gold} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>Ask Miss Nova</Text>
          <Text style={styles.subtitle}>Instant grammar diagnosis & Tamil explanation</Text>
        </View>
      </View>

      {/* Input Card */}
      <View style={styles.inputCard}>
        <TextInput
          style={styles.textInput}
          placeholder="Type any English sentence to check..."
          placeholderTextColor={THEME.colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          numberOfLines={3}
        />
        <View style={styles.inputActions}>
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => {
              setInputText('');
              setResult(null);
            }}
          >
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.analyzeTouchable, (!inputText.trim() || isAnalyzing) && styles.analyzeBtnDisabled]}
            onPress={() => handleAnalyze()}
            disabled={!inputText.trim() || isAnalyzing}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={inputText.trim() ? THEME.gradients.primary : ['#3D395C', '#28253E']}
              style={styles.analyzeBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isAnalyzing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.analyzeBtnText}>Check Grammar</Text>
                  <Ionicons name="checkmark-done" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Test Samples */}
      <View style={styles.sampleSection}>
        <Text style={styles.sampleHeading}>COMMON MISTAKES TO TRY</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sampleScroll}>
          {SAMPLE_SENTENCES.map((sample, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.sampleChip}
              onPress={() => handleAnalyze(sample)}
            >
              <Text style={styles.sampleChipText}>"{sample}"</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Diagnosis Results */}
      {result && (
        <View style={styles.resultContainer}>
          {/* Score & Verdict Card */}
          <View style={styles.verdictCard}>
            <View style={styles.verdictRow}>
              <View>
                <Text style={styles.verdictLabel}>FLUENCY SCORE</Text>
                <Text style={styles.verdictScore}>{result.fluencyScore}/100</Text>
              </View>
              <View
                style={[
                  styles.verdictBadge,
                  result.hasErrors ? styles.badgeWarning : styles.badgeSuccess,
                ]}
              >
                <Ionicons
                  name={result.hasErrors ? 'alert-circle' : 'checkmark-circle'}
                  size={18}
                  color={result.hasErrors ? THEME.colors.warning : THEME.colors.success}
                />
                <Text
                  style={[
                    styles.verdictBadgeText,
                    { color: result.hasErrors ? THEME.colors.warning : THEME.colors.success },
                  ]}
                >
                  {result.hasErrors ? 'Needs Improvement' : 'Excellent Grammar'}
                </Text>
              </View>
            </View>

            {/* Corrected Box */}
            <View style={styles.correctedBox}>
              <Text style={styles.correctedLabel}>CORRECTED SENTENCE</Text>
              <Text style={styles.correctedText}>{result.correctedSentence}</Text>
              <TouchableOpacity
                style={styles.audioIconBtn}
                onPress={() => playVoice(result.correctedSentence, 'corrected')}
              >
                <Ionicons
                  name={activeAudioField === 'corrected' ? 'volume-high' : 'volume-medium-outline'}
                  size={20}
                  color={THEME.colors.primaryGlow}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Grammar Explanation */}
          <View style={styles.infoCard}>
            <View style={styles.tamilHeaderRow}>
              <Ionicons name="book-outline" size={16} color={THEME.colors.primaryGlow} />
              <Text style={[styles.infoTitle, { marginLeft: 6, marginBottom: 0 }]}>Grammar Explanation</Text>
            </View>
            <Text style={[styles.infoText, { marginTop: 6 }]}>{result.explanation}</Text>
          </View>

          {/* Tamil Cultural/Mental-Model Clarity */}
          <View style={styles.tamilCard}>
            <View style={styles.tamilHeaderRow}>
              <MaterialCommunityIcons name="translate" size={18} color={THEME.colors.gold} />
              <Text style={styles.tamilCardTitle}>Tamil Explanation</Text>
            </View>
            <Text style={styles.tamilCardText}>{result.tamilExplanation}</Text>
          </View>

          {/* 3 Variations */}
          <Text style={styles.variationsHeader}>Natural Alternatives</Text>

          <View style={styles.variantCard}>
            <View style={styles.variantTop}>
              <View style={styles.variantTag}>
                <Ionicons name="briefcase-outline" size={13} color={THEME.colors.secondary} />
                <Text style={styles.variantTagText}>Professional</Text>
              </View>
              <TouchableOpacity onPress={() => playVoice(result.formalVersion, 'formal')}>
                <Ionicons
                  name={activeAudioField === 'formal' ? 'volume-high' : 'volume-medium-outline'}
                  size={18}
                  color={THEME.colors.primaryGlow}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.variantText}>{result.formalVersion}</Text>
          </View>

          <View style={styles.variantCard}>
            <View style={styles.variantTop}>
              <View style={styles.variantTag}>
                <Ionicons name="cafe-outline" size={13} color={THEME.colors.gold} />
                <Text style={styles.variantTagText}>Casual</Text>
              </View>
              <TouchableOpacity onPress={() => playVoice(result.casualVersion, 'casual')}>
                <Ionicons
                  name={activeAudioField === 'casual' ? 'volume-high' : 'volume-medium-outline'}
                  size={18}
                  color={THEME.colors.primaryGlow}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.variantText}>{result.casualVersion}</Text>
          </View>

          <View style={styles.variantCard}>
            <View style={styles.variantTop}>
              <View style={styles.variantTag}>
                <Ionicons name="chatbubble-ellipses-outline" size={13} color={THEME.colors.primaryGlow} />
                <Text style={styles.variantTagText}>Native Speaker</Text>
              </View>
              <TouchableOpacity onPress={() => playVoice(result.nativeIdiomaticVersion, 'native')}>
                <Ionicons
                  name={activeAudioField === 'native' ? 'volume-high' : 'volume-medium-outline'}
                  size={18}
                  color={THEME.colors.primaryGlow}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.variantText}>{result.nativeIdiomaticVersion}</Text>
          </View>
        </View>
      )}

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: THEME.fonts.bold,
    fontSize: 20,
    color: THEME.colors.text,
  },
  subtitle: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  inputCard: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  textInput: {
    fontFamily: THEME.fonts.bodyMedium,
    color: THEME.colors.text,
    fontSize: 15,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearText: {
    fontFamily: THEME.fonts.medium,
    color: THEME.colors.textMuted,
    fontSize: 13,
  },
  analyzeTouchable: {
    borderRadius: 20,
    borderBottomWidth: 3,
    borderBottomColor: '#5B21B6',
    shadowColor: '#7F43FE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  analyzeBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  analyzeBtnDisabled: {
    opacity: 0.5,
    borderBottomColor: '#28253E',
  },
  analyzeBtnText: {
    fontFamily: THEME.fonts.bold,
    color: '#FFFFFF',
    fontSize: 14,
  },
  sampleSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  sampleHeading: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginBottom: 8,
    letterSpacing: 0.6,
  },
  sampleScroll: {
    gap: 8,
  },
  sampleChip: {
    backgroundColor: THEME.colors.surfaceCard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  sampleChipText: {
    fontFamily: THEME.fonts.body,
    color: THEME.colors.textSecondary,
    fontSize: 12,
  },
  resultContainer: {
    marginTop: 16,
    gap: 12,
  },
  verdictCard: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  verdictRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  verdictLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
  },
  verdictScore: {
    fontFamily: THEME.fonts.bold,
    fontSize: 26,
    color: THEME.colors.text,
  },
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeSuccess: {
    backgroundColor: THEME.colors.successBg,
  },
  badgeWarning: {
    backgroundColor: THEME.colors.warningBg,
  },
  verdictBadgeText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 12,
    marginLeft: 6,
  },
  correctedBox: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: 10,
    padding: 12,
    position: 'relative',
  },
  correctedLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.success,
    letterSpacing: 0.6,
  },
  correctedText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 16,
    color: THEME.colors.text,
    marginTop: 4,
    paddingRight: 32,
  },
  audioIconBtn: {
    position: 'absolute',
    right: 12,
    top: 14,
  },
  infoCard: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  infoTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 13,
    color: THEME.colors.text,
    marginBottom: 6,
  },
  infoText: {
    fontFamily: THEME.fonts.body,
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
  },
  tamilCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: THEME.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  tamilHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tamilCardTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 13,
    color: THEME.colors.gold,
    marginLeft: 6,
  },
  tamilCardText: {
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 13,
    color: THEME.colors.text,
    lineHeight: 20,
  },
  variationsHeader: {
    fontFamily: THEME.fonts.bold,
    fontSize: 15,
    color: THEME.colors.text,
    marginTop: 8,
  },
  variantCard: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  variantTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  variantTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  variantTagText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginLeft: 5,
  },
  variantText: {
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 14,
    color: THEME.colors.text,
    lineHeight: 20,
  },
});

