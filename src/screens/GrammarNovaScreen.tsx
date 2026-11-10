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
          <MaterialCommunityIcons name="lightning-bolt" size={24} color={THEME.colors.gold} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>Grammar Nova Engine</Text>
          <Text style={styles.subtitle}>Instant sentence diagnosis & Tamil mental-model explanation</Text>
        </View>
      </View>

      {/* Input Card */}
      <View style={styles.inputCard}>
        <TextInput
          style={styles.textInput}
          placeholder="Paste or type any English sentence here..."
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
            style={[styles.analyzeBtn, (!inputText.trim() || isAnalyzing) && styles.analyzeBtnDisabled]}
            onPress={() => handleAnalyze()}
            disabled={!inputText.trim() || isAnalyzing}
          >
            {isAnalyzing ? (
              <ActivityIndicator size="small" color={THEME.colors.text} />
            ) : (
              <>
                <Text style={styles.analyzeBtnText}>Diagnose Sentence</Text>
                <Ionicons name="sparkles" size={16} color={THEME.colors.text} style={{ marginLeft: 6 }} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Test Samples */}
      <View style={styles.sampleSection}>
        <Text style={styles.sampleHeading}>TRY COMMON INDIAN-ENGLISH MISTAKES:</Text>
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
              <Text style={styles.correctedLabel}>SUPERNOVA CORRECTION:</Text>
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
            <Text style={styles.infoTitle}>📖 Grammar Rule & Why:</Text>
            <Text style={styles.infoText}>{result.explanation}</Text>
          </View>

          {/* Tamil Cultural/Mental-Model Clarity */}
          <View style={styles.tamilCard}>
            <View style={styles.tamilHeaderRow}>
              <MaterialCommunityIcons name="translate" size={18} color={THEME.colors.gold} />
              <Text style={styles.tamilCardTitle}>தமிழ் சிந்தனை முறை விளக்கம்:</Text>
            </View>
            <Text style={styles.tamilCardText}>{result.tamilExplanation}</Text>
          </View>

          {/* 3 Variations (Professional, Casual, Native) */}
          <Text style={styles.variationsHeader}>🎯 3 Ways to Express This:</Text>

          <View style={styles.variantCard}>
            <View style={styles.variantTop}>
              <View style={styles.variantTag}>
                <Ionicons name="briefcase-outline" size={12} color={THEME.colors.secondary} />
                <Text style={styles.variantTagText}>Professional / Email</Text>
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
                <Ionicons name="cafe-outline" size={12} color={THEME.colors.gold} />
                <Text style={styles.variantTagText}>Casual / Friendly</Text>
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
                <Ionicons name="sparkles-outline" size={12} color={THEME.colors.primaryGlow} />
                <Text style={styles.variantTagText}>Native Idiomatic</Text>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  subtitle: {
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
    color: THEME.colors.textMuted,
    fontSize: 13,
  },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  analyzeBtnDisabled: {
    opacity: 0.5,
  },
  analyzeBtnText: {
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  sampleSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  sampleHeading: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '700',
    marginBottom: 8,
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
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  verdictScore: {
    fontSize: 26,
    fontWeight: 'bold',
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
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  correctedBox: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: 10,
    padding: 12,
    position: 'relative',
  },
  correctedLabel: {
    fontSize: 10,
    color: THEME.colors.success,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  correctedText: {
    fontSize: 16,
    fontWeight: 'bold',
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
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginBottom: 6,
  },
  infoText: {
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
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.colors.gold,
    marginLeft: 6,
  },
  tamilCardText: {
    fontSize: 13,
    color: THEME.colors.text,
    lineHeight: 20,
  },
  variationsHeader: {
    fontSize: 15,
    fontWeight: 'bold',
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
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginLeft: 4,
  },
  variantText: {
    fontSize: 14,
    color: THEME.colors.text,
    lineHeight: 20,
  },
});

