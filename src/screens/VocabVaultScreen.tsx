import React, { useState, useEffect, useMemo } from 'react';
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
import { UserStats, WordDefinition } from '../types';
import { STARTER_VOCABULARY, fetchWordDetails } from '../api/dictionary';
import { fetchRelatedWords } from '../api/datamuse';
import { speakText, playRemoteAudio, stopAllAudio } from '../services/ttsService';
import {
  loadVocabularyList,
  saveVocabularyList,
  markWordMastered,
} from '../services/storageService';
import { playSoundEffect } from '../services/soundEffectsService';

interface VocabVaultScreenProps {
  stats?: UserStats;
  onStatsUpdate?: (stats: UserStats) => void;
  embedded?: boolean;
}

type VocabFilter = 'all' | 'review' | 'mastered';

export const VocabVaultScreen: React.FC<VocabVaultScreenProps> = ({
  stats,
  onStatsUpdate,
  embedded = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [wordList, setWordList] = useState<WordDefinition[]>(STARTER_VOCABULARY);
  const [filter, setFilter] = useState<VocabFilter>('all');
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [relatedSynonyms, setRelatedSynonyms] = useState<string[]>([]);

  useEffect(() => {
    loadVocabularyList().then((loaded) => {
      if (loaded.length > 0) setWordList(loaded);
    });
    return () => {
      stopAllAudio();
    };
  }, []);

  const masteredSet = useMemo(() => {
    const s = new Set((stats?.masteredWords || []).map((w) => w.toLowerCase()));
    wordList.forEach((w) => {
      if (w.memorized) s.add(w.word.toLowerCase());
    });
    return s;
  }, [stats?.masteredWords, wordList]);

  const filteredWords = useMemo(() => {
    if (filter === 'mastered') {
      const m = wordList.filter((w) => masteredSet.has(w.word.toLowerCase()));
      return m.length > 0 ? m : [];
    }
    if (filter === 'review') {
      return wordList.filter((w) => !masteredSet.has(w.word.toLowerCase()));
    }
    return wordList;
  }, [wordList, filter, masteredSet]);

  const safeIndex =
    filteredWords.length > 0 ? Math.min(activeCardIndex, filteredWords.length - 1) : 0;
  const currentWord = filteredWords[safeIndex] || wordList[0] || STARTER_VOCABULARY[0];
  const isCurrentMastered = masteredSet.has(currentWord.word.toLowerCase());

  const handleSearch = async (overrideWord?: string) => {
    const q = (overrideWord ?? searchQuery).trim();
    if (!q || isSearching) return;

    if (overrideWord) {
      setSearchQuery(overrideWord);
    }
    setSearchError(null);
    setIsSearching(true);

    try {
      const details = await fetchWordDetails(q);
      if (details) {
        const updated = [
          details,
          ...wordList.filter((w) => w.word.toLowerCase() !== details.word.toLowerCase()),
        ];
        setWordList(updated);
        await saveVocabularyList(updated);
        setFilter('all');
        setActiveCardIndex(0);
        setIsFlipped(false);

        const syns = await fetchRelatedWords(details.word);
        setRelatedSynonyms(syns);
      } else {
        setSearchError(`Could not find "${q}" in English dictionary. Check spelling and try again.`);
      }
    } catch (e) {
      setSearchError('Dictionary service unreachable right now. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handlePlayAudio = async () => {
    setIsPlayingAudio(true);
    if (currentWord.audioUrl) {
      await playRemoteAudio(
        currentWord.audioUrl,
        () => setIsPlayingAudio(false),
        currentWord.word
      );
    } else {
      await speakText(currentWord.word, () => setIsPlayingAudio(false));
    }
  };

  const handleNextWord = () => {
    if (filteredWords.length === 0) return;
    setIsFlipped(false);
    setActiveCardIndex((prev) => (prev + 1) % filteredWords.length);
  };

  const handlePrevWord = () => {
    if (filteredWords.length === 0) return;
    setIsFlipped(false);
    setActiveCardIndex((prev) => (prev - 1 + filteredWords.length) % filteredWords.length);
  };

  const handleMastered = async () => {
    playSoundEffect('success');
    const updatedStats = await markWordMastered(currentWord.word);
    onStatsUpdate?.(updatedStats);
    setWordList((prev) =>
      prev.map((w) =>
        w.word.toLowerCase() === currentWord.word.toLowerCase() ? { ...w, memorized: true } : w
      )
    );
    handleNextWord();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, embedded && styles.contentEmbedded]}
    >
      {/* Header */}
      {embedded ? (
        <View style={styles.embeddedMetaRow}>
          <Text style={styles.embeddedMetaText}>
            {masteredSet.size} of {wordList.length} words mastered
          </Text>
        </View>
      ) : (
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="book" size={20} color={THEME.colors.secondary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.title}>Vocabulary Vault</Text>
            <Text style={styles.subtitle}>
              {masteredSet.size} of {wordList.length} words mastered
            </Text>
          </View>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={THEME.colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search any English word (e.g. serendipity)..."
          placeholderTextColor={THEME.colors.textMuted}
          value={searchQuery}
          onChangeText={(txt) => {
            setSearchQuery(txt);
            if (searchError) setSearchError(null);
          }}
          onSubmitEditing={() => handleSearch()}
          returnKeyType="search"
        />
        {isSearching ? (
          <ActivityIndicator size="small" color={THEME.colors.primaryGlow} />
        ) : (
          <TouchableOpacity onPress={() => handleSearch()} style={styles.searchBtn}>
            <Text style={styles.searchBtnText}>Look Up</Text>
          </TouchableOpacity>
        )}
      </View>

      {searchError && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={15} color={THEME.colors.warning} />
          <Text style={styles.errorBannerText}>{searchError}</Text>
        </View>
      )}

      {/* Filter Pills */}
      <View style={styles.filterRow}>
        {(
          [
            { id: 'all', label: `All (${wordList.length})` },
            { id: 'review', label: `To Review (${Math.max(0, wordList.length - masteredSet.size)})` },
            { id: 'mastered', label: `Mastered (${masteredSet.size})` },
          ] as { id: VocabFilter; label: string }[]
        ).map((tab) => {
          const active = filter === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.filterPill, active && styles.filterPillActive]}
              onPress={() => {
                setFilter(tab.id);
                setActiveCardIndex(0);
                setIsFlipped(false);
              }}
            >
              <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {filteredWords.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-done-circle-outline" size={34} color={THEME.colors.primaryGlow} />
          <Text style={styles.emptyTitle}>
            {filter === 'review' ? 'All current words mastered!' : 'No mastered words yet'}
          </Text>
          <Text style={styles.emptySub}>
            {filter === 'review'
              ? 'Search a new word above to expand your deck.'
              : 'Tap "Mastered" on flashcards to track your progress.'}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.cardIndicatorRow}>
            <Text style={styles.cardCounter}>
              CARD {safeIndex + 1} OF {filteredWords.length}
            </Text>
            <View style={styles.cardBadgesRight}>
              {isCurrentMastered && (
                <View style={styles.masteredTag}>
                  <Ionicons name="checkmark-circle" size={11} color={THEME.colors.primaryGlow} />
                  <Text style={styles.masteredTagText}>MASTERED</Text>
                </View>
              )}
              <View style={styles.cefrTag}>
                <Text style={styles.cefrTagText}>CEFR {currentWord.cefrLevel}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.flashcard}
            activeOpacity={0.9}
            onPress={() => setIsFlipped(!isFlipped)}
          >
            <View style={styles.cardInner}>
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

              <Text style={styles.cardWord}>{currentWord.word}</Text>
              <Text style={styles.cardPhonetic}>{currentWord.phonetic}</Text>

              {isFlipped ? (
                <View style={styles.revealedSection}>
                  <View style={styles.divider} />
                  <Text style={styles.defLabel}>DEFINITION</Text>
                  <Text style={styles.defText}>{currentWord.definition}</Text>

                  <View style={styles.tamilBox}>
                    <Text style={styles.tamilLabel}>தமிழ் அர்த்தம்:</Text>
                    <Text style={styles.tamilText}>{currentWord.tamilMeaning}</Text>
                  </View>

                  <Text style={styles.exampleLabel}>EXAMPLE SENTENCE</Text>
                  <Text style={styles.exampleText}>"{currentWord.example}"</Text>

                  {currentWord.synonyms.length > 0 && (
                    <View style={styles.synonymsSection}>
                      <Text style={styles.synonymsLabel}>SYNONYMS</Text>
                      <View style={styles.synonymsRow}>
                        {currentWord.synonyms.map((s, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.synonymPill}
                            onPress={() => handleSearch(s)}
                          >
                            <Text style={styles.synonymText}>{s}</Text>
                          </TouchableOpacity>
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

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.navBtn} onPress={handlePrevWord} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color={THEME.colors.text} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.masteredTouchable} onPress={handleMastered} activeOpacity={0.85}>
              <LinearGradient
                colors={THEME.gradients.primary}
                style={styles.masteredBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="checkmark-done" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.masteredBtnText}>
                  {isCurrentMastered ? 'Review Again (+5 XP)' : 'Mark Mastered (+15 XP)'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navBtn} onPress={handleNextWord} activeOpacity={0.8}>
              <Ionicons name="arrow-forward" size={20} color={THEME.colors.text} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {relatedSynonyms.length > 0 && (
        <View style={styles.relatedSection}>
          <Text style={styles.relatedHeading}>Related Synonyms (Tap to Look Up)</Text>
          <View style={styles.relatedRow}>
            {relatedSynonyms.map((w, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.relatedChip}
                onPress={() => handleSearch(w)}
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
  contentEmbedded: {
    paddingTop: 8,
  },
  embeddedMetaRow: {
    marginBottom: 10,
  },
  embeddedMetaText: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: THEME.colors.textSecondary,
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
    marginBottom: 12,
  },
  searchInput: {
    fontFamily: THEME.fonts.bodyMedium,
    flex: 1,
    color: THEME.colors.text,
    fontSize: 13.5,
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.warningBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    marginBottom: 12,
    gap: 8,
  },
  errorBannerText: {
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 12,
    color: THEME.colors.warning,
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceCard,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
  },
  filterPillActive: {
    backgroundColor: 'rgba(127, 67, 254, 0.16)',
    borderColor: THEME.colors.primary,
  },
  filterPillText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  filterPillTextActive: {
    fontFamily: THEME.fonts.bold,
    color: THEME.colors.primaryGlow,
  },
  emptyCard: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radius.lg,
    padding: 28,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 15,
    color: THEME.colors.text,
  },
  emptySub: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
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
  cardBadgesRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  masteredTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(127, 67, 254, 0.16)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  masteredTagText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.primaryGlow,
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
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  tapToReveal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
  },
  tapText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 12.5,
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
    fontSize: 14.5,
    color: THEME.colors.text,
    lineHeight: 21,
    marginTop: 2,
  },
  tamilBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  tamilLabel: {
    fontFamily: THEME.fonts.tamilBold,
    fontSize: 10.5,
    color: THEME.colors.gold,
    lineHeight: 17,
  },
  tamilText: {
    fontFamily: THEME.fonts.tamilMedium,
    fontSize: 13.5,
    color: THEME.colors.text,
    marginTop: 2,
    lineHeight: 23,
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
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  synonymText: {
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 12,
    color: THEME.colors.primaryGlow,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.surfaceCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  masteredTouchable: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  masteredBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  masteredBtnText: {
    fontFamily: THEME.fonts.bold,
    color: '#FFFFFF',
    fontSize: 13.5,
  },
  relatedSection: {
    marginTop: 22,
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
