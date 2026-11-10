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
import { WordDefinition } from '../types';
import { STARTER_VOCABULARY, fetchWordDetails } from '../api/dictionary';
import { fetchRelatedWords } from '../api/datamuse';
import { speakText, playRemoteAudio } from '../services/ttsService';
import { incrementMetric } from '../services/storageService';

export const VocabVaultScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [wordList, setWordList] = useState<WordDefinition[]>(STARTER_VOCABULARY);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [relatedSynonyms, setRelatedSynonyms] = useState<string[]>([]);

  const currentWord = wordList[activeCardIndex] || STARTER_VOCABULARY[0];

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q || isSearching) return;

    setIsSearching(true);
    try {
      const details = await fetchWordDetails(q);
      if (details) {
        // Prepend to list
        const updated = [details, ...wordList.filter((w) => w.word.toLowerCase() !== q.toLowerCase())];
        setWordList(updated);
        setActiveCardIndex(0);
        setIsFlipped(false);

        // Fetch related words via Datamuse
        const syns = await fetchRelatedWords(q);
        setRelatedSynonyms(syns);
      }
    } catch (e) {
      console.warn('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePlayAudio = async () => {
    setIsPlayingAudio(true);
    if (currentWord.audioUrl) {
      await playRemoteAudio(currentWord.audioUrl, () => setIsPlayingAudio(false));
    } else {
      await speakText(currentWord.word, () => setIsPlayingAudio(false));
    }
  };

  const handleNextWord = () => {
    setIsFlipped(false);
    setActiveCardIndex((prev) => (prev + 1) % wordList.length);
  };

  const handlePrevWord = () => {
    setIsFlipped(false);
    setActiveCardIndex((prev) => (prev - 1 + wordList.length) % wordList.length);
  };

  const handleMastered = async () => {
    await incrementMetric('wordsMastered', 1);
    handleNextWord();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="book" size={22} color={THEME.colors.secondary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>Vocabulary Vault</Text>
          <Text style={styles.subtitle}>Master new words with native pronunciation</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={THEME.colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search any English word (e.g. serendipity)..."
          placeholderTextColor={THEME.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {isSearching ? (
          <ActivityIndicator size="small" color={THEME.colors.primaryGlow} />
        ) : (
          <TouchableOpacity onPress={handleSearch} style={styles.searchBtn}>
            <Text style={styles.searchBtnText}>Look Up</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Flashcard (Spaced Repetition Mode) */}
      <View style={styles.cardIndicatorRow}>
        <Text style={styles.cardCounter}>
          CARD {activeCardIndex + 1} OF {wordList.length}
        </Text>
        <View style={styles.cefrTag}>
          <Text style={styles.cefrTagText}>CEFR {currentWord.cefrLevel}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.flashcard}
        activeOpacity={0.9}
        onPress={() => setIsFlipped(!isFlipped)}
      >
        <View style={styles.cardInner}>
          {/* Card Front Header */}
          <View style={styles.cardHeader}>
            <Text style={styles.partOfSpeech}>{currentWord.partOfSpeech}</Text>
            <TouchableOpacity
              style={[styles.audioBtn, isPlayingAudio && styles.audioBtnActive]}
              onPress={handlePlayAudio}
            >
              <Ionicons
                name={isPlayingAudio ? 'volume-high' : 'volume-medium-outline'}
                size={22}
                color={THEME.colors.text}
              />
            </TouchableOpacity>
          </View>

          {/* Word & Phonetic */}
          <Text style={styles.cardWord}>{currentWord.word}</Text>
          <Text style={styles.cardPhonetic}>{currentWord.phonetic}</Text>

          {/* Card Back Content (Revealed on tap) */}
          {isFlipped ? (
            <View style={styles.revealedSection}>
              <View style={styles.divider} />
              <Text style={styles.defLabel}>DEFINITION:</Text>
              <Text style={styles.defText}>{currentWord.definition}</Text>

              <View style={styles.tamilBox}>
                <Text style={styles.tamilLabel}>தமிழ் அர்த்தம்:</Text>
                <Text style={styles.tamilText}>{currentWord.tamilMeaning}</Text>
              </View>

              <Text style={styles.exampleLabel}>EXAMPLE SENTENCE:</Text>
              <Text style={styles.exampleText}>"{currentWord.example}"</Text>

              {currentWord.synonyms.length > 0 && (
                <View style={styles.synonymsSection}>
                  <Text style={styles.synonymsLabel}>SYNONYMS:</Text>
                  <View style={styles.synonymsRow}>
                    {currentWord.synonyms.map((s, idx) => (
                      <View key={idx} style={styles.synonymPill}>
                        <Text style={styles.synonymText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.tapToReveal}>
              <MaterialCommunityIcons name="gesture-tap" size={20} color={THEME.colors.primaryGlow} />
              <Text style={styles.tapText}>Tap to reveal meaning & Tamil explanation</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Flashcard Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.navBtn} onPress={handlePrevWord} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={THEME.colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.masteredTouchable} onPress={handleMastered} activeOpacity={0.85}>
          <LinearGradient
            colors={THEME.gradients.accent}
            style={styles.masteredBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="checkmark-done" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.masteredBtnText}>Mastered (+15 XP)</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navBtn} onPress={handleNextWord} activeOpacity={0.8}>
          <Ionicons name="arrow-forward" size={20} color={THEME.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Related Synonyms */}
      {relatedSynonyms.length > 0 && (
        <View style={styles.relatedSection}>
          <Text style={styles.relatedHeading}>Related Synonyms</Text>
          <View style={styles.relatedRow}>
            {relatedSynonyms.map((w, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.relatedChip}
                onPress={() => {
                  setSearchQuery(w);
                  handleSearch();
                }}
              >
                <Text style={styles.relatedChipText}>+{w}</Text>
              </TouchableOpacity>
            ))}
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
    padding: 14,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: THEME.fonts.bold,
    fontSize: 18,
    color: THEME.colors.text,
  },
  subtitle: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 18,
  },
  searchInput: {
    fontFamily: THEME.fonts.bodyMedium,
    flex: 1,
    color: THEME.colors.text,
    fontSize: 14,
    paddingVertical: 8,
  },
  searchBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  searchBtnText: {
    fontFamily: THEME.fonts.bold,
    color: THEME.colors.text,
    fontSize: 12,
  },
  cardIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardCounter: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
  },
  cefrTag: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cefrTagText: {
    fontFamily: THEME.fonts.bold,
    color: THEME.colors.primaryGlow,
    fontSize: 11,
  },
  flashcard: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    minHeight: 205,
  },
  cardInner: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  partOfSpeech: {
    fontFamily: THEME.fonts.bold,
    fontSize: 12,
    color: THEME.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  audioBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioBtnActive: {
    backgroundColor: THEME.colors.primary,
  },
  cardWord: {
    fontFamily: THEME.fonts.bold,
    fontSize: 24,
    color: THEME.colors.text,
    marginTop: 8,
  },
  cardPhonetic: {
    fontFamily: THEME.fonts.body,
    fontSize: 15,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  tapToReveal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
  },
  tapText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 13,
    color: THEME.colors.primaryGlow,
    marginLeft: 6,
  },
  revealedSection: {
    marginTop: 14,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginBottom: 12,
  },
  defLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textSecondary,
  },
  defText: {
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 15,
    color: THEME.colors.text,
    lineHeight: 22,
    marginTop: 2,
  },
  tamilBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  tamilLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.gold,
  },
  tamilText: {
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 13,
    color: THEME.colors.text,
    marginTop: 2,
    lineHeight: 18,
  },
  exampleLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 12,
  },
  exampleText: {
    fontFamily: THEME.fonts.body,
    fontSize: 13,
    color: THEME.colors.text,
    marginTop: 2,
    lineHeight: 18,
  },
  synonymsSection: {
    marginTop: 12,
  },
  synonymsLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginBottom: 6,
  },
  synonymsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  synonymPill: {
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  synonymText: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  navBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: THEME.colors.surfaceCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  masteredTouchable: {
    borderRadius: 24,
    borderBottomWidth: 3,
    borderBottomColor: '#059669',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  masteredBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
  },
  masteredBtnText: {
    fontFamily: THEME.fonts.bold,
    color: '#FFFFFF',
    fontSize: 14,
  },
  relatedSection: {
    marginTop: 24,
  },
  relatedHeading: {
    fontFamily: THEME.fonts.bold,
    fontSize: 13,
    color: THEME.colors.text,
    marginBottom: 10,
  },
  relatedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relatedChip: {
    backgroundColor: THEME.colors.surfaceCard,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  relatedChipText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12,
    color: THEME.colors.secondary,
  },
});

