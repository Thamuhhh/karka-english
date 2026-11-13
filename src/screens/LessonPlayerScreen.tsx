import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  PanResponder,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../constants/theme';
import { MascotAvatar } from '../components/MascotAvatar';
import { LectureAudioClip, SupernovaClass } from '../constants/curriculum';
import { UserStats, GrammarCorrection, ChatMessage } from '../types';
import {
  speakText,
  speakTamil,
  stopAllAudio,
} from '../services/ttsService';
import {
  checkLessonTranslation,
  sendLessonRealTalkReply,
  TranslationEvalResult,
} from '../api/supernovaAi';
import { playSoundEffect } from '../services/soundEffectsService';
import { AnimatedChatBubble, TypingDots, TypewriterText } from '../components/ChatAnimations';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface LessonPlayerProps {
  lesson: SupernovaClass;
  initialHearts: number;
  onHeartsChange: (hearts: number) => void;
  onClose: () => void;
  onTopColorChange?: (color: string) => void;
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

interface WordChipRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DraggableWordChipProps {
  word: string;
  chipStyle: StyleProp<ViewStyle>;
  textStyle: StyleProp<TextStyle>;
  disabled: boolean;
  onPress: () => void;
  onDrop: (x: number, y: number) => void;
  onMeasure: (rect: WordChipRect) => void;
  trailingIcon?: React.ReactNode;
}

const DraggableWordChip: React.FC<DraggableWordChipProps> = ({
  word,
  chipStyle,
  textStyle,
  disabled,
  onPress,
  onDrop,
  onMeasure,
  trailingIcon,
}) => {
  const position = useRef(new Animated.ValueXY()).current;
  const chipRef = useRef<View>(null);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !disabled && (Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5),
        onPanResponderMove: Animated.event([null, { dx: position.x, dy: position.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_, gesture) => {
          onDrop(gesture.moveX, gesture.moveY);
          position.setValue({ x: 0, y: 0 });
        },
        onPanResponderTerminate: () => position.setValue({ x: 0, y: 0 }),
      }),
    [disabled, onDrop, position]
  );

  const measureChip = () => {
    requestAnimationFrame(() => {
      chipRef.current?.measureInWindow((x, y, width, height) =>
        onMeasure({ x, y, width, height })
      );
    });
  };

  return (
    <Animated.View
      ref={chipRef}
      onLayout={measureChip}
      style={{ transform: position.getTranslateTransform() }}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity style={chipStyle} onPress={onPress} disabled={disabled} activeOpacity={0.8}>
        <Text style={textStyle}>{word}</Text>
        {trailingIcon}
      </TouchableOpacity>
    </Animated.View>
  );
};

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
  onTopColorChange,
  onComplete,
}) => {
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [currentSlide, setCurrentSlide] = useState<SlideType>('rule');
  const [hearts, setHearts] = useState(Math.max(0, initialHearts));
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const slideScrollRef = useRef<ScrollView>(null);
  const lectureFollowUpTokenRef = useRef(0);

  // Accuracy & Victory Tracking
  const [checksTotal, setChecksTotal] = useState(0);
  const [checksCorrect, setChecksCorrect] = useState(0);
  const [victorySummary, setVictorySummary] = useState<{
    awardedXp: number;
    awardedGems: number;
    streakDays: number;
    accuracy: number;
  } | null>(null);

  // Stage 1: Minimal 3-Beat Lecture State (0: Rule, 1: Fix, 2: Check)
  const [lectureStep, setLectureStep] = useState<0 | 1 | 2>(0);
  const [spotCheckPick, setSpotCheckPick] = useState<'wrong' | 'right' | null>(null);

  // Slide 2: Jumble State
  const [assembledWords, setAssembledWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([
    ...lesson.jumble.scrambledWords,
  ]);
  const answerDropzoneRef = useRef<View>(null);
  const answerDropzoneRectRef = useRef<WordChipRect | null>(null);
  const answerSlotRectsRef = useRef<WordChipRect[]>([]);
  const [showJumbleHint, setShowJumbleHint] = useState(false);
  const [jumbleChecked, setJumbleChecked] = useState(false);
  const [isJumbleCorrect, setIsJumbleCorrect] = useState(false);

  // Slide 3: Active English Q&A Translation State
  const [transMode, setTransMode] = useState<'type' | 'choices'>(
    lesson.translation.options?.length ? 'choices' : 'type'
  );
  const [typedAnswer, setTypedAnswer] = useState('');
  const [selectedTransIdx, setSelectedTransIdx] = useState<number | null>(null);
  const [isCheckingTrans, setIsCheckingTrans] = useState(false);
  const [transEval, setTransEval] = useState<TranslationEvalResult | null>(null);

  // Slide 4: type a personal response to the real-life situation.
  const [realLifeAnswer, setRealLifeAnswer] = useState('');
  const [isRealLifeAnswerSubmitted, setIsRealLifeAnswerSubmitted] = useState(false);

  const handlePlayVoice = (
    text: string,
    id: string,
    rateOverride?: number,
    preferAiVoice = false,
    assetKey?: string,
    onDone?: () => void,
    lectureAudioClip?: LectureAudioClip
  ) => {
    if (!onDone) lectureFollowUpTokenRef.current += 1;
    setPlayingAudioId(id);
    speakText(
      text,
      () => {
        setPlayingAudioId(null);
        onDone?.();
      },
      rateOverride,
      preferAiVoice,
      assetKey,
      lectureAudioClip
    );
  };

  const handlePlayTamilVoice = (text: string, id: string, assetKey?: string, lectureAudioClip?: LectureAudioClip) => {
    lectureFollowUpTokenRef.current += 1;
    setPlayingAudioId(id);
    speakTamil(text, () => setPlayingAudioId(null), assetKey, lectureAudioClip);
  };

  const handleStopVoice = () => {
    lectureFollowUpTokenRef.current += 1;
    stopAllAudio();
    setPlayingAudioId(null);
  };

  const playRightThenWhy = (rateOverride?: number, preferAiVoice = true) => {
    const followUpToken = ++lectureFollowUpTokenRef.current;
    handlePlayVoice(
      lesson.rule.doAndDont.right,
      'lecture-right',
      rateOverride,
      preferAiVoice,
      `${lesson.id}-right`,
      () => {
        if (followUpToken === lectureFollowUpTokenRef.current) {
          handlePlayTamilVoice(
            lesson.rule.doAndDont.whyTamil,
            'lecture-why',
            `${lesson.id}-why`,
            lesson.lectureAudio?.why
          );
        }
      },
      lesson.lectureAudio?.right
    );
  };

  // Auto-speak focused step cleanly without overwhelming lecture walls
  useEffect(() => {
    if (voiceMuted) return;
    if (currentSlide === 'rule') {
      if (lectureStep === 0) {
        handlePlayTamilVoice(
          lesson.rule.tamilMentalModel,
          'lecture-tamil',
          `${lesson.id}-tamil`,
          lesson.lectureAudio?.tamil
        );
      } else if (lectureStep === 1) {
        playRightThenWhy();
      }
    } else if (currentSlide === 'speaking') {
      // Let the learner read the real-life challenge before writing a response.
    }
    return () => {
      lectureFollowUpTokenRef.current += 1;
      stopAllAudio();
      setPlayingAudioId(null);
    };
  }, [currentSlide, lectureStep]);

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  const goToSlide = (next: SlideType) => {
    stopAllAudio();
    setPlayingAudioId(null);
    setCurrentSlide(next);
    slideScrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleExit = () => {
    setShowExitDialog(true);
  };

  const loseOneHeart = () => {
    setHearts((prev) => {
      const next = Math.max(0, prev - 1);
      onHeartsChange(next);
      return next;
    });
  };

  // Stage 2: Jumble Word Matching Handlers
  const handleTapBankWord = (word: string, index: number) => {
    if (jumbleChecked) return;
    playSoundEffect('button');
    setAssembledWords((prev) => [...prev, word]);
    setAvailableWords((prev) => prev.filter((_, wordIndex) => wordIndex !== index));
  };

  const handleTapSlotWord = (word: string, index: number) => {
    if (jumbleChecked) return;
    playSoundEffect('buttonV2');
    setAssembledWords((prev) => prev.filter((_, wordIndex) => wordIndex !== index));
    setAvailableWords((prev) => [...prev, word]);
  };

  const getAnswerInsertionIndex = (x: number, y: number, wordCount: number) => {
    const rects = answerSlotRectsRef.current;
    for (let index = 0; index < wordCount; index += 1) {
      const rect = rects[index];
      if (!rect) continue;
      const centerY = rect.y + rect.height / 2;
      const centerX = rect.x + rect.width / 2;
      if (y < centerY - rect.height * 0.35 || (Math.abs(y - centerY) <= rect.height * 0.65 && x < centerX)) {
        return index;
      }
    }
    return wordCount;
  };

  const isInsideAnswerDropzone = (x: number, y: number) => {
    const rect = answerDropzoneRectRef.current;
    return Boolean(
      rect && x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
    );
  };

  const handleDragBankWord = (word: string, fromIndex: number, x: number, y: number) => {
    if (jumbleChecked || !isInsideAnswerDropzone(x, y)) return;
    const insertionIndex = getAnswerInsertionIndex(x, y, assembledWords.length);
    setAvailableWords((prev) => prev.filter((_, index) => index !== fromIndex));
    setAssembledWords((prev) => {
      const next = [...prev];
      next.splice(Math.min(insertionIndex, next.length), 0, word);
      return next;
    });
    playSoundEffect('button');
  };

  const handleDragSlotWord = (word: string, fromIndex: number, x: number, y: number) => {
    if (jumbleChecked) return;
    if (!isInsideAnswerDropzone(x, y)) {
      handleTapSlotWord(word, fromIndex);
      return;
    }
    const targetIndex = getAnswerInsertionIndex(x, y, assembledWords.length);
    const insertionIndex = targetIndex > fromIndex ? targetIndex - 1 : targetIndex;
    setAssembledWords((prev) => {
      const next = [...prev];
      const [movedWord] = next.splice(fromIndex, 1);
      next.splice(Math.max(0, Math.min(insertionIndex, next.length)), 0, movedWord);
      return next;
    });
    playSoundEffect('buttonV2');
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
      if (!voiceMuted) {
        handlePlayVoice(lesson.jumble.correctWords.join(' '), 'jumble-answer');
      }
    } else {
      playSoundEffect('error');
      loseOneHeart();
    }
  };

  // Stage 3: Active English Q&A Translation Handler
  const handleCheckTranslation = async () => {
    if (isCheckingTrans) return;

    if (transMode === 'choices') {
      if (selectedTransIdx === null) return;
      const isOk = selectedTransIdx === lesson.translation.correctOptionIndex;
      setTransEval({
        isCorrect: isOk,
        score: isOk ? 100 : 40,
        feedbackEnglish: lesson.translation.explanation,
        tamilExplanation: lesson.translation.tamilExplanation,
        expectedEnglish: lesson.translation.expectedEnglish,
      });
      setChecksTotal((prev) => prev + 1);
      if (isOk) {
        setChecksCorrect((prev) => prev + 1);
        playSoundEffect('chime');
      } else {
        playSoundEffect('error');
        loseOneHeart();
      }
      return;
    }

    const raw = typedAnswer.trim();
    if (!raw) return;
    setIsCheckingTrans(true);
    try {
      const evaluation = await checkLessonTranslation(raw, lesson.translation);
      setTransEval(evaluation);
      setChecksTotal((prev) => prev + 1);
      if (evaluation.isCorrect) {
        setChecksCorrect((prev) => prev + 1);
        playSoundEffect('chime');
      } else {
        playSoundEffect('error');
        loseOneHeart();
      }
    } finally {
      setIsCheckingTrans(false);
    }
  };

  const handleSubmitRealLifeAnswer = () => {
    if (realLifeAnswer.trim().length < 3) return;
    setIsRealLifeAnswerSubmitted(true);
    playSoundEffect('success');
  };

  const handleFinishLesson = async () => {
    stopAllAudio();
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
    slideScrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const toggleVoiceMute = () => {
    const nextMuted = !voiceMuted;
    setVoiceMuted(nextMuted);
    if (nextMuted) {
      handleStopVoice();
    }
  };

  const currentStepIdx = LESSON_STEPS.indexOf(
    currentSlide === 'victory' ? 'speaking' : currentSlide
  );
  const shortTitle = formatShortLessonTitle(lesson.title);
  const canCheckTranslation =
    transMode === 'type' ? typedAnswer.trim().length > 0 : selectedTransIdx !== null;

  const lessonTopColor = currentSlide === 'victory' ? '#2A1B4E' : '#1B1535';

  useEffect(() => {
    onTopColorChange?.(lessonTopColor);
  }, [lessonTopColor, onTopColorChange]);

  return (
    <View style={styles.fullscreen}>
      <LinearGradient
        colors={[lessonTopColor, 'rgba(14, 14, 20, 0)']}
        style={styles.topAmbientWash}
        pointerEvents="none"
      />
      {/* Top Bar: Close, 4-Step Segment Track, Audio Mute & Hearts */}
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

            <TouchableOpacity
              onPress={toggleVoiceMute}
              style={styles.muteBtn}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Ionicons
                name={voiceMuted ? 'volume-mute-outline' : 'volume-medium-outline'}
                size={15}
                color={voiceMuted ? THEME.colors.textMuted : '#C4B5FD'}
              />
            </TouchableOpacity>

            <View style={styles.heartPill}>
              <Ionicons
                name={hearts > 0 ? 'heart' : 'shield-checkmark'}
                size={13.5}
                color={hearts > 0 ? '#C4B5FD' : '#A78BFA'}
              />
              <Text style={styles.heartCount}>{hearts > 0 ? hearts : 'Shield'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Centered Scrollable Lesson Body */}
      <ScrollView
        ref={slideScrollRef}
        style={styles.slideScroll}
        contentContainerStyle={styles.slideContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ============================================================ */}
        {/* STAGE 1: MINIMAL 3-STEP CLASS LECTURE (Zero Card Clutter)    */}
        {/* ============================================================ */}
        {currentSlide === 'rule' && (
          <View style={styles.lectureCanvas}>
            {/* Header Eyebrow + 3 Tappable Micro-Step Dots */}
            <View style={styles.stepHeaderRow}>
              <Text style={styles.stepEyebrow}>
                CLASS {String(lesson.classNumber).padStart(2, '0')} · LECTURE
              </Text>
              <View style={styles.lectureDotsRow}>
                {([0, 1, 2] as const).map((stepIdx) => {
                  const isCurrent = lectureStep === stepIdx;
                  return (
                    <TouchableOpacity
                      key={stepIdx}
                      onPress={() => {
                        stopAllAudio();
                        setPlayingAudioId(null);
                        setLectureStep(stepIdx);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                      style={[
                        styles.lectureDot,
                        isCurrent && styles.lectureDotActive,
                      ]}
                    />
                  );
                })}
              </View>
            </View>

            {lesson.imageUrl ? (
              <Image
                source={{ uri: lesson.imageUrl }}
                style={styles.lessonContextImage}
                resizeMode="cover"
              />
            ) : null}

            {/* MICRO-STEP 0: CORE RULE (Open Typography, Zero Box) */}
            {lectureStep === 0 && (
              <View style={styles.lectureFocusStage}>
                <View style={styles.nilaInlineRow}>
                  <MascotAvatar
                    mood={playingAudioId === 'lecture-tamil' ? 'speaking' : 'reading'}
                    size={42}
                    borderColor={THEME.colors.primaryGlow}
                    borderWidth={1.5}
                  />
                  <TouchableOpacity
                    style={styles.minimalAudioBtn}
                    onPress={() =>
                      playingAudioId === 'lecture-tamil'
                        ? handleStopVoice()
                        : handlePlayTamilVoice(
                            lesson.rule.tamilMentalModel,
                            'lecture-tamil',
                            `${lesson.id}-tamil`,
                            lesson.lectureAudio?.tamil
                          )
                    }
                    activeOpacity={0.78}
                  >
                    <Ionicons
                      name={playingAudioId === 'lecture-tamil' ? 'stop' : 'volume-high-outline'}
                      size={15}
                      color="#C4B5FD"
                    />
                    <Text style={styles.minimalAudioText}>
                      {playingAudioId === 'lecture-tamil' ? 'Stop Tamil' : 'Hear Tamil'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.lectureHeroTitle}>
                  {lesson.rule.heading.replace(/^Rule:\s*/i, '').trim()}
                </Text>

                <View style={styles.openQuoteStrip}>
                  <Text style={styles.lectureTamilCopy}>{lesson.rule.tamilMentalModel}</Text>
                </View>

                <Text style={styles.lectureSubCopy}>{lesson.rule.englishExplanation}</Text>
              </View>
            )}

            {/* MICRO-STEP 1: BEFORE -> NATURAL HERO PHRASE */}
            {lectureStep === 1 && (
              <View style={styles.lectureFocusStage}>
                <Text style={styles.lectureMutedLabel}>AVOID SAYING</Text>
                <Text style={styles.lectureWrongStrike}>"{lesson.rule.doAndDont.wrong}"</Text>

                <View style={styles.lectureNaturalBlock}>
                  <Text style={styles.lectureVioletLabel}>SAY NATURALLY</Text>
                  <Text style={styles.lectureHeroSentence}>"{lesson.rule.doAndDont.right}"</Text>

                  <View style={styles.minimalSpeedRow}>
                    <TouchableOpacity
                      style={[
                        styles.minimalAudioBtn,
                        playingAudioId === 'lecture-right' && styles.minimalAudioBtnActive,
                      ]}
                      onPress={() => playRightThenWhy()}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="volume-high-outline" size={15} color="#FFFFFF" />
                      <Text style={styles.minimalAudioText}>Play</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.minimalAudioBtn,
                        playingAudioId === 'lecture-slow' && styles.minimalAudioBtnActive,
                      ]}
                      onPress={() => playRightThenWhy(0.72, false)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="speedometer-outline" size={14} color="#C4B5FD" />
                      <Text style={styles.minimalAudioText}>0.7x</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.openQuoteStrip}>
                  <Text style={styles.lectureWhyText}>{lesson.rule.doAndDont.whyTamil}</Text>
                  <TouchableOpacity
                    style={styles.whyAudioButton}
                    onPress={() =>
                      playingAudioId === 'lecture-why'
                        ? handleStopVoice()
                        : handlePlayTamilVoice(
                            lesson.rule.doAndDont.whyTamil,
                            'lecture-why',
                            `${lesson.id}-why`,
                            lesson.lectureAudio?.why
                          )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={
                      playingAudioId === 'lecture-why'
                        ? 'Stop Tamil explanation audio'
                        : 'Play Tamil explanation audio'
                    }
                    activeOpacity={0.78}
                  >
                    <Ionicons
                      name={playingAudioId === 'lecture-why' ? 'stop' : 'volume-high-outline'}
                      size={15}
                      color="#C4B5FD"
                    />
                    <Text style={styles.whyAudioButtonText}>
                      {playingAudioId === 'lecture-why' ? 'Stop explanation' : 'Hear explanation'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* MICRO-STEP 2: CLEAN 1-TAP CHECK BEFORE PRACTICE */}
            {lectureStep === 2 && (
              <View style={styles.lectureFocusStage}>
                <View style={styles.nilaInlineRow}>
                  <MascotAvatar
                    mood={
                      spotCheckPick === 'right'
                        ? 'correct'
                        : spotCheckPick === 'wrong'
                        ? 'confused'
                        : 'thinking'
                    }
                    size={40}
                    borderColor={
                      spotCheckPick === 'right'
                        ? '#34D399'
                        : spotCheckPick === 'wrong'
                        ? THEME.colors.gold
                        : 'rgba(167, 139, 250, 0.45)'
                    }
                    borderWidth={1.3}
                  />
                  <Text style={[styles.lectureHeroTitle, { flex: 1 }]}>
                    Which one sounds natural?
                  </Text>
                </View>

                <View style={styles.minimalOptionsCol}>
                  {(lesson.classNumber % 2 === 0
                    ? (['right', 'wrong'] as const)
                    : (['wrong', 'right'] as const)
                  ).map((kind, idx) => {
                    const isSelected = spotCheckPick === kind;
                    const text =
                      kind === 'right'
                        ? lesson.rule.doAndDont.right
                        : lesson.rule.doAndDont.wrong;
                    const isRightChoice = kind === 'right';

                    return (
                      <TouchableOpacity
                        key={kind}
                        style={[
                          styles.minimalOptionRow,
                          isSelected && isRightChoice && styles.minimalOptionRight,
                          isSelected && !isRightChoice && styles.minimalOptionWrong,
                        ]}
                        onPress={() => {
                          setSpotCheckPick(kind);
                          if (isRightChoice) {
                            playSoundEffect('success');
                            if (!voiceMuted) {
                              handlePlayVoice(
                                lesson.rule.doAndDont.right,
                                'spot-right',
                                undefined,
                                true,
                                `${lesson.id}-right`
                              );
                            }
                          } else {
                            playSoundEffect('error');
                          }
                        }}
                        activeOpacity={0.84}
                      >
                        <View
                          style={[
                            styles.spotOptionBadge,
                            isSelected && isRightChoice && styles.spotOptionBadgeRight,
                            isSelected && !isRightChoice && styles.spotOptionBadgeWrong,
                          ]}
                        >
                          <Text style={styles.spotOptionBadgeText}>{idx === 0 ? 'A' : 'B'}</Text>
                        </View>
                        <Text style={styles.spotOptionText}>{text}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {spotCheckPick && (
                  <Text
                    style={[
                      styles.minimalCheckNote,
                      { color: spotCheckPick === 'right' ? '#A7F3D0' : '#FDE68A' },
                    ]}
                  >
                    {spotCheckPick === 'right'
                      ? 'Correct — ready to practice this in action.'
                      : lesson.rule.doAndDont.whyTamil}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* ============================================================ */}
        {/* STAGE 2: TAMIL -> ENGLISH JUMBLED WORD MATCH                 */}
        {/* ============================================================ */}
        {currentSlide === 'jumble' && (
          <View style={styles.slideBody}>
            <Text style={styles.stepEyebrow}>STEP 02 · WORD MATCH</Text>
            <Text style={styles.slideTitle}>Match the Jumbled English</Text>
            <Text style={styles.slideSubtitle}>
              Drag words into the sentence, or tap to add them. Drop between words to reorder.
            </Text>

            <View style={styles.tamilPromptCard}>
              <View style={styles.promptTopRow}>
                <Text style={styles.tamilInsightEyebrow}>TAMIL SENTENCE</Text>
                <View style={styles.promptActionGroup}>
                  <TouchableOpacity
                    style={styles.audioIconBtn}
                    onPress={() =>
                      handlePlayTamilVoice(lesson.jumble.tamilSentence, 'jumble-tamil')
                    }
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons
                      name={
                        playingAudioId === 'jumble-tamil'
                          ? 'volume-high'
                          : 'volume-medium-outline'
                      }
                      size={17}
                      color={THEME.colors.primaryGlow}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowJumbleHint((prev) => !prev)}
                    style={styles.hintTogglePill}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="bulb-outline" size={12} color="#C4B5FD" />
                    <Text style={styles.hintToggleText}>
                      {showJumbleHint ? 'Hide Hint' : 'Hint'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.tamilPromptText}>{lesson.jumble.tamilSentence}</Text>
              {showJumbleHint && <Text style={styles.hintBody}>{lesson.jumble.hint}</Text>}
            </View>

            <View
              style={styles.answerDropzone}
              onLayout={() => {
                requestAnimationFrame(() => {
                  answerDropzoneRef.current?.measureInWindow((x, y, width, height) => {
                    answerDropzoneRectRef.current = { x, y, width, height };
                  });
                });
              }}
              ref={answerDropzoneRef}
            >
              <View style={styles.dropzoneTopRow}>
                <Text style={styles.dropzoneLabel}>YOUR ENGLISH MATCH</Text>
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
                    Drop words here or tap words below
                  </Text>
                ) : (
                  assembledWords.map((word, wIdx) => (
                    <DraggableWordChip
                      key={`${word}-${wIdx}`}
                      word={word}
                      chipStyle={styles.selectedWordChip}
                      textStyle={styles.selectedWordText}
                      disabled={jumbleChecked}
                      onPress={() => handleTapSlotWord(word, wIdx)}
                      onDrop={(x, y) => handleDragSlotWord(word, wIdx, x, y)}
                      onMeasure={(rect) => {
                        answerSlotRectsRef.current[wIdx] = rect;
                      }}
                      trailingIcon={
                        !jumbleChecked ? (
                          <Ionicons
                            name="close"
                            size={12}
                            color="#E9D5FF"
                            style={{ marginLeft: 5 }}
                          />
                        ) : undefined
                      }
                    />
                  ))
                )}
              </View>
            </View>

            <View style={styles.wordBankArea}>
              <View style={styles.wordsWrapRow}>
                {availableWords.map((word, bIdx) => (
                  <DraggableWordChip
                    key={`${word}-${bIdx}`}
                    word={word}
                    chipStyle={styles.bankWordChip}
                    textStyle={styles.bankWordText}
                    disabled={jumbleChecked}
                    onPress={() => handleTapBankWord(word, bIdx)}
                    onDrop={(x, y) => handleDragBankWord(word, bIdx, x, y)}
                    onMeasure={() => {}}
                  />
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* STAGE 3: TRANSLATE Q&A (Answer the asked prompt in English)  */}
        {/* ============================================================ */}
        {currentSlide === 'translation' && (
          <View style={styles.slideBody}>
            <View style={styles.stepHeaderRow}>
              <Text style={styles.stepEyebrow}>STEP 03 · ENGLISH Q&amp;A</Text>
              <TouchableOpacity
                onPress={() => {
                  if (transEval) return;
                  setTransMode((prev) => (prev === 'type' ? 'choices' : 'type'));
                }}
                style={styles.modeSwitchChip}
                disabled={!!transEval}
              >
                <Text style={styles.modeSwitchText}>
                  {transMode === 'type' ? 'Need Choices?' : 'Type Answer'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.slideTitle}>Answer in English</Text>
            <Text style={styles.slideSubtitle}>
              Write the natural English answer for what Nila is asking in Tamil.
            </Text>

            <View style={styles.tamilPromptCard}>
              <View style={styles.promptTopRow}>
                <Text style={styles.tamilInsightEyebrow}>QUESTION PROMPT</Text>
                <TouchableOpacity
                  style={styles.audioIconBtn}
                  onPress={() =>
                    handlePlayTamilVoice(lesson.translation.tamilPrompt, 'qa-tamil-prompt')
                  }
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons
                    name={
                      playingAudioId === 'qa-tamil-prompt'
                        ? 'volume-high'
                        : 'volume-medium-outline'
                    }
                    size={17}
                    color={THEME.colors.primaryGlow}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.tamilPromptText}>{lesson.translation.tamilPrompt}</Text>
            </View>

            {transMode === 'type' ? (
              <TextInput
                style={[
                  styles.qaAnswerInput,
                  typedAnswer.trim().length > 0 && styles.qaAnswerInputActive,
                ]}
                placeholder="Type your English answer here..."
                placeholderTextColor={THEME.colors.textMuted}
                value={typedAnswer}
                onChangeText={setTypedAnswer}
                editable={!transEval}
                multiline
                textAlignVertical="top"
              />
            ) : (
              <View style={styles.optionsCol}>
                {(lesson.translation.options || []).map((opt, oIdx) => {
                  const isSelected = selectedTransIdx === oIdx;
                  const isRightOption = oIdx === lesson.translation.correctOptionIndex;

                  let cardModifier = null;
                  let badgeModifier = null;
                  if (transEval) {
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
                        if (!transEval) {
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
            )}
          </View>
        )}

        {/* ============================================================ */}
        {/* STEP 4: REAL-LIFE WRITTEN CHALLENGE                          */}
        {/* ============================================================ */}
        {currentSlide === 'speaking' && (
          <View style={styles.slideBody}>
            <View style={styles.stepHeaderRow}>
              <Text style={styles.stepEyebrow}>STEP 04 · REAL-LIFE CHALLENGE</Text>
              <View style={[styles.turnPill, isRealLifeAnswerSubmitted && styles.turnPillSuccess]}>
                <Ionicons
                  name={isRealLifeAnswerSubmitted ? 'checkmark-circle' : 'create-outline'}
                  size={13}
                  color={isRealLifeAnswerSubmitted ? '#4ADE80' : '#C4B5FD'}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.turnPillText}>
                  {isRealLifeAnswerSubmitted ? 'Response saved' : 'Write your reply'}
                </Text>
              </View>
            </View>

            <View style={styles.spokenCoachPromptCard}>
              <View style={styles.spokenCoachAvatarWrap}>
                <MascotAvatar
                  mood={isRealLifeAnswerSubmitted ? 'reward' : 'wave'}
                  size={46}
                  borderColor="rgba(167, 139, 250, 0.4)"
                  borderWidth={1.5}
                />
              </View>
              <View style={styles.spokenCoachTextCol}>
                <Text style={styles.spokenCoachTitle}>A real-life moment</Text>
                <Text style={styles.spokenCoachSubtitle}>
                  {lesson.speakingChallenge?.prompt || 'Write what you would say in this situation.'}
                </Text>
                {lesson.speakingChallenge?.missNovaQuestion ? (
                  <Text style={styles.spokenCoachOpening}>
                    Nila: “{lesson.speakingChallenge.missNovaQuestion}”
                  </Text>
                ) : null}
                {lesson.speakingChallenge?.tamilCoaching ? (
                  <Text style={styles.spokenCoachTamilHint}>
                    {lesson.speakingChallenge.tamilCoaching}
                  </Text>
                ) : null}
              </View>
              {lesson.speakingChallenge?.tamilCoaching ? (
                <TouchableOpacity
                  onPress={() => handlePlayTamilVoice(lesson.speakingChallenge!.tamilCoaching!, 'prompt-tamil')}
                  style={styles.spokenPromptAudioBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Listen to the Tamil coaching prompt"
                >
                  <Ionicons
                    name={playingAudioId === 'prompt-tamil' ? 'volume-high' : 'volume-medium-outline'}
                    size={16}
                    color="#A78BFA"
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.realLifeAnswerCard}>
              <Text style={styles.realLifeAnswerLabel}>YOUR REPLY</Text>
              <TextInput
                style={styles.realLifeAnswerInput}
                value={realLifeAnswer}
                onChangeText={setRealLifeAnswer}
                editable={!isRealLifeAnswerSubmitted}
                multiline
                textAlignVertical="top"
                placeholder="Write what you would say in English..."
                placeholderTextColor="#817A98"
                maxLength={500}
                accessibilityLabel="Write your English reply"
              />
              <Text style={styles.realLifeAnswerHint}>
                Use your own words. There is no single fixed answer.
              </Text>
            </View>

            {isRealLifeAnswerSubmitted ? (
              <View style={styles.realLifeExampleCard}>
                <View style={styles.realLifeExampleHeader}>
                  <Ionicons name="sparkles-outline" size={16} color="#C4B5FD" />
                  <Text style={styles.realLifeExampleLabel}>ONE NATURAL WAY TO SAY IT</Text>
                </View>
                <Text style={styles.realLifeExampleText}>
                  {lesson.speakingChallenge?.sampleNativeResponse || 'Try expressing your idea in a clear, complete English sentence.'}
                </Text>
                {(lesson.speakingChallenge?.suggestedAnswers || []).slice(0, 2).map((answer, index) => (
                  <Text key={`example-${index}`} style={styles.realLifeAlternativeText}>{answer}</Text>
                ))}
                <Text style={styles.realLifeCoachNote}>
                  Compare the meaning and sentence pattern. Your personal answer can use different words.
                </Text>
              </View>
            ) : null}
          </View>
        )}
        {/* ============================================================ */}
        {/* STAGE 5: LESSON COMPLETE SUMMARY                             */}
        {/* ============================================================ */}
        {currentSlide === 'victory' && (
          <View style={styles.victoryContainer}>
            <View style={styles.victoryCrestWrap}>
              <MascotAvatar
                mood={(victorySummary?.accuracy ?? 100) >= 85 ? 'reward' : 'love'}
                size={92}
                backgroundColor="transparent"
              />
            </View>

            <Text style={styles.victoryEyebrow}>CLASS COMPLETED</Text>
            <Text style={styles.victoryTitle}>{shortTitle}</Text>
            <Text style={styles.victorySubtitle}>
              Pattern explained, words matched, Q&amp;A answered, and your real-life reply written.
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
                <Text style={styles.victoryMetricVal}>{victorySummary?.accuracy ?? 100}%</Text>
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

      {/* Pinned Bottom Action / Feedback Drawer */}
      {currentSlide !== 'victory' && (
        <View style={styles.bottomDrawerWrapper}>
          <View style={styles.bottomDrawerInner}>
            {currentSlide === 'rule' && (
              <ActionButton
                label={
                  lectureStep === 0
                    ? 'See Example'
                    : lectureStep === 1
                      ? 'Quick Check'
                      : 'Start Practice'
                }
                icon="arrow-forward"
                onPress={() => {
                  if (lectureStep < 2) {
                    playSoundEffect('button');
                    setLectureStep((prev) => (prev + 1) as 0 | 1 | 2);
                    slideScrollRef.current?.scrollTo({ y: 0, animated: false });
                  } else {
                    goToSlide('jumble');
                  }
                }}
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
                        <MascotAvatar
                          mood={isJumbleCorrect ? 'excited' : 'strict'}
                          size={30}
                          borderColor={isJumbleCorrect ? 'rgba(167, 139, 250, 0.55)' : 'rgba(251, 191, 36, 0.55)'}
                          borderWidth={1.2}
                        />
                        <Text
                          style={[
                            styles.feedbackHeadline,
                            { color: isJumbleCorrect ? '#E9D5FF' : '#F3D677' },
                          ]}
                        >
                          {isJumbleCorrect ? 'Clean match!' : 'Check word order'}
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
                          Correct match: {lesson.jumble.correctWords.join(' ')}
                        </Text>
                      )}
                    </View>

                    <ActionButton
                      label={isJumbleCorrect ? 'Next: Q&A Translate' : 'Try Again'}
                      icon={isJumbleCorrect ? 'arrow-forward' : 'refresh'}
                      colors={isJumbleCorrect ? ['#8B5CF6', '#6D28D9'] : ['#2E294D', '#231F3B']}
                      onPress={() => {
                        if (isJumbleCorrect) {
                          goToSlide('translation');
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
                    label="Check Match"
                    disabled={assembledWords.length === 0}
                    onPress={handleCheckJumble}
                  />
                )}
              </>
            )}

            {currentSlide === 'translation' && (
              <>
                {transEval ? (
                  <View style={styles.feedbackDrawer}>
                    <View
                      style={[
                        styles.feedbackNoticeBox,
                        transEval.isCorrect ? styles.noticeCorrect : styles.noticeWrong,
                      ]}
                    >
                      <View style={styles.feedbackHeadlineRow}>
                        <MascotAvatar
                          mood={transEval.isCorrect ? 'correct' : 'idea'}
                          size={30}
                          borderColor={transEval.isCorrect ? 'rgba(167, 139, 250, 0.55)' : 'rgba(251, 191, 36, 0.55)'}
                          borderWidth={1.2}
                        />
                        <Text
                          style={[
                            styles.feedbackHeadline,
                            { color: transEval.isCorrect ? '#E9D5FF' : '#F3D677' },
                          ]}
                        >
                          {transEval.isCorrect ? 'Great English answer!' : 'Natural answer tip'}
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            handlePlayVoice(transEval.expectedEnglish, 'trans-answer')
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
                      {!transEval.isCorrect && (
                        <Text style={styles.drawerExpectedText}>
                          Natural: "{transEval.expectedEnglish}"
                        </Text>
                      )}
                      <Text style={styles.drawerCorrectionText}>{transEval.feedbackEnglish}</Text>
                      <TouchableOpacity
                        style={styles.drawerTamilRow}
                        onPress={() =>
                          handlePlayTamilVoice(transEval.tamilExplanation, 'trans-tamil')
                        }
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.drawerTamilNote, { flex: 1 }]}>
                          {transEval.tamilExplanation}
                        </Text>
                        <Ionicons
                          name={
                            playingAudioId === 'trans-tamil'
                              ? 'volume-high'
                              : 'volume-medium-outline'
                          }
                          size={16}
                          color={THEME.colors.primaryGlow}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.dualBtnRow}>
                      {!transEval.isCorrect && (
                        <View style={{ flex: 1 }}>
                          <ActionButton
                            label="Retry"
                            iconLeft="refresh"
                            colors={['#2E294D', '#231F3B']}
                            onPress={() => {
                              setTransEval(null);
                              setSelectedTransIdx(null);
                            }}
                          />
                        </View>
                      )}
                      <View style={{ flex: 1.4 }}>
                        <ActionButton
                          label="Next: Real Talk"
                          icon="chatbubbles-outline"
                          onPress={() => goToSlide('speaking')}
                        />
                      </View>
                    </View>
                  </View>
                ) : (
                  <ActionButton
                    label="Submit Answer"
                    disabled={!canCheckTranslation}
                    loading={isCheckingTrans}
                    onPress={handleCheckTranslation}
                  />
                )}
              </>
            )}

            {currentSlide === 'speaking' && (
              <ActionButton
                label={isRealLifeAnswerSubmitted ? `Complete Class (+${lesson.xpReward} XP)` : 'Check my response'}
                iconLeft={isRealLifeAnswerSubmitted ? 'checkmark-done' : 'create-outline'}
                disabled={!isRealLifeAnswerSubmitted && realLifeAnswer.trim().length < 3}
                onPress={isRealLifeAnswerSubmitted ? handleFinishLesson : handleSubmitRealLifeAnswer}
              />
            )}
          </View>
        </View>
      )}
      <ConfirmDialog
        visible={showExitDialog}
        title="Leave lesson?"
        message="Your progress in this lesson will not be saved. Are you sure you want to leave?"
        icon="exit-outline"
        confirmLabel="Leave"
        cancelLabel="Keep Learning"
        destructive
        onCancel={() => setShowExitDialog(false)}
        onConfirm={() => {
          setShowExitDialog(false);
          stopAllAudio();
          onClose();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    position: 'relative',
  },
  topAmbientWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 190,
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
    gap: 10,
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
  muteBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#181725',
    borderWidth: 1,
    borderColor: '#2A2740',
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingTop: 20,
    paddingBottom: 32,
  },
  slideBody: {
    gap: 14,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepEyebrow: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10.5,
    color: '#A78BFA',
    letterSpacing: 1.0,
  },
  slideTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 21,
    color: '#FFFFFF',
    lineHeight: 27,
    marginTop: -2,
  },
  slideSubtitle: {
    fontFamily: THEME.fonts.body,
    fontSize: 13.5,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    marginTop: -6,
  },

  /* STAGE 1: MINIMAL OPEN-CANVAS CLASS LECTURE */
  lectureCanvas: {
    gap: 20,
    paddingTop: 4,
  },
  lessonContextImage: {
    width: '100%',
    height: 190,
    borderRadius: 16,
    backgroundColor: '#17141F',
  },
  lectureDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lectureDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2E2A48',
  },
  lectureDotActive: {
    width: 20,
    backgroundColor: THEME.colors.primaryGlow,
  },
  lectureFocusStage: {
    gap: 20,
    paddingTop: 6,
  },
  nilaInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nilaMiniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: THEME.colors.primaryGlow,
    backgroundColor: '#181629',
  },
  minimalAudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1B182E',
    borderWidth: 1,
    borderColor: '#342E54',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  minimalAudioBtnActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: '#C4B5FD',
  },
  minimalAudioText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  lectureHeroTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 23,
    color: '#FFFFFF',
    lineHeight: 30,
  },
  openQuoteStrip: {
    borderLeftWidth: 2.5,
    borderLeftColor: THEME.colors.primary,
    paddingLeft: 14,
  },
  lectureTamilCopy: {
    fontFamily: THEME.fonts.tamilMedium,
    fontSize: 15,
    color: '#F3EEFF',
    lineHeight: 26,
  },
  lectureSubCopy: {
    fontFamily: THEME.fonts.body,
    fontSize: 14,
    color: '#A5A1B8',
    lineHeight: 21,
  },
  lectureMutedLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10.5,
    color: '#7E789A',
    letterSpacing: 1,
    marginBottom: -12,
  },
  lectureWrongStrike: {
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 16,
    color: '#8E88AC',
    textDecorationLine: 'line-through',
    lineHeight: 23,
  },
  lectureNaturalBlock: {
    gap: 12,
    paddingTop: 6,
  },
  lectureVioletLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10.5,
    color: '#34D399',
    letterSpacing: 1,
    marginBottom: -4,
  },
  lectureHeroSentence: {
    fontFamily: THEME.fonts.bold,
    fontSize: 21,
    color: '#FFFFFF',
    lineHeight: 29,
  },
  minimalSpeedRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  lectureWhyText: {
    fontFamily: THEME.fonts.tamil,
    fontSize: 13.5,
    color: '#C7C2DE',
    lineHeight: 22,
  },
  whyAudioButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 9,
    paddingVertical: 5,
  },
  whyAudioButtonText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: '#C4B5FD',
  },
  minimalOptionsCol: {
    gap: 12,
  },
  minimalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#171527',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#2E2A48',
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  minimalOptionRight: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: '#34D399',
  },
  minimalOptionWrong: {
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderColor: THEME.colors.gold,
  },
  minimalCheckNote: {
    fontFamily: THEME.fonts.tamilMedium,
    fontSize: 13,
    lineHeight: 21,
  },
  tamilInsightEyebrow: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: '#A78BFA',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  spotOptionBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#26223D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotOptionBadgeRight: {
    backgroundColor: '#059669',
  },
  spotOptionBadgeWrong: {
    backgroundColor: '#B45309',
  },
  spotOptionBadgeText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11.5,
    color: '#FFFFFF',
  },
  spotOptionText: {
    flex: 1,
    fontFamily: THEME.fonts.medium,
    fontSize: 14.5,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  audioIconBtn: {
    padding: 3,
  },

  /* STAGE 2: JUMBLED WORD MATCH */
  tamilPromptCard: {
    backgroundColor: '#171625',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#28253D',
  },
  promptTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promptActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hintTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#221F36',
    borderWidth: 1,
    borderColor: '#342F52',
  },
  hintToggleText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 10.5,
    color: '#C4B5FD',
  },
  hintBody: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: '#B8B4CF',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
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

  /* STAGE 3: ENGLISH Q&A */
  modeSwitchChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#1B192B',
    borderWidth: 1,
    borderColor: '#302C4A',
  },
  modeSwitchText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11,
    color: '#C4B5FD',
  },
  qaAnswerInput: {
    fontFamily: THEME.fonts.bodyMedium,
    backgroundColor: '#151422',
    borderRadius: 14,
    padding: 15,
    color: '#FFFFFF',
    fontSize: 14.5,
    minHeight: 96,
    borderWidth: 1,
    borderColor: '#2B2842',
    lineHeight: 22,
  },
  qaAnswerInputActive: {
    borderColor: THEME.colors.primary,
  },
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

  /* STAGE 4: SUPERNOVA AUTHENTIC SPOKEN PRACTICE */
  turnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#1B192B',
    borderWidth: 1,
    borderColor: '#302C4A',
  },
  turnPillSuccess: {
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    borderColor: 'rgba(74, 222, 128, 0.4)',
  },
  turnPillWarning: {
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  turnPillText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 10.5,
    color: '#C4B5FD',
  },
  chatThreadCard: {
    backgroundColor: '#13121E',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#26233B',
    padding: 13,
    gap: 11,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  chatRowLeft: {
    justifyContent: 'flex-start',
  },
  chatRowRight: {
    justifyContent: 'flex-end',
  },
  chatAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.5)',
    marginRight: 8,
    backgroundColor: '#222036',
  },
  chatAvatarImg: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.05 }],
  },
  chatBubble: {
    maxWidth: '82%',
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 14,
  },
  nilaBubble: {
    backgroundColor: '#1B192C',
    borderWidth: 1,
    borderColor: '#2C2847',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: '#6D28D9',
    borderBottomRightRadius: 4,
  },
  chatBubbleText: {
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 13.5,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  bubbleAudioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  bubbleAudioText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 10.5,
    color: '#C4B5FD',
  },
  typingText: {
    fontFamily: THEME.fonts.body,
    fontSize: 12.5,
    color: '#A5A1B8',
  },
  realTalkCoachCard: {
    backgroundColor: '#171625',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 4,
  },
  feedbackTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedbackTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 7,
    backgroundColor: 'rgba(127, 67, 254, 0.18)',
  },
  scoreBadgeText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: '#C4B5FD',
  },
  feedbackEnglish: {
    fontFamily: THEME.fonts.body,
    fontSize: 12.5,
    color: '#D5D0E6',
    lineHeight: 18,
  },
  feedbackTamil: {
    fontFamily: THEME.fonts.tamilMedium,
    fontSize: 12.5,
    color: '#F1EFFC',
    lineHeight: 21,
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
  talkComposerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: '#151422',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2C2944',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  talkInput: {
    flex: 1,
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 14,
    color: '#FFFFFF',
    minHeight: 38,
    maxHeight: 90,
    paddingVertical: 6,
  },
  talkSendBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  talkMicListeningBtn: {
    backgroundColor: THEME.colors.gold,
  },
  talkSendBtnDisabled: {
    backgroundColor: '#2A2740',
  },
  feedbackPronunciation: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12,
    color: '#FDE68A',
    marginTop: 4,
    lineHeight: 18,
  },

  /* SUPERNOVA AUTHENTIC SPOKEN PRACTICE (STEP 4) */
  spokenCoachPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181628',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2D2845',
    gap: 12,
  },
  spokenCoachAvatarWrap: {
    position: 'relative',
  },
  spokenCoachTextCol: {
    flex: 1,
  },
  spokenCoachTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 13,
    color: '#A78BFA',
    marginBottom: 2,
  },
  spokenCoachSubtitle: {
    fontFamily: THEME.fonts.tamilMedium,
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  spokenCoachTamilHint: {
    fontFamily: THEME.fonts.tamilMedium,
    fontSize: 12,
    color: '#B9ADC9',
    lineHeight: 17,
    marginTop: 4,
  },
  spokenCoachOpening: {
    fontSize: 12,
    color: '#DDD0F4',
    lineHeight: 17,
    marginTop: 4,
  },
  spokenPromptAudioBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  realLifeAnswerCard: {
    backgroundColor: '#181628',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2D2845',
    gap: 8,
  },
  realLifeAnswerLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: '#A78BFA',
    letterSpacing: 0.8,
  },
  realLifeAnswerInput: {
    minHeight: 112,
    maxHeight: 180,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#393451',
    backgroundColor: '#11101A',
    padding: 12,
    fontFamily: THEME.fonts.body,
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 21,
  },
  realLifeAnswerHint: {
    fontFamily: THEME.fonts.body,
    fontSize: 11,
    color: '#A39BB4',
  },
  realLifeExampleCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.09)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.28)',
    gap: 9,
  },
  realLifeExampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  realLifeExampleLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: '#C4B5FD',
    letterSpacing: 0.6,
  },
  realLifeExampleText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 21,
  },
  realLifeAlternativeText: {
    fontFamily: THEME.fonts.body,
    fontSize: 13,
    color: '#DDD6FE',
    lineHeight: 19,
  },
  realLifeCoachNote: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: '#C4B5FD',
    lineHeight: 19,
    marginTop: 3,
  },

  targetSentenceCard: {
    backgroundColor: '#1C1930',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    padding: 16,
    gap: 12,
  },
  targetSentenceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  targetSentenceBadge: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: '#A78BFA',
    letterSpacing: 0.8,
  },
  dualSpeedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  speedPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2A244D',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3D3470',
  },
  speedPillBtnActive: {
    borderColor: '#A78BFA',
    backgroundColor: '#3E3478',
  },
  speedPillBtnSnail: {
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  speedPillText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  targetSentenceText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 25,
    letterSpacing: 0.2,
  },

  phraseSelectorContainer: {
    gap: 6,
    marginTop: 2,
  },
  phraseSelectorLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10.5,
    color: '#94A3B8',
    letterSpacing: 0.7,
  },
  phraseScroll: {
    flexGrow: 0,
  },
  phraseChipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  phraseChip: {
    backgroundColor: '#181628',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2E284A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 240,
  },
  phraseChipSelected: {
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    borderColor: '#A78BFA',
  },
  phraseChipText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12,
    color: '#94A3B8',
  },
  phraseChipTextSelected: {
    color: '#FFFFFF',
    fontFamily: THEME.fonts.semiBold,
  },

  micStageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  micPulsingRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  micPulsingRingRecording: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#EF4444',
  },
  micPulsingRingEvaluating: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366F1',
  },
  micCircleBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  micInstructionText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 13,
    color: '#C4B5FD',
    textAlign: 'center',
  },

  feedbackResultCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  feedbackResultCardSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(74, 222, 128, 0.35)',
  },
  feedbackResultCardWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(251, 191, 36, 0.35)',
  },
  feedbackResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedbackScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedbackScoreText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  feedbackStarRating: {
    fontSize: 14,
    letterSpacing: 2,
  },
  spokenTranscriptBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  spokenTranscriptLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: '#A5B4FC',
    letterSpacing: 0.6,
  },
  spokenTranscriptText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 14,
    color: '#F8FAFC',
    lineHeight: 20,
  },
  wordMatchGrid: {
    gap: 6,
  },
  wordMatchGridLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  wordChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  wordChipGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  wordChipTextGreen: {
    fontFamily: THEME.fonts.bold,
    fontSize: 12,
    color: '#4ADE80',
  },
  wordChipRed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  wordChipTextRed: {
    fontFamily: THEME.fonts.bold,
    fontSize: 12,
    color: '#F87171',
    textDecorationLine: 'line-through',
  },
  feedbackTipText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12.5,
    color: '#FDE68A',
    lineHeight: 18,
  },
  feedbackTamilText: {
    fontFamily: THEME.fonts.tamilMedium,
    fontSize: 12.5,
    color: '#E2E8F0',
    lineHeight: 19,
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
    alignItems: 'center',
    justifyContent: 'flex-end',
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
  drawerExpectedText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 12.5,
    color: '#FFFFFF',
    marginTop: 2,
  },
  drawerCorrectionText: {
    fontFamily: THEME.fonts.body,
    fontSize: 12.5,
    color: '#E5E1F7',
    lineHeight: 18,
  },
  drawerTamilRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  drawerTamilNote: {
    fontFamily: THEME.fonts.tamilMedium,
    fontSize: 12.5,
    color: '#F1EFFC',
    lineHeight: 21,
    marginTop: 2,
  },
  dualBtnRow: {
    flexDirection: 'row',
    gap: 10,
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
