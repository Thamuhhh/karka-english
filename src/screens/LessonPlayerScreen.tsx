import React, { useState, useEffect, useRef } from 'react';
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
import { UserStats, GrammarCorrection, ChatMessage } from '../types';
import {
  speakText,
  speakTamil,
  speakBilingualSequence,
  BilingualSpeechSegment,
  stopAllAudio,
} from '../services/ttsService';
import {
  checkLessonTranslation,
  sendLessonRealTalkReply,
  TranslationEvalResult,
} from '../api/supernovaAi';
import { playSoundEffect } from '../services/soundEffectsService';

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
  const [currentSlide, setCurrentSlide] = useState<SlideType>('rule');
  const [hearts, setHearts] = useState(Math.max(0, initialHearts));
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const slideScrollRef = useRef<ScrollView>(null);

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
  const [showJumbleHint, setShowJumbleHint] = useState(false);
  const [jumbleChecked, setJumbleChecked] = useState(false);
  const [isJumbleCorrect, setIsJumbleCorrect] = useState(false);

  // Slide 3: Active English Q&A Translation State
  const [transMode, setTransMode] = useState<'type' | 'choices'>('type');
  const [typedAnswer, setTypedAnswer] = useState('');
  const [selectedTransIdx, setSelectedTransIdx] = useState<number | null>(null);
  const [isCheckingTrans, setIsCheckingTrans] = useState(false);
  const [transEval, setTransEval] = useState<TranslationEvalResult | null>(null);

  // Slide 4: Conversational Real Talk State
  const [realTalkMessages, setRealTalkMessages] = useState<ChatMessage[]>([
    {
      id: 'init-nila',
      role: 'assistant',
      content: lesson.speakingChallenge.missNovaQuestion,
      timestamp: Date.now(),
    },
  ]);
  const [replyDraft, setReplyDraft] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [lastTurnFeedback, setLastTurnFeedback] = useState<GrammarCorrection | null>(null);

  const tamilClassSegments: BilingualSpeechSegment[] = [
    { text: 'வணக்கம்! இன்று நாம் கற்றுக்கொள்ள போவது:', lang: 'ta-IN' },
    { text: lesson.rule.tamilMentalModel, lang: 'ta-IN' },
    { text: 'இதை தவறாக இப்படி சொல்லக் கூடாது:', lang: 'ta-IN' },
    { text: lesson.rule.doAndDont.wrong, lang: 'en' },
    { text: 'சரியாக இப்படி சொல்லுங்கள்:', lang: 'ta-IN' },
    { text: lesson.rule.doAndDont.right, lang: 'en' },
    { text: lesson.rule.doAndDont.whyTamil, lang: 'ta-IN' },
  ];

  const handlePlayVoice = (text: string, id: string) => {
    stopAllAudio();
    setPlayingAudioId(id);
    speakText(text, () => setPlayingAudioId(null));
  };

  const handlePlayTamilVoice = (text: string, id: string) => {
    stopAllAudio();
    setPlayingAudioId(id);
    speakTamil(text, () => setPlayingAudioId(null));
  };

  const handlePlayTamilLecture = () => {
    stopAllAudio();
    setPlayingAudioId('teacher-lecture');
    speakBilingualSequence(tamilClassSegments, () => setPlayingAudioId(null));
  };

  const handleStopVoice = () => {
    stopAllAudio();
    setPlayingAudioId(null);
  };

  // Auto-speak Teacher Tamil lecture on Stage 1 and Nila opening question on Stage 4
  useEffect(() => {
    if (voiceMuted) return;
    if (currentSlide === 'rule') {
      handlePlayTamilLecture();
    } else if (currentSlide === 'speaking') {
      const firstLine = lesson.speakingChallenge.missNovaQuestion;
      handlePlayVoice(firstLine, 'init-nila');
    }
    return () => {
      stopAllAudio();
      setPlayingAudioId(null);
    };
  }, [currentSlide]);

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

  // Stage 2: Jumble Word Matching Handlers
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

  // Stage 4: Conversational Real Talk Handler
  const handleSendRealTalk = async (overrideText?: string) => {
    const text = (overrideText ?? replyDraft).trim();
    if (!text || isReplying) return;

    stopAllAudio();
    setPlayingAudioId(null);
    setReplyDraft('');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    const nextHistory = [...realTalkMessages, userMsg];
    setRealTalkMessages(nextHistory);
    setIsReplying(true);

    setTimeout(() => {
      slideScrollRef.current?.scrollToEnd({ animated: true });
    }, 80);

    try {
      const { reply, feedback } = await sendLessonRealTalkReply(nextHistory, text, lesson);
      setLastTurnFeedback(feedback);
      setChecksTotal((prev) => prev + 1);
      if (feedback.fluencyScore >= 70) {
        setChecksCorrect((prev) => prev + 1);
      }

      const nilaMsgId = `nila-${Date.now()}`;
      const nilaMsg: ChatMessage = {
        id: nilaMsgId,
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
      };
      setRealTalkMessages((prev) => [...prev, nilaMsg]);
      if (!feedback.hasErrors) {
        playSoundEffect('success');
      }
      if (!voiceMuted) {
        handlePlayVoice(reply, nilaMsgId);
      }
      setTimeout(() => {
        slideScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (e) {
      console.warn('Real talk error:', e);
    } finally {
      setIsReplying(false);
    }
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
  const userTalkTurns = realTalkMessages.filter((m) => m.role === 'user').length;
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
        {/* STAGE 1: TEACHER CLASS LECTURE (Nila explains like a tutor)  */}
        {/* ============================================================ */}
        {currentSlide === 'rule' && (
          <View style={styles.slideBody}>
            <Text style={styles.stepEyebrow}>STEP 01 · CLASS LECTURE</Text>

            {/* Interactive Teacher Walkthrough Header */}
            <View style={styles.teacherBanner}>
              <View style={styles.teacherAvatarRing}>
                <Image source={SUPERNOVA_IMAGES.novaAvatar} style={styles.teacherAvatarImg} />
              </View>
              <View style={{ flex: 1, marginLeft: 11 }}>
                <Text style={styles.teacherName}>Nila · Tamil Tutor</Text>
                <Text style={styles.teacherStatus}>
                  {playingAudioId === 'teacher-lecture'
                    ? 'தமிழில் விளக்குகிறேன்...'
                    : 'தமிழில் பாடம் கேட்கலாம்'}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.teacherPlayBtn,
                  playingAudioId === 'teacher-lecture' && styles.teacherPlayBtnActive,
                ]}
                onPress={() =>
                  playingAudioId === 'teacher-lecture'
                    ? handleStopVoice()
                    : handlePlayTamilLecture()
                }
                activeOpacity={0.8}
              >
                <Ionicons
                  name={playingAudioId === 'teacher-lecture' ? 'stop' : 'play'}
                  size={13}
                  color="#FFFFFF"
                />
                <Text style={styles.teacherPlayText}>
                  {playingAudioId === 'teacher-lecture' ? 'Stop' : 'Hear Tamil'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.slideTitle}>{lesson.rule.heading}</Text>

            <View style={styles.tamilInsightCard}>
              <View style={styles.promptTopRow}>
                <Text style={styles.tamilInsightEyebrow}>THINK IN TAMIL</Text>
                <TouchableOpacity
                  style={styles.audioIconBtn}
                  onPress={() =>
                    handlePlayTamilVoice(lesson.rule.tamilMentalModel, 'tamil-model')
                  }
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons
                    name={
                      playingAudioId === 'tamil-model' ? 'volume-high' : 'volume-medium-outline'
                    }
                    size={18}
                    color={THEME.colors.primaryGlow}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.tamilInsightBody}>{lesson.rule.tamilMentalModel}</Text>
            </View>

            <Text style={styles.ruleExplainText}>{lesson.rule.englishExplanation}</Text>

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
                      name={
                        playingAudioId === 'right-audio' ? 'volume-high' : 'volume-medium-outline'
                      }
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

        {/* ============================================================ */}
        {/* STAGE 2: TAMIL -> ENGLISH JUMBLED WORD MATCH                 */}
        {/* ============================================================ */}
        {currentSlide === 'jumble' && (
          <View style={styles.slideBody}>
            <Text style={styles.stepEyebrow}>STEP 02 · WORD MATCH</Text>
            <Text style={styles.slideTitle}>Match the Jumbled English</Text>
            <Text style={styles.slideSubtitle}>
              Read the Tamil sentence and tap English words in the right order.
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

            <View style={styles.answerDropzone}>
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
                    Tap jumbled words below to form the sentence
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
                {lesson.translation.options.map((opt, oIdx) => {
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
        {/* STAGE 4: CONVERSATIONAL REAL TALK (Live multi-turn dialogue) */}
        {/* ============================================================ */}
        {currentSlide === 'speaking' && (
          <View style={styles.slideBody}>
            <View style={styles.stepHeaderRow}>
              <Text style={styles.stepEyebrow}>STEP 04 · REAL TALK</Text>
              <View style={styles.turnPill}>
                <Text style={styles.turnPillText}>
                  {userTalkTurns === 0 ? 'Reply to start' : `${userTalkTurns} Turn${userTalkTurns > 1 ? 's' : ''}`}
                </Text>
              </View>
            </View>

            <Text style={styles.slideTitle}>Talk with Nila</Text>
            <Text style={styles.slideSubtitle}>{lesson.speakingChallenge.prompt}</Text>

            {/* Conversational Dialogue Thread */}
            <View style={styles.chatThreadCard}>
              {realTalkMessages.map((msg) => {
                const isNila = msg.role === 'assistant';
                return (
                  <View
                    key={msg.id}
                    style={[styles.chatRow, isNila ? styles.chatRowLeft : styles.chatRowRight]}
                  >
                    {isNila && (
                      <View style={styles.chatAvatarSmall}>
                        <Image source={SUPERNOVA_IMAGES.novaAvatar} style={styles.chatAvatarImg} />
                      </View>
                    )}

                    <View
                      style={[
                        styles.chatBubble,
                        isNila ? styles.nilaBubble : styles.userBubble,
                      ]}
                    >
                      <Text style={styles.chatBubbleText}>{msg.content}</Text>
                      {isNila && (
                        <TouchableOpacity
                          onPress={() => handlePlayVoice(msg.content, msg.id)}
                          style={styles.bubbleAudioRow}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons
                            name={
                              playingAudioId === msg.id ? 'volume-high' : 'volume-medium-outline'
                            }
                            size={14}
                            color="#C4B5FD"
                          />
                          <Text style={styles.bubbleAudioText}>Listen</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}

              {isReplying && (
                <View style={[styles.chatRow, styles.chatRowLeft]}>
                  <View style={styles.chatAvatarSmall}>
                    <Image source={SUPERNOVA_IMAGES.novaAvatar} style={styles.chatAvatarImg} />
                  </View>
                  <View style={[styles.chatBubble, styles.nilaBubble]}>
                    <Text style={styles.typingText}>Nila is replying...</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Inline Coach Feedback on Latest User Turn */}
            {lastTurnFeedback && (
              <View style={styles.realTalkCoachCard}>
                <View style={styles.feedbackTopBar}>
                  <Text style={styles.feedbackTitle}>Nila Tamil Coach</Text>
                  <View style={styles.promptActionGroup}>
                    <TouchableOpacity
                      style={styles.audioIconBtn}
                      onPress={() =>
                        handlePlayTamilVoice(lastTurnFeedback.tamilExplanation, 'realtalk-tamil')
                      }
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons
                        name={
                          playingAudioId === 'realtalk-tamil'
                            ? 'volume-high'
                            : 'volume-medium-outline'
                        }
                        size={17}
                        color={THEME.colors.primaryGlow}
                      />
                    </TouchableOpacity>
                    <View style={styles.scoreBadge}>
                      <Text style={styles.scoreBadgeText}>{lastTurnFeedback.fluencyScore}/100</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.feedbackTamil}>{lastTurnFeedback.tamilExplanation}</Text>
                <Text style={styles.feedbackEnglish}>{lastTurnFeedback.explanation}</Text>
              </View>
            )}

            {/* Quick Idea Starters */}
            <View style={styles.sampleBlock}>
              <Text style={styles.sampleSectionLabel}>CONVERSATION IDEAS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.sampleChipsRow}>
                  {lesson.speakingChallenge.suggestedAnswers.map((ans, aIdx) => (
                    <TouchableOpacity
                      key={aIdx}
                      style={styles.sampleChip}
                      onPress={() => setReplyDraft(ans)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.sampleChipText}>"{ans}"</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Chat Reply Composer */}
            <View style={styles.talkComposerRow}>
              <TextInput
                style={styles.talkInput}
                placeholder="Reply naturally to Nila..."
                placeholderTextColor={THEME.colors.textMuted}
                value={replyDraft}
                onChangeText={setReplyDraft}
                multiline
                maxLength={240}
              />
              <TouchableOpacity
                style={[
                  styles.talkSendBtn,
                  (!replyDraft.trim() || isReplying) && styles.talkSendBtnDisabled,
                ]}
                onPress={() => handleSendRealTalk()}
                disabled={!replyDraft.trim() || isReplying}
                activeOpacity={0.85}
              >
                {isReplying ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* STAGE 5: LESSON COMPLETE SUMMARY                             */}
        {/* ============================================================ */}
        {currentSlide === 'victory' && (
          <View style={styles.victoryContainer}>
            <View style={styles.victoryCrestWrap}>
              <Image
                source={SUPERNOVA_IMAGES.trophyNova}
                style={styles.victoryCrestImg}
                resizeMode="cover"
              />
            </View>

            <Text style={styles.victoryEyebrow}>CLASS COMPLETED</Text>
            <Text style={styles.victoryTitle}>{shortTitle}</Text>
            <Text style={styles.victorySubtitle}>
              Pattern explained, words matched, Q&amp;A answered, and spoken live with Nila.
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
                label="Start Practice"
                icon="arrow-forward"
                onPress={() => goToSlide('jumble')}
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
                        <Ionicons
                          name={transEval.isCorrect ? 'checkmark-circle' : 'alert-circle'}
                          size={19}
                          color={transEval.isCorrect ? '#C4B5FD' : '#E2B94B'}
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
                label={
                  userTalkTurns === 0
                    ? 'Reply to Nila First'
                    : `Complete Class (+${lesson.xpReward} XP)`
                }
                iconLeft={userTalkTurns > 0 ? 'checkmark-done' : 'chatbubble-ellipses-outline'}
                disabled={userTalkTurns === 0}
                onPress={handleFinishLesson}
              />
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

  /* STAGE 1: TEACHER MODE */
  teacherBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171625',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2B2842',
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  teacherAvatarRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(167, 139, 250, 0.55)',
    backgroundColor: '#222036',
  },
  teacherAvatarImg: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.05 }],
  },
  teacherName: {
    fontFamily: THEME.fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  teacherStatus: {
    fontFamily: THEME.fonts.tamil,
    fontSize: 11.5,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginTop: 1,
  },
  teacherPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2546',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 5,
  },
  teacherPlayBtnActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: '#C4B5FD',
  },
  teacherPlayText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  ruleExplainText: {
    fontFamily: THEME.fonts.body,
    fontSize: 14.5,
    color: '#D7D3EB',
    lineHeight: 22,
  },
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

  /* STAGE 4: REAL TALK CONVERSATION */
  turnPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#1B192B',
    borderWidth: 1,
    borderColor: '#302C4A',
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
  talkSendBtnDisabled: {
    backgroundColor: '#2A2740',
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
