import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { SUPERNOVA_IMAGES } from '../constants/supernovaAssets';
import { SupernovaClass } from '../constants/curriculum';
import { speakText, stopAllAudio } from '../services/ttsService';
import { addXp, incrementMetric } from '../services/storageService';
import { analyzeSentenceGrammar } from '../api/supernovaAi';
import { playSoundEffect } from '../services/soundEffectsService';

interface LessonPlayerProps {
  lesson: SupernovaClass;
  onClose: () => void;
  onComplete: (classId: string) => void;
}

type SlideType = 'rule' | 'jumble' | 'translation' | 'speaking' | 'victory';

export const LessonPlayerScreen: React.FC<LessonPlayerProps> = ({
  lesson,
  onClose,
  onComplete,
}) => {
  const [currentSlide, setCurrentSlide] = useState<SlideType>('rule');
  const [hearts, setHearts] = useState(5);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Slide 2: Jumble State
  const [assembledWords, setAssembledWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([...lesson.jumble.scrambledWords]);
  const [jumbleChecked, setJumbleChecked] = useState(false);
  const [isJumbleCorrect, setIsJumbleCorrect] = useState(false);

  // Slide 3: Translation State
  const [selectedTransIdx, setSelectedTransIdx] = useState<number | null>(null);
  const [transChecked, setTransChecked] = useState(false);

  // Slide 4: Speaking State
  const [spokenText, setSpokenText] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [speakingFeedback, setSpeakingFeedback] = useState<any>(null);

  const handlePlayVoice = (text: string, id: string) => {
    setPlayingAudioId(id);
    speakText(text, () => setPlayingAudioId(null));
  };

  // Exit Confirmation
  const handleExit = () => {
    Alert.alert(
      'Leave Lesson?',
      'You are in the middle of a class! If you leave now, your lesson progress will not be saved.',
      [
        { text: 'Keep Learning', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            stopAllAudio();
            onClose();
          },
        },
      ]
    );
  };

  // Jumble Handlers
  const handleTapBankWord = (word: string, index: number) => {
    if (jumbleChecked) return;
    playSoundEffect('button');
    setAssembledWords([...assembledWords, word]);
    const updated = [...availableWords];
    updated.splice(index, 1);
    setAvailableWords(updated);
  };

  const handleTapSlotWord = (word: string, index: number) => {
    if (jumbleChecked) return;
    playSoundEffect('buttonV2');
    const updated = [...assembledWords];
    updated.splice(index, 1);
    setAssembledWords(updated);
    setAvailableWords([...availableWords, word]);
  };

  const handleCheckJumble = () => {
    const userStr = assembledWords.join(' ').trim().toLowerCase();
    const correctStr = lesson.jumble.correctWords.join(' ').trim().toLowerCase();
    const isOk = userStr === correctStr;
    setIsJumbleCorrect(isOk);
    setJumbleChecked(true);
    if (isOk) {
      playSoundEffect('success');
    } else {
      playSoundEffect('error');
      setHearts((prev) => Math.max(1, prev - 1));
    }
  };

  const handleCheckTranslation = () => {
    if (selectedTransIdx === null) return;
    setTransChecked(true);
    if (selectedTransIdx === lesson.translation.correctOptionIndex) {
      playSoundEffect('chime');
    } else {
      playSoundEffect('error');
      setHearts((prev) => Math.max(1, prev - 1));
    }
  };

  const handleSubmitSpeaking = async () => {
    const text = spokenText.trim();
    if (!text || isEvaluating) return;

    setIsEvaluating(true);
    try {
      const feedback = await analyzeSentenceGrammar(text);
      setSpeakingFeedback(feedback);
      if (!feedback.hasErrors) {
        playSoundEffect('success');
      }
    } catch (e) {
      console.warn('Speech eval error:', e);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleFinishLesson = async () => {
    playSoundEffect('finish');
    await addXp(lesson.xpReward);
    await incrementMetric('wordsMastered', 3);
    onComplete(lesson.id);
    setCurrentSlide('victory');
  };

  // Calculate Progress Percentage for Top Bar
  const getProgressPercent = () => {
    switch (currentSlide) {
      case 'rule':
        return '25%';
      case 'jumble':
        return '50%';
      case 'translation':
        return '75%';
      case 'speaking':
        return '90%';
      case 'victory':
        return '100%';
    }
  };

  return (
    <View style={styles.fullscreen}>
      {/* Top Header Bar: Exit X, Progress Bar, Hearts */}
      {currentSlide !== 'victory' && (
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleExit} style={styles.closeBtn}>
            <Ionicons name="close" size={26} color={THEME.colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: getProgressPercent() }]} />
          </View>

          <View style={styles.heartRow}>
            <Ionicons name="heart" size={20} color="#EF4444" />
            <Text style={styles.heartCount}>{hearts}</Text>
          </View>
        </View>
      )}

      {/* Main Content Area */}
      <ScrollView style={styles.slideScroll} contentContainerStyle={styles.slideContent}>
        {/* ========================================================== */}
        {/* SLIDE 1: PATTERN & TAMIL MENTAL MODEL */}
        {/* ========================================================== */}
        {currentSlide === 'rule' && (
          <View style={styles.slideCard}>
            <View style={styles.slideHeaderPill}>
              <MaterialCommunityIcons name="lightbulb-on" size={18} color={THEME.colors.gold} />
              <Text style={styles.slideHeaderPillText}>PATTERN 1 OF 4 • CORE RULE</Text>
            </View>

            <Text style={styles.lessonBigTitle}>{lesson.rule.heading}</Text>
            <Text style={styles.ruleExplainText}>{lesson.rule.englishExplanation}</Text>

            {/* Tamil Mental Model Box */}
            <View style={styles.tamilModelCard}>
              <View style={styles.tamilModelHeader}>
                <MaterialCommunityIcons name="translate" size={18} color={THEME.colors.gold} />
                <Text style={styles.tamilModelTitle}>தமிழ் சிந்தனை முறை (Mental Model):</Text>
              </View>
              <Text style={styles.tamilModelBody}>{lesson.rule.tamilMentalModel}</Text>
            </View>

            {/* Do's and Don'ts Comparison */}
            <View style={styles.comparisonBox}>
              <View style={styles.wrongBox}>
                <View style={styles.statusRow}>
                  <Ionicons name="close-circle" size={18} color={THEME.colors.error} />
                  <Text style={styles.wrongLabel}>AVOID THIS (தவறு):</Text>
                </View>
                <Text style={styles.wrongSentence}>"{lesson.rule.doAndDont.wrong}"</Text>
              </View>

              <View style={styles.rightBox}>
                <View style={styles.statusRow}>
                  <Ionicons name="checkmark-circle" size={18} color={THEME.colors.success} />
                  <Text style={styles.rightLabel}>SAY THIS INSTEAD (சரி):</Text>
                  <TouchableOpacity
                    style={styles.speakerBtn}
                    onPress={() => handlePlayVoice(lesson.rule.doAndDont.right, 'right-audio')}
                  >
                    <Ionicons
                      name={playingAudioId === 'right-audio' ? 'volume-high' : 'volume-medium-outline'}
                      size={20}
                      color={THEME.colors.primaryGlow}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.rightSentence}>"{lesson.rule.doAndDont.right}"</Text>
              </View>

              <Text style={styles.whyNote}>💡 {lesson.rule.doAndDont.whyTamil}</Text>
            </View>
          </View>
        )}

        {/* ========================================================== */}
        {/* SLIDE 2: SUPERNOVA SENTENCE SCRAMBLE (WORD JUMBLE) */}
        {/* ========================================================== */}
        {currentSlide === 'jumble' && (
          <View style={styles.slideCard}>
            <View style={[styles.slideHeaderPill, { borderColor: THEME.colors.secondary }]}>
              <MaterialCommunityIcons name="puzzle" size={18} color={THEME.colors.secondary} />
              <Text style={[styles.slideHeaderPillText, { color: THEME.colors.secondary }]}>
                PATTERN 2 OF 4 • SENTENCE SCRAMBLE
              </Text>
            </View>

            <Text style={styles.lessonBigTitle}>Assemble the English Sentence</Text>
            <Text style={styles.promptSubtitle}>Tap the word tiles below in the natural English order:</Text>

            {/* Tamil Prompt Card */}
            <View style={styles.tamilThoughtBanner}>
              <Text style={styles.tamilThoughtLabel}>TAMIL THOUGHT:</Text>
              <Text style={styles.tamilThoughtText}>{lesson.jumble.tamilSentence}</Text>
            </View>

            {/* Assembled Sentence Slot Line */}
            <View style={styles.slotLineArea}>
              <Text style={styles.slotHint}>ASSEMBLED SENTENCE:</Text>
              <View style={styles.wordsWrapRow}>
                {assembledWords.length === 0 ? (
                  <Text style={styles.emptySlotPlaceholder}>Tap words below to place them here...</Text>
                ) : (
                  assembledWords.map((word, wIdx) => (
                    <TouchableOpacity
                      key={wIdx}
                      style={styles.slotTile}
                      onPress={() => handleTapSlotWord(word, wIdx)}
                    >
                      <Text style={styles.slotTileText}>{word}</Text>
                      <Ionicons name="close" size={12} color={THEME.colors.textSecondary} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>

            {/* Word Bank Area */}
            <View style={styles.wordBankWrap}>
              <View style={styles.wordsWrapRow}>
                {availableWords.map((word, bIdx) => (
                  <TouchableOpacity
                    key={bIdx}
                    style={styles.bankTile}
                    onPress={() => handleTapBankWord(word, bIdx)}
                  >
                    <Text style={styles.bankTileText}>{word}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ========================================================== */}
        {/* SLIDE 3: GUIDED TRANSLATION */}
        {/* ========================================================== */}
        {currentSlide === 'translation' && (
          <View style={styles.slideCard}>
            <View style={[styles.slideHeaderPill, { borderColor: THEME.colors.gold }]}>
              <MaterialCommunityIcons name="translate" size={18} color={THEME.colors.gold} />
              <Text style={[styles.slideHeaderPillText, { color: THEME.colors.gold }]}>
                PATTERN 3 OF 4 • GUIDED TRANSLATION
              </Text>
            </View>

            <Text style={styles.lessonBigTitle}>Choose Natural English</Text>
            <Text style={styles.promptSubtitle}>How would a native speaker translate this?</Text>

            <View style={styles.tamilThoughtBanner}>
              <Text style={styles.tamilThoughtLabel}>TAMIL SENTENCE:</Text>
              <Text style={styles.tamilThoughtText}>{lesson.translation.tamilPrompt}</Text>
            </View>

            <View style={styles.optionsCol}>
              {lesson.translation.options.map((opt, oIdx) => {
                const isSelected = selectedTransIdx === oIdx;
                const isCorrect = oIdx === lesson.translation.correctOptionIndex;

                let optStyle: any = styles.transOptionCard;
                if (transChecked) {
                  if (isCorrect) optStyle = [styles.transOptionCard, styles.cardCorrect];
                  else if (isSelected) optStyle = [styles.transOptionCard, styles.cardWrong];
                } else if (isSelected) {
                  optStyle = [styles.transOptionCard, styles.cardSelected];
                }

                return (
                  <TouchableOpacity
                    key={oIdx}
                    style={optStyle}
                    onPress={() => {
                      if (!transChecked) setSelectedTransIdx(oIdx);
                    }}
                  >
                    <View style={styles.optionRadioCircle}>
                      {isSelected && <View style={styles.optionRadioDot} />}
                    </View>
                    <Text style={styles.transOptionCardText}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ========================================================== */}
        {/* SLIDE 4: FREE SPEAKING WITH MISS NOVA */}
        {/* ========================================================== */}
        {currentSlide === 'speaking' && (
          <View style={styles.slideCard}>
            <View style={[styles.slideHeaderPill, { borderColor: THEME.colors.primaryGlow }]}>
              <MaterialCommunityIcons name="microphone" size={18} color={THEME.colors.primaryGlow} />
              <Text style={[styles.slideHeaderPillText, { color: THEME.colors.primaryGlow }]}>
                PATTERN 4 OF 4 • FREE SPEAKING
              </Text>
            </View>

            <Text style={styles.lessonBigTitle}>Speak with Miss Nova</Text>
            <Text style={styles.promptSubtitle}>{lesson.speakingChallenge.prompt}</Text>

            {/* Miss Nova Card */}
            <View style={styles.missNovaBubbleCard}>
              <View style={styles.missNovaHeaderRow}>
                <View style={styles.missNovaAvatarSmall}>
                  <Image source={SUPERNOVA_IMAGES.novaAvatar} style={styles.missNovaAvatarSmallImg} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.missNovaTitle}>Miss Nova (AI Tutor)</Text>
                  <Text style={styles.missNovaSub}>Listening & assessing your tone</Text>
                </View>
                <TouchableOpacity
                  style={styles.speakerBtn}
                  onPress={() => handlePlayVoice(lesson.speakingChallenge.missNovaQuestion, 'nova-q')}
                >
                  <Ionicons
                    name={playingAudioId === 'nova-q' ? 'volume-high' : 'volume-medium-outline'}
                    size={22}
                    color={THEME.colors.primaryGlow}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.missNovaSpeechText}>"{lesson.speakingChallenge.missNovaQuestion}"</Text>
            </View>

            {/* Suggested Answer Chips */}
            <Text style={styles.suggestLabel}>SUGGESTED RESPONSES (TAP TO USE):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {lesson.speakingChallenge.suggestedAnswers.map((ans, aIdx) => (
                <TouchableOpacity
                  key={aIdx}
                  style={styles.suggestPill}
                  onPress={() => setSpokenText(ans)}
                >
                  <Text style={styles.suggestPillText} numberOfLines={1}>"{ans}"</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Text Input for Speech */}
            <TextInput
              style={styles.speakingInput}
              placeholder="Speak or type your answer in English..."
              placeholderTextColor={THEME.colors.textMuted}
              value={spokenText}
              onChangeText={setSpokenText}
              multiline
              numberOfLines={3}
            />

            {/* Real-Time AI Feedback Result */}
            {speakingFeedback && (
              <View style={styles.aiResultCard}>
                <View style={styles.aiScoreRow}>
                  <Ionicons name="sparkles" size={18} color={THEME.colors.secondary} />
                  <Text style={styles.aiScoreText}>
                    Fluency Score: {speakingFeedback.fluencyScore}/100
                  </Text>
                </View>
                <Text style={styles.aiExplainText}>{speakingFeedback.explanation}</Text>
                <Text style={styles.aiTamilExplainText}>💡 {speakingFeedback.tamilExplanation}</Text>
                <View style={styles.nativeRephraseBox}>
                  <Text style={styles.nativeLabel}>NATIVE REPHRASING:</Text>
                  <Text style={styles.nativeText}>"{speakingFeedback.nativeIdiomaticVersion}"</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ========================================================== */}
        {/* SLIDE 5: LESSON VICTORY CELEBRATION */}
        {/* ========================================================== */}
        {currentSlide === 'victory' && (
          <View style={styles.victoryContainer}>
            <View style={styles.victoryTrophyCircle}>
              <MaterialCommunityIcons name="trophy-award" size={64} color={THEME.colors.gold} />
            </View>

            <Text style={styles.victoryTitle}>Lesson Complete!</Text>
            <Text style={styles.victorySubtitle}>
              You crushed "{lesson.title}" using the SuperFluency method!
            </Text>

            <View style={styles.statsCardGrid}>
              <View style={styles.victoryStatCard}>
                <Ionicons name="sparkles" size={24} color={THEME.colors.secondary} />
                <Text style={styles.victoryStatVal}>+{lesson.xpReward} XP</Text>
                <Text style={styles.victoryStatLabel}>Stardust Earned</Text>
              </View>
              <View style={styles.victoryStatCard}>
                <MaterialCommunityIcons name="fire" size={24} color={THEME.colors.gold} />
                <Text style={styles.victoryStatVal}>Active 🔥</Text>
                <Text style={styles.victoryStatLabel}>Streak Kept</Text>
              </View>
              <View style={styles.victoryStatCard}>
                <Ionicons name="checkmark-done-circle" size={24} color={THEME.colors.success} />
                <Text style={styles.victoryStatVal}>100%</Text>
                <Text style={styles.victoryStatLabel}>Accuracy</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.finishContinueBtn}
              onPress={() => {
                stopAllAudio();
                onClose();
              }}
            >
              <Text style={styles.finishContinueBtnText}>CONTINUE TO ROADMAP</Text>
              <Ionicons name="arrow-forward" size={18} color={THEME.colors.text} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ========================================================== */}
      {/* BOTTOM ACTION / CHECK DRAWER */}
      {/* ========================================================== */}
      {currentSlide !== 'victory' && (
        <View style={styles.bottomActionDrawer}>
          {/* Slide 1 Continue */}
          {currentSlide === 'rule' && (
            <TouchableOpacity
              style={styles.actionButtonPrimary}
              onPress={() => setCurrentSlide('jumble')}
            >
              <Text style={styles.actionBtnText}>CONTINUE ➡️</Text>
            </TouchableOpacity>
          )}

          {/* Slide 2 Check Jumble */}
          {currentSlide === 'jumble' && (
            <>
              {jumbleChecked ? (
                <View style={styles.feedbackDrawerContent}>
                  <View style={styles.feedbackHeadlineRow}>
                    <Ionicons
                      name={isJumbleCorrect ? 'checkmark-circle' : 'close-circle'}
                      size={24}
                      color={isJumbleCorrect ? THEME.colors.success : THEME.colors.error}
                    />
                    <Text
                      style={[
                        styles.feedbackHeadline,
                        { color: isJumbleCorrect ? THEME.colors.success : THEME.colors.error },
                      ]}
                    >
                      {isJumbleCorrect ? 'Semma! You got it right! 🎉' : 'Incorrect sentence order!'}
                    </Text>
                  </View>
                  {!isJumbleCorrect && (
                    <Text style={styles.jumbleCorrectionNote}>💡 Correct: {lesson.jumble.correctWords.join(' ')}</Text>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButtonPrimary, { marginTop: 10 }]}
                    onPress={() => {
                      if (isJumbleCorrect) {
                        setCurrentSlide('translation');
                      } else {
                        // Reset jumble
                        setAvailableWords([...lesson.jumble.scrambledWords]);
                        setAssembledWords([]);
                        setJumbleChecked(false);
                      }
                    }}
                  >
                    <Text style={styles.actionBtnText}>
                      {isJumbleCorrect ? 'CONTINUE ➡️' : 'TRY AGAIN 🔄'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButtonPrimary, assembledWords.length === 0 && styles.btnDisabled]}
                  onPress={handleCheckJumble}
                  disabled={assembledWords.length === 0}
                >
                  <Text style={styles.actionBtnText}>CHECK SENTENCE</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Slide 3 Check Translation */}
          {currentSlide === 'translation' && (
            <>
              {transChecked ? (
                <View style={styles.feedbackDrawerContent}>
                  <View style={styles.feedbackHeadlineRow}>
                    <Ionicons
                      name={
                        selectedTransIdx === lesson.translation.correctOptionIndex
                          ? 'checkmark-circle'
                          : 'close-circle'
                      }
                      size={24}
                      color={
                        selectedTransIdx === lesson.translation.correctOptionIndex
                          ? THEME.colors.success
                          : THEME.colors.error
                      }
                    />
                    <Text
                      style={[
                        styles.feedbackHeadline,
                        {
                          color:
                            selectedTransIdx === lesson.translation.correctOptionIndex
                              ? THEME.colors.success
                              : THEME.colors.error,
                        },
                      ]}
                    >
                      {selectedTransIdx === lesson.translation.correctOptionIndex
                        ? 'Great Job! Exactly right! 🌟'
                        : 'Review the explanation:'}
                    </Text>
                  </View>
                  <Text style={styles.jumbleCorrectionNote}>{lesson.translation.explanation}</Text>
                  <Text style={styles.jumbleTamilNote}>💡 {lesson.translation.tamilExplanation}</Text>
                  <TouchableOpacity
                    style={[styles.actionButtonPrimary, { marginTop: 10 }]}
                    onPress={() => setCurrentSlide('speaking')}
                  >
                    <Text style={styles.actionBtnText}>CONTINUE TO SPEAKING 🎙️</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButtonPrimary, selectedTransIdx === null && styles.btnDisabled]}
                  onPress={handleCheckTranslation}
                  disabled={selectedTransIdx === null}
                >
                  <Text style={styles.actionBtnText}>CHECK TRANSLATION</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Slide 4 Speaking Action */}
          {currentSlide === 'speaking' && (
            <>
              {speakingFeedback ? (
                <TouchableOpacity
                  style={[styles.actionButtonPrimary, { backgroundColor: THEME.colors.success }]}
                  onPress={handleFinishLesson}
                >
                  <Ionicons name="trophy" size={20} color={THEME.colors.text} style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnText}>FINISH & CLAIM +{lesson.xpReward} XP</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButtonPrimary, !spokenText.trim() && styles.btnDisabled]}
                  onPress={handleSubmitSpeaking}
                  disabled={!spokenText.trim() || isEvaluating}
                >
                  {isEvaluating ? (
                    <ActivityIndicator size="small" color={THEME.colors.text} />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={18} color={THEME.colors.text} style={{ marginRight: 6 }} />
                      <Text style={styles.actionBtnText}>EVALUATE WITH MISS NOVA</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  closeBtn: {
    padding: 4,
  },
  progressBarTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME.colors.surfaceElevated,
    marginHorizontal: 14,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.colors.accent,
    borderRadius: 5,
  },
  heartRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#EF4444',
    marginLeft: 4,
  },
  slideScroll: {
    flex: 1,
  },
  slideContent: {
    padding: 18,
    paddingBottom: 40,
  },
  slideCard: {
    gap: 12,
  },
  slideHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: THEME.colors.surfaceCard,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.gold,
  },
  slideHeaderPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.gold,
    letterSpacing: 0.8,
    marginLeft: 6,
  },
  lessonBigTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  ruleExplainText: {
    fontSize: 15,
    color: THEME.colors.text,
    lineHeight: 22,
  },
  promptSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  tamilModelCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: THEME.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    marginVertical: 4,
  },
  tamilModelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tamilModelTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.colors.gold,
    marginLeft: 6,
  },
  tamilModelBody: {
    fontSize: 13,
    color: THEME.colors.text,
    lineHeight: 20,
  },
  comparisonBox: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 10,
  },
  wrongBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  rightBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wrongLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.error,
    marginLeft: 6,
  },
  rightLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.success,
    marginLeft: 6,
    flex: 1,
  },
  wrongSentence: {
    fontSize: 14,
    color: THEME.colors.text,
    fontWeight: '600',
    marginTop: 4,
  },
  rightSentence: {
    fontSize: 14,
    color: THEME.colors.text,
    fontWeight: 'bold',
    marginTop: 4,
  },
  speakerBtn: {
    padding: 2,
  },
  whyNote: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },

  // Jumble Styles
  tamilThoughtBanner: {
    backgroundColor: THEME.colors.surfaceCard,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  tamilThoughtLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.colors.gold,
  },
  tamilThoughtText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginTop: 4,
  },
  slotLineArea: {
    minHeight: 88,
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: THEME.colors.borderLight,
  },
  slotHint: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.colors.textMuted,
    marginBottom: 8,
  },
  emptySlotPlaceholder: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
  },
  wordsWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderBottomWidth: 3,
    borderBottomColor: THEME.colors.primaryBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  slotTileText: {
    color: '#1E1B4B',
    fontSize: 15,
    fontWeight: '800',
  },
  wordBankWrap: {
    paddingVertical: 10,
  },
  bankTile: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderBottomWidth: 4,
    borderBottomColor: '#94A3B8',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bankTileText: {
    color: THEME.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  // Translation Styles
  optionsCol: {
    gap: 10,
    marginTop: 4,
  },
  transOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceCard,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  cardSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  cardCorrect: {
    borderColor: THEME.colors.success,
    backgroundColor: THEME.colors.successBg,
  },
  cardWrong: {
    borderColor: THEME.colors.error,
    backgroundColor: THEME.colors.errorBg,
  },
  optionRadioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: THEME.colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  optionRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME.colors.primary,
  },
  transOptionCardText: {
    fontSize: 14,
    color: THEME.colors.text,
    fontWeight: '600',
    flex: 1,
  },

  // Speaking Styles
  missNovaBubbleCard: {
    backgroundColor: THEME.colors.surfaceCard,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  missNovaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  missNovaAvatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(127, 67, 254, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  missNovaAvatarSmallImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  missNovaTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  missNovaSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  missNovaSpeechText: {
    fontSize: 15,
    fontStyle: 'italic',
    color: THEME.colors.primaryGlow,
    lineHeight: 22,
  },
  suggestLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.colors.textMuted,
    marginTop: 6,
  },
  suggestPill: {
    backgroundColor: THEME.colors.surfaceCard,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginRight: 8,
  },
  suggestPillText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  speakingInput: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: 12,
    padding: 14,
    color: THEME.colors.text,
    fontSize: 14,
    minHeight: 70,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  aiResultCard: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  aiScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiScoreText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.secondary,
    marginLeft: 6,
  },
  aiExplainText: {
    fontSize: 13,
    color: THEME.colors.text,
  },
  aiTamilExplainText: {
    fontSize: 12,
    color: THEME.colors.gold,
  },
  nativeRephraseBox: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  nativeLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.colors.secondary,
  },
  nativeText: {
    fontSize: 13,
    color: THEME.colors.text,
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Victory Styles
  victoryContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  victoryTrophyCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  victoryTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  victorySubtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  statsCardGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 24,
    gap: 8,
  },
  victoryStatCard: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceCard,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  victoryStatVal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginTop: 4,
  },
  victoryStatLabel: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  finishContinueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 28,
    width: '100%',
  },
  finishContinueBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },

  // Bottom Action Drawer
  bottomActionDrawer: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  actionButtonPrimary: {
    backgroundColor: THEME.colors.accent,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: THEME.colors.accentBorder,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  feedbackDrawerContent: {
    gap: 6,
  },
  feedbackHeadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedbackHeadline: {
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  jumbleCorrectionNote: {
    fontSize: 13,
    color: THEME.colors.text,
    marginTop: 2,
  },
  jumbleTamilNote: {
    fontSize: 12,
    color: THEME.colors.gold,
    marginTop: 2,
  },
});

