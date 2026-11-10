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
import { Ionicons } from '@expo/vector-icons';
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

const MAX_CONTENT_WIDTH = 480;

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
  const masteryPct =
    wordList.length > 0 ? Math.round((masteredSet.size / wordList.length) * 100) : 0;

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
    } catch {
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

  const hasQuery = searchQuery.trim().length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, embedded && styles.contentEmbedded]}
      showsVerticalScrollIndicator={false}
    >
      {/* Corporate Executive Header & Progress Metric */}
      <View style={[styles.headerRow, embedded && styles.headerRowEmbedded]}>
        <View style={styles.headerTextBlock}>
          {!embedded && <Text style={styles.title}>Vocabulary Vault</Text>}
          <Text style={styles.subtitle}>
            {masteredSet.size} of {wordList.length} words mastered
          </Text>
        </View>
        <Text style={styles.pctStat}>{masteryPct}%</Text>
      </View>

      {/* Thin Executive Progress Hairline */}
      <View style={styles.progressTrack}>
        {masteryPct > 0 && (
          <LinearGradient
            colors={['#7F43FE', '#A78BFA']}
            style={[styles.progressFill, { width: `${masteryPct}%` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        )}
      </View>

      {/* Minimalist Search Command Bar */}
      <View style={[styles.searchBar, hasQuery && styles.searchBarActive]}>
        <Ionicons name="search" size={16} color={THEME.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Look up any word (e.g. leverage, articulate)..."
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
          <TouchableOpacity
            onPress={() => handleSearch()}
            disabled={!hasQuery}
            style={[styles.searchBtn, !hasQuery && styles.searchBtnDisabled]}
            activeOpacity={0.82}
          >
            <Text style={[styles.searchBtnText, !hasQuery && styles.searchBtnTextMuted]}>
              Lookup
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {searchError && (
        <View style={styles.errorStrip}>
          <Ionicons name="alert-circle-outline" size={15} color={THEME.colors.gold} />
          <Text style={styles.errorText}>{searchError}</Text>
        </View>
      )}

      {/* Corporate Segmented Filter Track */}
      <View style={styles.filterTrack}>
        {(
          [
            { id: 'all', label: `All (${wordList.length})` },
            { id: 'review', label: `Review (${Math.max(0, wordList.length - masteredSet.size)})` },
            { id: 'mastered', label: `Mastered (${masteredSet.size})` },
          ] as { id: VocabFilter; label: string }[]
        ).map((tab) => {
          const active = filter === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.filterSegment, active && styles.filterSegmentActive]}
              onPress={() => {
                setFilter(tab.id);
                setActiveCardIndex(0);
                setIsFlipped(false);
              }}
              activeOpacity={0.82}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {filteredWords.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="checkmark-done-circle-outline"
            size={30}
            color={THEME.colors.primaryGlow}
          />
          <Text style={styles.emptyTitle}>
            {filter === 'review' ? 'All words mastered' : 'No mastered words yet'}
          </Text>
          <Text style={styles.emptySub}>
            {filter === 'review'
              ? 'Look up a new word above to expand your deck.'
              : 'Tap Mark Mastered on any card to build your deck.'}
          </Text>
        </View>
      ) : (
        <>
          {/* Card Index & Level Metadata Line */}
          <View style={styles.metaRow}>
            <Text style={styles.cardCounter}>
              {String(safeIndex + 1).padStart(2, '0')} / {String(filteredWords.length).padStart(2, '0')}
            </Text>
            <View style={styles.metaRight}>
              {isCurrentMastered && (
                <View style={styles.masteredStatus}>
                  <View style={styles.masteredDot} />
                  <Text style={styles.masteredStatusText}>Mastered</Text>
                </View>
              )}
              <Text style={styles.cefrLabel}>CEFR {currentWord.cefrLevel}</Text>
            </View>
          </View>

          {/* Clean Corporate Executive Word Sheet */}
          <TouchableOpacity
            style={styles.wordSheet}
            activeOpacity={0.92}
            onPress={() => setIsFlipped(!isFlipped)}
          >
            <View style={styles.sheetTopRow}>
              <Text style={styles.posEyebrow}>{currentWord.partOfSpeech}</Text>
              <TouchableOpacity
                style={[styles.audioBtn, isPlayingAudio && styles.audioBtnActive]}
                onPress={handlePlayAudio}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons
                  name={isPlayingAudio ? 'volume-high' : 'volume-medium-outline'}
                  size={18}
                  color={isPlayingAudio ? '#FFFFFF' : THEME.colors.primaryGlow}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.wordTitle}>{currentWord.word}</Text>
            {!!currentWord.phonetic && (
              <Text style={styles.wordPhonetic}>{currentWord.phonetic}</Text>
            )}

            {isFlipped ? (
              <View style={styles.detailsStack}>
                <View style={styles.sheetDivider} />

                <Text style={styles.fieldEyebrow}>DEFINITION</Text>
                <Text style={styles.defBody}>{currentWord.definition}</Text>

                {/* Left-Accented Tamil Explanation (Zero Heavy Box) */}
                <View style={styles.tamilStrip}>
                  <Text style={styles.fieldEyebrow}>TAMIL MEANING</Text>
                  <Text style={styles.tamilBody}>{currentWord.tamilMeaning}</Text>
                </View>

                <Text style={styles.fieldEyebrow}>USAGE IN CONTEXT</Text>
                <Text style={styles.exampleBody}>"{currentWord.example}"</Text>

                {currentWord.synonyms.length > 0 && (
                  <View style={styles.synonymsWrap}>
                    <Text style={styles.fieldEyebrow}>SYNONYMS</Text>
                    <View style={styles.chipsRow}>
                      {currentWord.synonyms.map((s, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.synonymChip}
                          onPress={() => handleSearch(s)}
                          activeOpacity={0.78}
                        >
                          <Text style={styles.synonymChipText}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.revealPrompt}>
                <Ionicons name="eye-outline" size={16} color={THEME.colors.textMuted} />
                <Text style={styles.revealText}>Tap card to inspect definition &amp; usage</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Clean Executive Action Bar */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.navCircle} onPress={handlePrevWord} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={18} color={THEME.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.masterBtnWrap}
              onPress={handleMastered}
              activeOpacity={0.86}
            >
              {isCurrentMastered ? (
                <View style={styles.reviewAgainBtn}>
                  <Ionicons name="refresh" size={16} color={THEME.colors.primaryGlow} />
                  <Text style={styles.reviewAgainText}>Review Again (+5 XP)</Text>
                </View>
              ) : (
                <LinearGradient
                  colors={['#8B5CF6', '#7F43FE']}
                  style={styles.masteredGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="checkmark" size={17} color="#FFFFFF" />
                  <Text style={styles.masteredText}>Mark Mastered (+15 XP)</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.navCircle} onPress={handleNextWord} activeOpacity={0.8}>
              <Ionicons name="arrow-forward" size={18} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {relatedSynonyms.length > 0 && (
        <View style={styles.relatedSection}>
          <Text style={styles.fieldEyebrow}>RELATED TERMS</Text>
          <View style={styles.chipsRow}>
            {relatedSynonyms.map((w, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.relatedChip}
                onPress={() => handleSearch(w)}
                activeOpacity={0.78}
              >
                <Text style={styles.relatedChipText}>{w}</Text>
              </TouchableOpacity>
            ))}
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

  /* CORPORATE HEADER & PROGRESS */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerRowEmbedded: {
    marginBottom: 7,
  },
  headerTextBlock: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    fontFamily: THEME.fonts.bold,
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  pctStat: {
    fontFamily: THEME.fonts.bold,
    fontSize: 12,
    color: THEME.colors.primaryGlow,
  },
  progressTrack: {
    width: '100%',
    height: 2,
    borderRadius: 1,
    backgroundColor: '#221F33',
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    borderRadius: 1,
  },

  /* SEARCH BAR */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151422',
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
    gap: 8,
  },
  searchBarActive: {
    borderColor: 'rgba(167, 139, 250, 0.42)',
  },
  searchInput: {
    flex: 1,
    fontFamily: THEME.fonts.bodyMedium,
    color: '#FFFFFF',
    fontSize: 13.5,
    paddingVertical: 7,
  },
  searchBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 10,
  },
  searchBtnDisabled: {
    backgroundColor: '#221F33',
  },
  searchBtnText: {
    fontFamily: THEME.fonts.bold,
    color: '#FFFFFF',
    fontSize: 12,
  },
  searchBtnTextMuted: {
    color: '#6E6A85',
  },
  errorStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 2.5,
    borderLeftColor: THEME.colors.gold,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 12,
    color: THEME.colors.gold,
    flex: 1,
  },

  /* SEGMENTED FILTER */
  filterTrack: {
    flexDirection: 'row',
    backgroundColor: '#14131E',
    borderRadius: 11,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 16,
  },
  filterSegment: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterSegmentActive: {
    backgroundColor: '#231E3A',
  },
  filterText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 11.5,
    color: THEME.colors.textMuted,
  },
  filterTextActive: {
    fontFamily: THEME.fonts.bold,
    color: '#FFFFFF',
  },

  /* EMPTY STATE */
  emptyState: {
    alignItems: 'center',
    paddingVertical: 42,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 15.5,
    color: '#FFFFFF',
  },
  emptySub: {
    fontFamily: THEME.fonts.body,
    fontSize: 12.5,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },

  /* METADATA LINE */
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  cardCounter: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: THEME.colors.textMuted,
    letterSpacing: 0.9,
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  masteredStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  masteredDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.primaryGlow,
  },
  masteredStatusText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.primaryGlow,
  },
  cefrLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10.5,
    color: THEME.colors.textSecondary,
    letterSpacing: 0.6,
  },

  /* EXECUTIVE WORD SHEET */
  wordSheet: {
    backgroundColor: '#151422',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sheetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  posEyebrow: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10.5,
    color: THEME.colors.primaryGlow,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  audioBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(127, 67, 254, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioBtnActive: {
    backgroundColor: THEME.colors.primary,
  },
  wordTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 28,
    color: '#FFFFFF',
    marginTop: 8,
    letterSpacing: -0.2,
  },
  wordPhonetic: {
    fontFamily: THEME.fonts.body,
    fontSize: 13.5,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  revealPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 26,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  revealText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12.5,
    color: THEME.colors.textMuted,
  },
  detailsStack: {
    marginTop: 16,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    marginBottom: 14,
  },
  fieldEyebrow: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textMuted,
    letterSpacing: 0.9,
    marginBottom: 4,
  },
  defBody: {
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 14.5,
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 14,
  },
  tamilStrip: {
    borderLeftWidth: 2.5,
    borderLeftColor: THEME.colors.primary,
    paddingLeft: 12,
    marginBottom: 14,
  },
  tamilBody: {
    fontFamily: THEME.fonts.tamilMedium,
    fontSize: 13.5,
    color: '#EFEBFD',
    lineHeight: 23,
  },
  exampleBody: {
    fontFamily: THEME.fonts.body,
    fontSize: 13,
    color: '#C9C5DE',
    lineHeight: 20,
  },
  synonymsWrap: {
    marginTop: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 4,
  },
  synonymChip: {
    backgroundColor: 'rgba(127, 67, 254, 0.14)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  synonymChipText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12,
    color: '#C4B5FD',
  },

  /* ACTION BAR */
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  navCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#151422',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  masterBtnWrap: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  masteredGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 42,
    borderRadius: 12,
  },
  masteredText: {
    fontFamily: THEME.fonts.bold,
    color: '#FFFFFF',
    fontSize: 13,
  },
  reviewAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#1A172D',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.35)',
  },
  reviewAgainText: {
    fontFamily: THEME.fonts.bold,
    color: '#C4B5FD',
    fontSize: 13,
  },

  /* RELATED TERMS */
  relatedSection: {
    marginTop: 22,
  },
  relatedChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.045)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  relatedChipText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12,
    color: '#D5D0E6',
  },
});
