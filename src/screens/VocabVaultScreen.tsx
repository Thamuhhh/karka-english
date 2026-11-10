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
import { THEME } from '../constants/theme';
import { UserStats, WordDefinition } from '../types';
import { STARTER_VOCABULARY, fetchWordDetails } from '../api/dictionary';
import { fetchRelatedWords } from '../api/datamuse';
import { speakText, playRemoteAudio, stopAllAudio } from '../services/ttsService';
import {
  loadVocabularyList,
  saveVocabularyList,
  toggleSavedWord,
} from '../services/storageService';
import { playSoundEffect } from '../services/soundEffectsService';

interface VocabVaultScreenProps {
  stats?: UserStats;
  onStatsUpdate?: (stats: UserStats) => void;
  embedded?: boolean;
}

type LexiconTab = 'all' | 'saved';

const MAX_CONTENT_WIDTH = 480;

function mergeVocabularyEntries(cached: WordDefinition[]): WordDefinition[] {
  const seen = new Set<string>();
  const merged: WordDefinition[] = [];
  for (const item of [...cached, ...STARTER_VOCABULARY]) {
    const key = item.word.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}

export const VocabVaultScreen: React.FC<VocabVaultScreenProps> = ({
  stats,
  onStatsUpdate,
  embedded = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [wordList, setWordList] = useState<WordDefinition[]>(STARTER_VOCABULARY);
  const [activeTab, setActiveTab] = useState<LexiconTab>('all');
  const [expandedWord, setExpandedWord] = useState<string | null>(
    STARTER_VOCABULARY[0]?.word.toLowerCase() || null
  );
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const [relatedSynonyms, setRelatedSynonyms] = useState<string[]>([]);

  useEffect(() => {
    loadVocabularyList().then((loaded) => {
      setWordList(mergeVocabularyEntries(loaded));
    });
    return () => {
      stopAllAudio();
    };
  }, []);

  const savedSet = useMemo(() => {
    const s = new Set((stats?.masteredWords || []).map((w) => w.toLowerCase()));
    wordList.forEach((w) => {
      if (w.memorized) s.add(w.word.toLowerCase());
    });
    return s;
  }, [stats?.masteredWords, wordList]);

  const displayedWords = useMemo(() => {
    const base =
      activeTab === 'saved'
        ? wordList.filter((w) => savedSet.has(w.word.toLowerCase()))
        : wordList;

    const query = searchQuery.trim().toLowerCase();
    if (!query) return base;

    return base.filter(
      (w) =>
        w.word.toLowerCase().includes(query) ||
        w.definition.toLowerCase().includes(query)
    );
  }, [wordList, activeTab, savedSet, searchQuery]);

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
        setActiveTab('all');
        setSearchQuery('');
        setExpandedWord(details.word.toLowerCase());

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

  const handlePlayWordAudio = async (entry: WordDefinition) => {
    const key = entry.word.toLowerCase();
    setPlayingWord(key);
    if (entry.audioUrl) {
      await playRemoteAudio(entry.audioUrl, () => setPlayingWord(null), entry.word);
    } else {
      await speakText(entry.word, () => setPlayingWord(null));
    }
  };

  const handleToggleBookmark = async (word: string) => {
    const { stats: updatedStats, saved } = await toggleSavedWord(word);
    playSoundEffect(saved ? 'success' : 'button');
    onStatsUpdate?.(updatedStats);
    const clean = word.trim().toLowerCase();
    setWordList((prev) =>
      prev.map((w) => (w.word.toLowerCase() === clean ? { ...w, memorized: saved } : w))
    );
  };

  const handleToggleExpand = (word: string) => {
    const key = word.toLowerCase();
    setExpandedWord((prev) => (prev === key ? null : key));
  };

  const hasQuery = searchQuery.trim().length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, embedded && styles.contentEmbedded]}
      showsVerticalScrollIndicator={false}
    >
      {/* Corporate Executive Lexicon Header */}
      <View style={[styles.headerRow, embedded && styles.headerRowEmbedded]}>
        <View style={styles.headerTextBlock}>
          {!embedded && <Text style={styles.title}>Corporate Lexicon</Text>}
          <Text style={styles.subtitle}>Executive vocabulary &amp; live dictionary</Text>
        </View>
        <Text style={styles.savedCountStat}>{savedSet.size} Saved</Text>
      </View>

      {/* Search & Live Lookup Command Bar */}
      <View style={[styles.searchBar, hasQuery && styles.searchBarActive]}>
        <Ionicons name="search" size={16} color={THEME.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Filter directory or look up any word..."
          placeholderTextColor={THEME.colors.textMuted}
          value={searchQuery}
          onChangeText={(txt) => {
            setSearchQuery(txt);
            if (searchError) setSearchError(null);
          }}
          onSubmitEditing={() => handleSearch()}
          returnKeyType="search"
        />
        {hasQuery && !isSearching && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setSearchError(null);
            }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="close-circle" size={16} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        )}
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

      {/* Clean Corporate Segmented Switcher: All Terms | Saved */}
      <View style={styles.segmentTrack}>
        {(
          [
            { id: 'all', label: `All Terms (${wordList.length})` },
            { id: 'saved', label: `Saved (${savedSet.size})` },
          ] as { id: LexiconTab; label: string }[]
        ).map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.82}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Related Terms (After Live Dictionary Lookup) */}
      {relatedSynonyms.length > 0 && (
        <View style={styles.relatedStrip}>
          <Text style={styles.eyebrowLabel}>RELATED TERMS</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.relatedScroll}
          >
            {relatedSynonyms.map((w, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.relatedChip}
                onPress={() => handleSearch(w)}
                activeOpacity={0.78}
              >
                <Text style={styles.relatedChipText}>+{w}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Expandable Corporate Word Directory */}
      {displayedWords.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name={activeTab === 'saved' ? 'bookmark-outline' : 'search-outline'}
            size={28}
            color={THEME.colors.primaryGlow}
          />
          <Text style={styles.emptyTitle}>
            {activeTab === 'saved' && !hasQuery
              ? 'No saved words yet'
              : `No matching entries`}
          </Text>
          <Text style={styles.emptySub}>
            {activeTab === 'saved' && !hasQuery
              ? 'Tap the bookmark icon on any term to save it here for quick reference.'
              : 'Tap Lookup above to fetch the full definition from the English dictionary.'}
          </Text>
        </View>
      ) : (
        <View style={styles.directoryList}>
          {displayedWords.map((entry, idx) => {
            const key = entry.word.toLowerCase();
            const isExpanded = expandedWord === key;
            const isSaved = savedSet.has(key);
            const isPlaying = playingWord === key;

            return (
              <View
                key={`${key}-${idx}`}
                style={[
                  styles.entryRow,
                  idx > 0 && styles.entryRowHairline,
                  isExpanded && styles.entryRowExpanded,
                ]}
              >
                {/* Summary Row */}
                <TouchableOpacity
                  style={styles.entrySummary}
                  onPress={() => handleToggleExpand(entry.word)}
                  activeOpacity={0.85}
                >
                  <View style={styles.entryMainCol}>
                    <View style={styles.entryTitleLine}>
                      <Text style={styles.entryWord}>{entry.word}</Text>
                      <Text style={styles.entryPos}>{entry.partOfSpeech}</Text>
                      <Text style={styles.entryCefr}>{entry.cefrLevel}</Text>
                    </View>
                    {!isExpanded && (
                      <Text style={styles.entryPreview} numberOfLines={1}>
                        {entry.definition}
                      </Text>
                    )}
                  </View>

                  <View style={styles.entryQuickActions}>
                    <TouchableOpacity
                      style={[styles.iconActionBtn, isPlaying && styles.iconActionBtnActive]}
                      onPress={() => handlePlayWordAudio(entry)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons
                        name={isPlaying ? 'volume-high' : 'volume-medium-outline'}
                        size={16}
                        color={isPlaying ? '#FFFFFF' : THEME.colors.primaryGlow}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.iconActionBtn}
                      onPress={() => handleToggleBookmark(entry.word)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons
                        name={isSaved ? 'bookmark' : 'bookmark-outline'}
                        size={16}
                        color={isSaved ? THEME.colors.primaryGlow : THEME.colors.textMuted}
                      />
                    </TouchableOpacity>

                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={THEME.colors.textMuted}
                    />
                  </View>
                </TouchableOpacity>

                {/* Expanded Executive Entry Details */}
                {isExpanded && (
                  <View style={styles.expandedBody}>
                    {!!entry.phonetic && (
                      <Text style={styles.phoneticText}>{entry.phonetic}</Text>
                    )}

                    <Text style={styles.fieldEyebrow}>DEFINITION</Text>
                    <Text style={styles.defBody}>{entry.definition}</Text>

                    <View style={styles.tamilStrip}>
                      <Text style={styles.fieldEyebrow}>TAMIL MEANING</Text>
                      <Text style={styles.tamilBody}>{entry.tamilMeaning}</Text>
                    </View>

                    <Text style={styles.fieldEyebrow}>EXECUTIVE USAGE</Text>
                    <Text style={styles.exampleBody}>"{entry.example}"</Text>

                    {entry.synonyms.length > 0 && (
                      <View style={styles.synonymsWrap}>
                        <Text style={styles.fieldEyebrow}>SYNONYMS</Text>
                        <View style={styles.chipsRow}>
                          {entry.synonyms.map((syn, sIdx) => (
                            <TouchableOpacity
                              key={sIdx}
                              style={styles.synonymChip}
                              onPress={() => handleSearch(syn)}
                              activeOpacity={0.78}
                            >
                              <Text style={styles.synonymChipText}>{syn}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
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

  /* CORPORATE HEADER */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerRowEmbedded: {
    marginBottom: 10,
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
  savedCountStat: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11.5,
    color: THEME.colors.primaryGlow,
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

  /* VIEW SEGMENT */
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: '#14131E',
    borderRadius: 11,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#231E3A',
  },
  segmentText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  segmentTextActive: {
    fontFamily: THEME.fonts.bold,
    color: '#FFFFFF',
  },

  /* RELATED TERMS */
  relatedStrip: {
    marginBottom: 12,
  },
  eyebrowLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textMuted,
    letterSpacing: 0.9,
    marginBottom: 6,
  },
  relatedScroll: {
    gap: 8,
  },
  relatedChip: {
    backgroundColor: 'rgba(127, 67, 254, 0.14)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  relatedChipText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12,
    color: '#C4B5FD',
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

  /* DIRECTORY ROWS */
  directoryList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  entryRow: {
    paddingVertical: 13,
    paddingHorizontal: 4,
  },
  entryRowHairline: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  entryRowExpanded: {
    backgroundColor: 'rgba(21, 20, 34, 0.72)',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginVertical: 4,
    borderTopWidth: 0,
  },
  entrySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  entryMainCol: {
    flex: 1,
    minWidth: 0,
  },
  entryTitleLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flexWrap: 'wrap',
  },
  entryWord: {
    fontFamily: THEME.fonts.bold,
    fontSize: 16.5,
    color: '#FFFFFF',
  },
  entryPos: {
    fontFamily: THEME.fonts.medium,
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  entryCefr: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10.5,
    color: THEME.colors.primaryGlow,
    letterSpacing: 0.4,
  },
  entryPreview: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  entryQuickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconActionBtnActive: {
    backgroundColor: THEME.colors.primary,
  },

  /* EXPANDED EXECUTIVE DETAILS */
  expandedBody: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  phoneticText: {
    fontFamily: THEME.fonts.body,
    fontSize: 12.5,
    color: THEME.colors.textSecondary,
    marginBottom: 10,
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
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 21,
    marginBottom: 12,
  },
  tamilStrip: {
    borderLeftWidth: 2.5,
    borderLeftColor: THEME.colors.primary,
    paddingLeft: 11,
    marginBottom: 12,
  },
  tamilBody: {
    fontFamily: THEME.fonts.tamilMedium,
    fontSize: 13.5,
    color: '#EFEBFD',
    lineHeight: 22,
  },
  exampleBody: {
    fontFamily: THEME.fonts.body,
    fontSize: 13,
    color: '#C9C5DE',
    lineHeight: 19,
  },
  synonymsWrap: {
    marginTop: 12,
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
});
