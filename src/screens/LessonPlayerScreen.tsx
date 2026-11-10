import React, { useState, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../constants/theme';
import { SUPERNOVA_IMAGES } from '../constants/supernovaAssets';
import { SupernovaClass } from '../constants/curriculum';
import { UserStats, GrammarCorrection } from '../types';
import { speakText, stopAllAudio } from '../services/ttsService';
import { analyzeSentenceGrammar } from '../api/supernovaAi';
import { playSoundEffect } from '../services/soundEffectsService';

interface LessonPlayerProps {
  lesson: SupernovaClass;
  initialHearts: number;
  onHeartsChange: (hearts: number) => void;
  onClose: () => void;
  onComplete: (
    classId: string,
    xpReward: number,
    earnedGems: number
  ) => Promise<{
    stats: UserStats;
    awardedXp: number;
    awardedGems: number;
  }>;
}

type SlideType = 'rule' | 'jumble' | 'translation' | 'speaking' | 'victory';

const LESSON_STEPS: Exclude<SlideType, 'victory'>[] = ['rule', 'jumble', 'translation', 'speaking'];
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const MAX_LESSON_WIDTH = 500;

function formatShortLessonTitle(fullTitle: string): string {
  return fullTitle.replace(/^Class\s+\d+:\s*/i, '').trim();
}

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  colors?: readonly [string, string];
  icon?: keyof typeof Ionicons.glyphMap;
  iconLeft?: keyof typeof Ionicons.glyphMap;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  colors = ['#8B5CF6', '#6D28D9'],
  icon,
  iconLeft,
}) => (
  <TouchableOpacity
    style={[styles.primaryBtnOuter, disabled && styles.primaryBtnDisabled]}
    activeOpacity={0.85}
    onPress={onPress}
    disabled={disabled || loading}
  >
    <LinearGradient
      colors={disabled ? ['#2A2740', '#211E33'] : colors}
      style={styles.primaryBtnGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <View style={styles.btnRowContent}>
          {iconLeft && (
            <Ionicons name={iconLeft} size={17} color="#FFFFFF" style={{ marginRight: 8 }} />
          )}
          <Text style={[styles.primaryBtnText, disabled && styles.primaryBtnTextDisabled]}>
            {label}
          </Text>
          {icon && (
            <Ionicons name={icon} size={17} color="#FFFFFF" style={{ marginLeft: 8 }} />
          )}
        </View>
      )}
    </LinearGradient>
  </TouchableOpacity>
);

export const LessonPlayerScreen: React.FC<LessonPlayerProps> = ({
  lesson,
  initialHearts,
  onHeartsChange,
  onClose,
  onComplete,
}) => {
  const [currentSlide, setCurrentSlide] = useState<SlideType>('rule');
  const [hearts, setHearts] = useState(Math.max(0, initialHearts));
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Accuracy & Victory Tracking
  const [checksTotal, setChecksTotal] = useState(0);
  const [checksCorrect, setChecksCorrect] = useState(0);
  const [victorySummary, setVictorySummary] = useState<{
    awardedXp: number;
    awardedGems: number;
    streakDays: number;
    accuracy: number;
  } | null>(null);

  // Slide 2: Jumble State
  const [assembledWords, setAssembledWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([
    ...lesson.jumble.scrambledWords,
  ]);
  const [jumbleChecked, setJumbleChecked] = useState(false);
  const [isJumbleCorrect, setIsJumbleCorrect] = useState(false);

  // Slide 3: Translation State
  const [selectedTransIdx, setSelectedTransIdx] = useState<number | null>(null);
  const [transChecked, setTransChecked] = useState(false);

  // Slide 4: Speaking State
  const [spokenText, setSpokenText] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [speakingFeedback, setSpeakingFeedback] = useState<GrammarCorrection | null>(null);

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  const handlePlayVoice = (text: string, id: string) => {
    setPlayingAudioId(id);
    speakText(text, () => setPlayingAudioId(null));
  };

  const handleExit = () => {
    Alert.alert(
      'Leave Lesson?',
      'Your current progress in this lesson will not be saved.',
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

  const loseOneHeart = () => {
    setHearts((prev) => {
      const next = Math.max(0, prev - 1);
      onHeartsChange(next);
      return next;
    });
  };

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

  const handleResetJumble = () => {
    if (jumbleChecked || assembledWords.length === 0) return;
    playSoundEffect('buttonV2');
    setAssembledWords([]);
    setAvailableWords([...lesson.jumble.scrambledWords]);
  };

  const handleCheckJumble = () => {
    const userStr = assembledWords.join(' ').trim().toLowerCase();
    const correctStr = lesson.jumble.correctWords.join(' ').trim().toLowerCase();
    const isOk = userStr === correctStr;
    setIsJumbleCorrect(isOk);
    setJumbleChecked(true);
    setChecksTotal((prev) => prev + 1);
    if (isOk) {
      setChecksCorrect((prev) => prev + 1);
      playSoundEffect('success');
    } else {
      playSoundEffect('error');
      loseOneHeart();
    }
  };

  const handleCheckTranslation = () => {
    if (selectedTransIdx === null) return;
    setTransChecked(true);
    const isOk = selectedTransIdx === lesson.translation.correctOptionIndex;
    setChecksTotal((prev) => prev + 1);
    if (isOk) {
      setChecksCorrect((prev) => prev + 1);
      playSoundEffect('chime');
    } else {
      playSoundEffect('error');
      loseOneHeart();
    }
  };

  const handleSubmitSpeaking = async () => {
    const text = spokenText.trim();
    if (!text || isEvaluating) return;

    setIsEvaluating(true);
    try {
      const feedback = await analyzeSentenceGrammar(text);
      setSpeakingFeedback(feedback);
      setChecksTotal((prev) => prev + 1);
      if (feedback.fluencyScore >= 70) {
        setChecksCorrect((prev) => prev + 1);
      }
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
    const accuracy = checksTotal > 0 ? Math.round((checksCorrect / checksTotal) * 100) : 100;
    const result = await onComplete(lesson.id, lesson.xpReward, 5);
    setVictorySummary({
      awardedXp: result.awardedXp,
      awardedGems: result.awardedGems,
      streakDays: result.stats.streakDays,
      accuracy,
    });
    setCurrentSlide('victory');
  };

  const currentStepIdx = LESSON_STEPS.indexOf(
    currentSlide === 'victory' ? 'speaking' : currentSlide
  );
  const isTransCorrect = selectedTransIdx === lesson.translation.correctOptionIndex;
  const shortTitle = formatShortLessonTitle(lesson.title);

  return (
    <View style={styles.fullscreen}>
      {/* Minimalist Top Bar: Close, 4-Step Segment Bar, Hearts */}
      {currentSlide !== 'victory' && (
        <View style={styles.topBarWrapper}>
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={handleExit}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color="#B8B4CF" />
            </TouchableOpacity>

            <View style={styles.segmentTrackRow}>
              {LESSON_STEPS.map((stepKey, idx) => {
                const isDone = idx < currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                return (
                  <View
                    key={stepKey}
                    style={[
                      styles.segmentTrackPill,
                      isDone && styles.segmentTrackDone,
                      isCurrent && styles.segmentTrackActive,
                    ]}
                  />
                );
              })}
            </View>

            <View style={styles.heartPill}>
              <Ionicons
                name={hearts > 0 ? 'heart' : 'shield-checkmark'}
                size={13.5}
                color={hearts > 0 ? '#C4B5FD' : '#A78BFA'}
              />
              <Text style={styles.heartCount}>
                {hearts > 0 ? hearts : 'Shield'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Centered Editorial Lesson Stage */}
      <ScrollView
        style={styles.slideScroll}
        contentContainerStyle={styles.slideContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SLIDE 1: CORE PATTERN */}
        {currentSlide === 'rule' && (
          <View style={styles.slideBody}>
            <Text style={styles.stepEyebrow}>STEP 01 · CORE PATTERN</Text>
            <Text style={styles.slideTitle}>{lesson.rule.heading}</Text>
            <Text style={styles.ruleExplainText}>{lesson.rule.englishExplanation}</Text>

            <View style={styles.tamilInsightCard}>
              <Text style={styles.tamilInsightEyebrow}>TAMIL MENTAL MODEL</Text>
              <Text style={styles.tamilInsightBody}>{lesson.rule.tamilMentalModel}</Text>
            </View>

            <View style={styles.contrastStack}>
              <View style={styles.avoidCard}>
                <View style={styles.contrastHeaderRow}>
                  <Ionicons name="close-circle" size={15} color="#8E89A6" />
                  <Text style={styles.avoidLabel}>AVOID (தவறு)</Text>
                </View>
                <Text style={styles.avoidSentence}>"{lesson.rule.doAndDont.wrong}"</Text>
              </View>

              <View style={styles.naturalCard}>
                <View style={styles.contrastHeaderRow}>
                  <Ionicons name="checkmark-circle" size={15} color="#A78BFA" />
                  <Text style={styles.naturalLabel}>SAY NATURALLY (சரி)</Text>
                  <TouchableOpacity
                    style={styles.audioIconBtn}
                    onPress={() => handlePlayVoice(lesson.rule.doAndDont.right, 'right-audio')}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons
                      name={playingAudioId === 'right-audio' ? 'volume-high' : 'volume-medium-outline'}
                      size={18}
                      color={THEME.colors.primaryGlow}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.naturalSentence}>"{lesson.rule.doAndDont.right}"</Text>
              </View>

              <Text style={styles.whyNote}>{lesson.rule.doAndDont.whyTamil}</Text>
            </View>
          </View>
        )}

        {/* SLIDE 2: SENTENCE BUILDER */}
        {currentSlide === 'jumble' && (
          <View style={styles.slideBody}>
            <Text style={styles.stepEyebrow}>STEP 02 · SENTENCE BUILDER</Text>
            <Text style={styles.slideTitle}>Arrange in Natural English</Text>
            <Text style={styles.slideSubtitle}>Tap words in order to form the sentence.</Text>

            <View style={styles.tamilPromptCard}>
              <Text style={styles.tamilInsightEyebrow}>TAMIL THOUGHT</Text>
              <Text style={styles.tamilPromptText}>{lesson.jumble.tamilSentence}</Text>
            </View>

            <View style={styles.answerDropzone}>
              <View style={styles.dropzoneTopRow}>
                <Text style={styles.dropzoneLabel}>YOUR SENTENCE</Text>
                {assembledWords.length > 0 && !jumbleChecked && (
                  <TouchableOpacity onPress={handleResetJumble} style={styles.resetChip}>
                    <Ionicons name="refresh" size={12} color="#B8B4CF" />
                    <Text style={styles.resetChipText}>Reset</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.wordsWrapRow}>
                {assembledWords.length === 0 ? (
                  <Text style={styles.emptySlotPlaceholder}>
                    Tap word chips below to build your sentence
                  </Text>
                ) : (
                  assembledWords.map((word, wIdx) => (
                    <TouchableOpacity
                      key={`${word}-${wIdx}`}
                      style={styles.selectedWordChip}
                      onPress={() => handleTapSlotWord(word, wIdx)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.selectedWordText}>{word}</Text>
                      {!jumbleChecked && (
                        <Ionicons name="close" size={12} color="#E9D5FF" style={{ marginLeft: 5 }} />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>

            <View style={styles.wordBankArea}>
              <View style={styles.wordsWrapRow}>
                {availableWords.map((word, bIdx) => (
                  <TouchableOpacity
                    key={`${word}-${bIdx}`}
                    style={styles.bankWordChip}
                    onPress={() => handleTapBankWord(word, bIdx)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.bankWordText}>{word}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* SLIDE 3: GUIDED TRANSLATION */}
        {currentSlide === 'translation' && (
          <View style={styles.slideBody}>
            <Text style={styles.stepEyebrow}>STEP 03 · NATURAL PHRASING</Text>
            <Text style={styles.slideTitle}>Choose the Best Fit</Text>
            <Text style={styles.slideSubtitle}>
              Pick the option a fluent speaker would naturally say.
            </Text>

            <View style={styles.tamilPromptCard}>
              <Text style={styles.tamilInsightEyebrow}>TAMIL MEANING</Text>
              <Text style={styles.tamilPromptText}>{lesson.translation.tamilPrompt}</Text>
            </View>

            <View style={styles.optionsCol}>
              {lesson.translation.options.map((opt, oIdx) => {
                const isSelected = selectedTransIdx === oIdx;
                const isRightOption = oIdx === lesson.translation.correctOptionIndex;

                let cardModifier = null;
                let badgeModifier = null;
                if (transChecked) {
                  if (isRightOption) {
                    cardModifier = styles.optionCardCorrect;
                    badgeModifier = styles.optionLetterCorrect;
                  } else if (isSelected) {
                    cardModifier = styles.optionCardWrong;
                    badgeModifier = styles.optionLetterWrong;
                  }
                } else if (isSelected) {
                  cardModifier = styles.optionCardSelected;
                  badgeModifier = styles.optionLetterSelected;
                }

                return (
                  <TouchableOpacity
                    key={oIdx}
                    style={[styles.optionCard, cardModifier]}
                    onPress={() => {
                      if (!transChecked) {
                        playSoundEffect('button');
                        setSelectedTransIdx(oIdx);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.optionLetterBox, badgeModifier]}>
                      <Text style={styles.optionLetterText}>
                        {OPTION_LETTERS[oIdx] || String(oIdx + 1)}
                      </Text>
                    </View>
                    <Text style={styles.optionText}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* SLIDE 4: PRACTICE SPEAKING */}
        {currentSlide === 'speaking' && (
          <View style={styles.slideBody}>
            <Text style={styles.stepEyebrow}>STEP 04 · SPEAK IT OUT</Text>
            <Text style={styles.slideTitle}>Respond in Your Own Words</Text>
            <Text style={styles.slideSubtitle}>{lesson.speakingChallenge.prompt}</Text>

            <View style={styles.promptBubbleCard}>
              <View style={styles.promptBubbleHeader}>
                <View style={styles.novaMiniAvatar}>
                  <Image source={SUPERNOVA_IMAGES.novaAvatar} style={styles.novaMiniImg} />
                </View>
                <Text style={styles.promptSpeakerName}>Nova</Text>
                <TouchableOpacity
                  style={styles.audioIconBtn}
                  onPress={() =>
                    handlePlayVoice(lesson.speakingChallenge.missNovaQuestion, 'nova-q')
                  }
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons
                    name={playingAudioId === 'nova-q' ? 'volume-high' : 'volume-medium-outline'}
                    size={19}
                    color={THEME.colors.primaryGlow}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.promptQuestionText}>
                "{lesson.speakingChallenge.missNovaQuestion}"
              </Text>
            </View>

            <View style={styles.sampleBlock}>
              <Text style={styles.sampleSectionLabel}>TAP TO PREFILL AN IDEA</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.sampleChipsRow}>
                  {lesson.speakingChallenge.suggestedAnswers.map((ans, aIdx) => (
                    <TouchableOpacity
                      key={aIdx}
                      style={styles.sampleChip}
                      onPress={() => setSpokenText(ans)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.sampleChipText}>"{ans}"</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <TextInput
              style={[
                styles.responseInput,
                spokenText.trim().length > 0 && styles.responseInputActive,
              ]}
              placeholder="Write or dictate your response in English..."
              placeholderTextColor={THEME.colors.textMuted}
              value={spokenText}
              onChangeText={setSpokenText}
              multiline
              textAlignVertical="top"
            />

            {speakingFeedback && (
              <View style={styles.feedbackCard}>
                <View style={styles.feedbackTopBar}>
                  <Text style={styles.feedbackTitle}>Response Check</Text>
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreBadgeText}>{speakingFeedback.fluencyScore}/100</Text>
                  </View>
                </View>

                <Text style={styles.feedbackEnglish}>{speakingFeedback.explanation}</Text>

                <View style={styles.feedbackTamilCallout}>
                  <Text style={styles.feedbackTamilText}>
                    {speakingFeedback.tamilExplanation}
                  </Text>
                </View>

                <View style={styles.rephraseBox}>
                  <Text style={styles.rephraseLabel}>NATURAL VERSION</Text>
                  <Text style={styles.rephraseText}>
                    "{speakingFeedback.nativeIdiomaticVersion}"
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* SLIDE 5: LESSON COMPLETE SUMMARY */}
        {currentSlide === 'victory' && (
          <View style={styles.victoryContainer}>
            <View style={styles.victoryCrestWrap}>
              <Image
                source={SUPERNOVA_IMAGES.trophyNova}
                style={styles.victoryCrestImg}
                resizeMode="cover"
              />
            </View>

            <Text style={styles.victoryEyebrow}>LESSON COMPLETED</Text>
            <Text style={styles.victoryTitle}>{shortTitle}</Text>
            <Text style={styles.victorySubtitle}>
              Pattern mastered and added to your daily fluency streak.
            </Text>

            <View style={styles.victoryMetricsCard}>
              <View style={styles.victoryMetricItem}>
                <Text style={styles.victoryMetricVal}>
                  +{victorySummary?.awardedXp ?? lesson.xpReward}
                </Text>
                <Text style={styles.victoryMetricLabel}>XP Earned</Text>
              </View>

              <View style={styles.victoryMetricDivider} />

              <View style={styles.victoryMetricItem}>
                <Text style={[styles.victoryMetricVal, { color: '#C4B5FD' }]}>
                  {victorySummary?.streakDays ?? 1}d
                </Text>
                <Text style={styles.victoryMetricLabel}>Streak</Text>
              </View>

              <View style={styles.victoryMetricDivider} />

              <View style={styles.victoryMetricItem}>
                <Text style={[styles.victoryMetricVal, { color: '#FFFFFF' }]}>
                  {victorySummary?.accuracy ?? 100}%
                </Text>
                <Text style={styles.victoryMetricLabel}>Accuracy</Text>
              </View>

              <View style={styles.victoryMetricDivider} />

              <View style={styles.victoryMetricItem}>
                <Text style={[styles.victoryMetricVal, { color: '#93C5FD' }]}>
                  +{victorySummary?.awardedGems ?? 5}
                </Text>
                <Text style={styles.victoryMetricLabel}>Gems</Text>
              </View>
            </View>

            <View style={{ width: '100%' }}>
              <ActionButton
                label="Back to Course"
                icon="arrow-forward"
                onPress={() => {
                  stopAllAudio();
                  onClose();
                }}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Pinned Bottom Action / Check Drawer */}
      {currentSlide !== 'victory' && (
        <View style={styles.bottomDrawerWrapper}>
          <View style={styles.bottomDrawerInner}>
            {currentSlide === 'rule' && (
              <ActionButton
                label="Continue"
                icon="arrow-forward"
                onPress={() => setCurrentSlide('jumble')}
              />
            )}

            {currentSlide === 'jumble' && (
              <>
                {jumbleChecked ? (
                  <View style={styles.feedbackDrawer}>
                    <View
                      style={[
                        styles.feedbackNoticeBox,
                        isJumbleCorrect ? styles.noticeCorrect : styles.noticeWrong,
                      ]}
                    >
                      <View style={styles.feedbackHeadlineRow}>
                        <Ionicons
                          name={isJumbleCorrect ? 'checkmark-circle' : 'alert-circle'}
                          size={19}
                          color={isJumbleCorrect ? '#C4B5FD' : '#E2B94B'}
                        />
                        <Text
                          style={[
                            styles.feedbackHeadline,
                            { color: isJumbleCorrect ? '#E9D5FF' : '#F3D677' },
                          ]}
                        >
                          {isJumbleCorrect ? 'Clean sentence structure!' : 'Incorrect word order'}
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            handlePlayVoice(lesson.jumble.correctWords.join(' '), 'jumble-answer')
                          }
                          style={styles.audioIconBtn}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons
                            name={
                              playingAudioId === 'jumble-answer'
                                ? 'volume-high'
                                : 'volume-medium-outline'
                            }
                            size={18}
                            color={THEME.colors.primaryGlow}
                          />
                        </TouchableOpacity>
                      </View>
                      {!isJumbleCorrect && (
                        <Text style={styles.drawerCorrectionText}>
                          Correct: {lesson.jumble.correctWords.join(' ')}
                        </Text>
                      )}
                    </View>

                    <ActionButton
                      label={isJumbleCorrect ? 'Continue' : 'Try Again'}
                      icon={isJumbleCorrect ? 'arrow-forward' : 'refresh'}
                      colors={isJumbleCorrect ? ['#8B5CF6', '#6D28D9'] : ['#2E294D', '#231F3B']}
                      onPress={() => {
                        if (isJumbleCorrect) {
                          setCurrentSlide('translation');
                        } else {
                          setAvailableWords([...lesson.jumble.scrambledWords]);
                          setAssembledWords([]);
                          setJumbleChecked(false);
                        }
                      }}
                    />
                  </View>
                ) : (
                  <ActionButton
                    label="Check Answer"
                    disabled={assembledWords.length === 0}
                    onPress={handleCheckJumble}
                  />
                )}
              </>
            )}

            {currentSlide === 'translation' && (
              <>
                {transChecked ? (
                  <View style={styles.feedbackDrawer}>
                    <View
                      style={[
                        styles.feedbackNoticeBox,
                        isTransCorrect ? styles.noticeCorrect : styles.noticeWrong,
                      ]}
                    >
                      <View style={styles.feedbackHeadlineRow}>
                        <Ionicons
                          name={isTransCorrect ? 'checkmark-circle' : 'alert-circle'}
                          size={19}
                          color={isTransCorrect ? '#C4B5FD' : '#E2B94B'}
                        />
                        <Text
                          style={[
                            styles.feedbackHeadline,
                            { color: isTransCorrect ? '#E9D5FF' : '#F3D677' },
                          ]}
                        >
                          {isTransCorrect ? 'Spot on!' : 'Check natural phrasing'}
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            handlePlayVoice(lesson.translation.expectedEnglish, 'trans-answer')
                          }
                          style={styles.audioIconBtn}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons
                            name={
                              playingAudioId === 'trans-answer'
                                ? 'volume-high'
                                : 'volume-medium-outline'
                            }
                            size={18}
                            color={THEME.colors.primaryGlow}
                          />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.drawerCorrectionText}>
                        {lesson.translation.explanation}
                      </Text>
                      <Text style={styles.drawerTamilNote}>
                        {lesson.translation.tamilExplanation}
                      </Text>
                    </View>

                    <ActionButton
                      label="Next: Speaking"
                      icon="mic-outline"
                      onPress={() => setCurrentSlide('speaking')}
                    />
                  </View>
                ) : (
                  <ActionButton
                    label="Check Answer"
                    disabled={selectedTransIdx === null}
                    onPress={handleCheckTranslation}
                  />
                )}
              </>
            )}

            {currentSlide === 'speaking' && (
              <>
                {speakingFeedback ? (
                  <ActionButton
                    label={`Complete Lesson (+${lesson.xpReward} XP)`}
                    iconLeft="checkmark-done"
                    colors={['#8B5CF6', '#6D28D9']}
                    onPress={handleFinishLesson}
                  />
                ) : (
                  <ActionButton
                    label="Check Response"
                    iconLeft="mic-outline"
                    disabled={!spokenText.trim()}
                    loading={isEvaluating}
                    onPress={handleSubmitSpeaking}
                  />
                )}
              </>
            )}
          </View>
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
  topBarWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    maxWidth: MAX_LESSON_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#181725',
    borderWidth: 1,
    borderColor: '#2A2740',
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentTrackRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  segmentTrackPill: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#232036',
  },
  segmentTrackDone: {
    backgroundColor: '#A78BFA',
  },
  segmentTrackActive: {
    backgroundColor: THEME.colors.primary,
  },
  heartPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    paddingHorizontal: 9,
    borderRadius: 10,
    backgroundColor: '#181725',
    borderWidth: 1,
    borderColor: '#2A2740',
    gap: 4,
  },
  heartCount: {
    fontFamily: THEME.fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },

  slideScroll: {
    flex: 1,
  },
  slideContent: {
    width: '100%',
    maxWidth: MAX_LESSON_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 32,
  },
  slideBody: {
    gap: 14,
  },
  stepEyebrow: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10.5,
    color: '#A78BFA',
    letterSpacing: 1.0,
  },
  slideTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 22,
    color: '#FFFFFF',
    lineHeight: 28,
    marginTop: -4,
  },
  slideSubtitle: {
    fontFamily: THEME.fonts.body,
    fontSize: 13.5,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    marginTop: -6,
  },
  ruleExplainText: {
    fontFamily: THEME.fonts.body,
    fontSize: 14.5,
    color: '#D7D3EB',
    lineHeight: 22,
  },

  /* TAMIL INSIGHT CALLOUT (LEFT-ACCENT OBSIDIAN) */
  tamilInsightCard: {
    backgroundColor: '#171625',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tamilInsightEyebrow: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: '#A78BFA',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  tamilInsightBody: {
    fontFamily: THEME.fonts.tamilMedium,
    fontSize: 13.5,
    color: '#F1EFFC',
    lineHeight: 24,
  },

  /* CONTRAST PAIR (AVOID VS NATURAL) */
  contrastStack: {
    gap: 10,
    marginTop: 2,
  },
  avoidCard: {
    backgroundColor: '#161522',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#29273D',
  },
  naturalCard: {
    backgroundColor: '#1A162D',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(127, 67, 254, 0.45)',
  },
  contrastHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avoidLabel: {
    fontFamily: THEME.fonts.tamilBold,
    fontSize: 10.5,
    color: '#9590AE',
    lineHeight: 16,
  },
  naturalLabel: {
    fontFamily: THEME.fonts.tamilBold,
    fontSize: 10.5,
    color: '#C4B5FD',
    lineHeight: 16,
    flex: 1,
  },
  avoidSentence: {
    fontFamily: THEME.fonts.medium,
    fontSize: 14.5,
    color: '#D5D0E6',
    marginTop: 6,
    lineHeight: 21,
  },
  naturalSentence: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 15,
    color: '#FFFFFF',
    marginTop: 6,
    lineHeight: 22,
  },
  audioIconBtn: {
    padding: 3,
  },
  whyNote: {
    fontFamily: THEME.fonts.tamil,
    fontSize: 12.5,
    color: THEME.colors.textSecondary,
    lineHeight: 21,
    paddingHorizontal: 2,
    marginTop: 2,
  },

  /* SENTENCE BUILDER */
  tamilPromptCard: {
    backgroundColor: '#171625',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#28253D',
  },
  tamilPromptText: {
    fontFamily: THEME.fonts.tamilBold,
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 27,
  },
  answerDropzone: {
    minHeight: 100,
    backgroundColor: '#13121D',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2B2842',
  },
  dropzoneTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dropzoneLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textMuted,
    letterSpacing: 0.7,
  },
  resetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1D1B2D',
    borderWidth: 1,
    borderColor: '#2E2B45',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  resetChipText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 10.5,
    color: '#B8B4CF',
  },
  emptySlotPlaceholder: {
    fontFamily: THEME.fonts.body,
    fontSize: 13,
    color: THEME.colors.textMuted,
    paddingVertical: 6,
  },
  wordsWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedWordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 11,
  },
  selectedWordText: {
    fontFamily: THEME.fonts.semiBold,
    color: '#FFFFFF',
    fontSize: 14,
  },
  wordBankArea: {
    paddingTop: 6,
  },
  bankWordChip: {
    backgroundColor: '#1B1A2B',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#312D4E',
  },
  bankWordText: {
    fontFamily: THEME.fonts.semiBold,
    color: '#F1EFFC',
    fontSize: 14,
  },

  /* GUIDED TRANSLATION */
  optionsCol: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171625',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#28253D',
  },
  optionCardSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(127, 67, 254, 0.14)',
  },
  optionCardCorrect: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(127, 67, 254, 0.16)',
  },
  optionCardWrong: {
    borderColor: 'rgba(226, 185, 75, 0.45)',
    backgroundColor: 'rgba(226, 185, 75, 0.08)',
  },
  optionLetterBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#222036',
    borderWidth: 1,
    borderColor: '#353152',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionLetterSelected: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primaryGlow,
  },
  optionLetterCorrect: {
    backgroundColor: '#7F43FE',
    borderColor: '#A78BFA',
  },
  optionLetterWrong: {
    backgroundColor: '#4A3D22',
    borderColor: '#E2B94B',
  },
  optionLetterText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  optionText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 20,
  },

  /* SPEAKING STAGE */
  promptBubbleCard: {
    backgroundColor: '#171625',
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#292640',
  },
  promptBubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  novaMiniAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.5)',
    backgroundColor: '#222036',
  },
  novaMiniImg: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.05 }],
  },
  promptSpeakerName: {
    fontFamily: THEME.fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
    marginLeft: 9,
    flex: 1,
  },
  promptQuestionText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 15,
    color: '#E9D5FF',
    lineHeight: 22,
  },
  sampleBlock: {
    gap: 8,
  },
  sampleSectionLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textMuted,
    letterSpacing: 0.7,
  },
  sampleChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sampleChip: {
    backgroundColor: '#181725',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#2B2842',
  },
  sampleChipText: {
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 12,
    color: '#C7C3DC',
  },
  responseInput: {
    fontFamily: THEME.fonts.bodyMedium,
    backgroundColor: '#151422',
    borderRadius: 13,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 88,
    borderWidth: 1,
    borderColor: '#2B2842',
    lineHeight: 20,
  },
  responseInputActive: {
    borderColor: THEME.colors.primary,
  },
  feedbackCard: {
    backgroundColor: '#171625',
    borderRadius: 14,
    padding: 15,
    borderWidth: 1,
    borderColor: '#2B2842',
    gap: 10,
  },
  feedbackTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedbackTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  scoreBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
  },
  scoreBadgeText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11.5,
    color: '#22D3EE',
  },
  feedbackEnglish: {
    fontFamily: THEME.fonts.body,
    fontSize: 13,
    color: '#D5D0E6',
    lineHeight: 19,
  },
  feedbackTamilCallout: {
    backgroundColor: '#1E1B30',
    borderRadius: 10,
    borderLeftWidth: 2.5,
    borderLeftColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  feedbackTamilText: {
    fontFamily: THEME.fonts.tamilMedium,
    fontSize: 12.5,
    color: '#F1EFFC',
    lineHeight: 22,
  },
  rephraseBox: {
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    padding: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.22)',
  },
  rephraseLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 9.5,
    color: THEME.colors.secondary,
    letterSpacing: 0.7,
    marginBottom: 3,
  },
  rephraseText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 13.5,
    color: '#FFFFFF',
    lineHeight: 20,
  },

  /* VICTORY SUMMARY */
  victoryContainer: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 20,
  },
  victoryCrestWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#181724',
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.75)',
    overflow: 'hidden',
    marginBottom: 18,
  },
  victoryCrestImg: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.06 }],
  },
  victoryEyebrow: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10.5,
    color: '#A78BFA',
    letterSpacing: 1.0,
    marginBottom: 4,
  },
  victoryTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 23,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 30,
  },
  victorySubtitle: {
    fontFamily: THEME.fonts.body,
    fontSize: 13.5,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  victoryMetricsCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171625',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2B2842',
    paddingVertical: 16,
    marginVertical: 24,
  },
  victoryMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  victoryMetricDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#2A2740',
  },
  victoryMetricVal: {
    fontFamily: THEME.fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  victoryMetricLabel: {
    fontFamily: THEME.fonts.medium,
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },

  /* BOTTOM DRAWER */
  bottomDrawerWrapper: {
    backgroundColor: '#11101A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.07)',
    alignItems: 'center',
  },
  bottomDrawerInner: {
    width: '100%',
    maxWidth: MAX_LESSON_WIDTH,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  feedbackDrawer: {
    gap: 10,
  },
  feedbackNoticeBox: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    gap: 4,
  },
  noticeCorrect: {
    backgroundColor: 'rgba(127, 67, 254, 0.12)',
    borderColor: 'rgba(167, 139, 250, 0.35)',
  },
  noticeWrong: {
    backgroundColor: 'rgba(226, 185, 75, 0.08)',
    borderColor: 'rgba(226, 185, 75, 0.28)',
  },
  feedbackHeadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedbackHeadline: {
    fontFamily: THEME.fonts.bold,
    fontSize: 14,
    flex: 1,
  },
  drawerCorrectionText: {
    fontFamily: THEME.fonts.body,
    fontSize: 12.5,
    color: '#E5E1F7',
    lineHeight: 18,
  },
  drawerTamilNote: {
    fontFamily: THEME.fonts.tamilMedium,
    fontSize: 12.5,
    color: '#F1EFFC',
    lineHeight: 21,
    marginTop: 2,
  },
  primaryBtnOuter: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnGradient: {
    width: '100%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 14.5,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  primaryBtnTextDisabled: {
    color: '#76728E',
  },
});
