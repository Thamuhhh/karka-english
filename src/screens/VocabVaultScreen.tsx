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
          <Text style={styles.title}>Cosmic Vocab Vault</Text>
          <Text style={styles.subtitle}>Spaced Repetition & Free Dictionary Audio</Text>
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
        <TouchableOpacity style={styles.navBtn} onPress={handlePrevWord}>
          <Ionicons name="arrow-back" size={20} color={THEME.colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.masteredBtn} onPress={handleMastered}>
          <Ionicons name="checkmark-done" size={18} color={THEME.colors.text} />
          <Text style={styles.masteredBtnText}>Mastered (+15 XP)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navBtn} onPress={handleNextWord}>
          <Ionicons name="arrow-forward" size={20} color={THEME.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Related Synonyms Web (from Datamuse API) */}
      {relatedSynonyms.length > 0 && (
        <View style={styles.relatedSection}>
          <Text style={styles.relatedHeading}>🌐 Semantic Word Web (Datamuse API):</Text>
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
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
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
    color: THEME.colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardCounter: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  cefrTag: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cefrTagText: {
    color: THEME.colors.primaryGlow,
    fontSize: 11,
    fontWeight: 'bold',
  },
  flashcard: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    minHeight: 250,
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
    fontSize: 12,
    color: THEME.colors.secondary,
    textTransform: 'uppercase',
    fontWeight: '700',
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
    fontSize: 30,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginTop: 10,
  },
  cardPhonetic: {
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
    fontSize: 13,
    color: THEME.colors.primaryGlow,
    marginLeft: 6,
    fontWeight: '600',
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
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: '700',
  },
  defText: {
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
    fontSize: 10,
    color: THEME.colors.gold,
    fontWeight: '700',
  },
  tamilText: {
    fontSize: 13,
    color: THEME.colors.text,
    marginTop: 2,
    lineHeight: 18,
  },
  exampleLabel: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: '700',
    marginTop: 12,
  },
  exampleText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: THEME.colors.text,
    marginTop: 2,
    lineHeight: 18,
  },
  synonymsSection: {
    marginTop: 12,
  },
  synonymsLabel: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: '700',
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
  masteredBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  masteredBtnText: {
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  relatedSection: {
    marginTop: 24,
  },
  relatedHeading: {
    fontSize: 13,
    fontWeight: 'bold',
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
    fontSize: 12,
    color: THEME.colors.secondary,
  },
});

