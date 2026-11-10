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
import { LinearGradient } from 'expo-linear-gradient';
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
              <MaterialCommunityIcons name="lightbulb-on-outline" size={16} color={THEME.colors.gold} />
              <Text style={styles.slideHeaderPillText}>RULE 1 OF 4</Text>
            </View>

            {/* Miss Nova Coach Advice */}
            <View style={styles.novaCoachCard}>
              <View style={styles.novaCoachAvatarWrap}>
                <Image source={SUPERNOVA_IMAGES.novaAvatar} style={styles.novaCoachAvatar} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.novaCoachTitle}>Miss Nova</Text>
                <Text style={styles.novaCoachText}>
                  Focus on how native speakers build this sentence. Do not translate word-by-word.
                </Text>
              </View>
            </View>

            <Text style={styles.lessonBigTitle}>{lesson.rule.heading}</Text>
            <Text style={styles.ruleExplainText}>{lesson.rule.englishExplanation}</Text>

            {/* Tamil Mental Model Box */}
            <View style={styles.tamilModelCard}>
              <View style={styles.tamilModelHeader}>
                <MaterialCommunityIcons name="translate" size={16} color={THEME.colors.gold} />
                <Text style={styles.tamilModelTitle}>Tamil Mental Model:</Text>
              </View>
              <Text style={styles.tamilModelBody}>{lesson.rule.tamilMentalModel}</Text>
            </View>

            {/* Do's and Don'ts Comparison */}
            <View style={styles.comparisonBox}>
              <View style={styles.wrongBox}>
                <View style={styles.statusRow}>
                  <Ionicons name="close-circle" size={16} color={THEME.colors.error} />
                  <Text style={styles.wrongLabel}>AVOID (தவறு):</Text>
                </View>
                <Text style={styles.wrongSentence}>"{lesson.rule.doAndDont.wrong}"</Text>
              </View>

              <View style={styles.rightBox}>
                <View style={styles.statusRow}>
                  <Ionicons name="checkmark-circle" size={16} color={THEME.colors.success} />
                  <Text style={styles.rightLabel}>SAY THIS (சரி):</Text>
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

              <View style={styles.whyNoteRow}>
                <Ionicons name="information-circle-outline" size={14} color={THEME.colors.textSecondary} style={{ marginRight: 6, marginTop: 1 }} />
                <Text style={styles.whyNote}>{lesson.rule.doAndDont.whyTamil}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ========================================================== */}
        {/* SLIDE 2: SENTENCE SCRAMBLE */}
        {/* ========================================================== */}
        {currentSlide === 'jumble' && (
          <View style={styles.slideCard}>
            <View style={[styles.slideHeaderPill, { borderColor: THEME.colors.secondary }]}>
              <MaterialCommunityIcons name="puzzle-outline" size={16} color={THEME.colors.secondary} />
              <Text style={[styles.slideHeaderPillText, { color: THEME.colors.secondary }]}>
                STEP 2 OF 4 • SENTENCE BUILDER
              </Text>
            </View>

            <Text style={styles.lessonBigTitle}>Arrange in Natural English</Text>
            <Text style={styles.promptSubtitle}>Tap the word tiles in correct order</Text>

            {/* Tamil Prompt Card */}
            <View style={styles.tamilThoughtBanner}>
              <Text style={styles.tamilThoughtLabel}>TAMIL THOUGHT</Text>
              <Text style={styles.tamilThoughtText}>{lesson.jumble.tamilSentence}</Text>
            </View>

            {/* Assembled Sentence Slot Line */}
            <View style={styles.slotLineArea}>
              <Text style={styles.slotHint}>YOUR SENTENCE</Text>
              <View style={styles.wordsWrapRow}>
                {assembledWords.length === 0 ? (
                  <Text style={styles.emptySlotPlaceholder}>Tap words below to build...</Text>
                ) : (
                  assembledWords.map((word, wIdx) => (
                    <TouchableOpacity
                      key={wIdx}
                      style={styles.slotTile}
                      onPress={() => handleTapSlotWord(word, wIdx)}
                    >
                      <Text style={styles.slotTileText}>{word}</Text>
                      <Ionicons name="close" size={12} color="#E2E8F0" style={{ marginLeft: 4 }} />
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
              <MaterialCommunityIcons name="translate" size={16} color={THEME.colors.gold} />
              <Text style={[styles.slideHeaderPillText, { color: THEME.colors.gold }]}>
                STEP 3 OF 4 • TRANSLATION
              </Text>
            </View>

            <Text style={styles.lessonBigTitle}>Pick Natural English</Text>
            <Text style={styles.promptSubtitle}>Select how a native speaker would say this</Text>

            <View style={styles.tamilThoughtBanner}>
              <Text style={styles.tamilThoughtLabel}>TAMIL SENTENCE</Text>
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
              <MaterialCommunityIcons name="microphone-outline" size={16} color={THEME.colors.primaryGlow} />
              <Text style={[styles.slideHeaderPillText, { color: THEME.colors.primaryGlow }]}>
                STEP 4 OF 4 • SPEAKING
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
                  <Text style={styles.missNovaTitle}>Miss Nova</Text>
                  <Text style={styles.missNovaSub}>AI English Coach</Text>
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
            <Text style={styles.suggestLabel}>SAMPLE RESPONSES</Text>
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
                  <Ionicons name="analytics-outline" size={18} color={THEME.colors.secondary} />
                  <Text style={styles.aiScoreText}>
                    Fluency Score: {speakingFeedback.fluencyScore}/100
                  </Text>
                </View>
                <Text style={styles.aiExplainText}>{speakingFeedback.explanation}</Text>
                <View style={styles.whyNoteRow}>
                  <Ionicons name="information-circle-outline" size={14} color={THEME.colors.gold} style={{ marginRight: 6, marginTop: 2 }} />
                  <Text style={styles.aiTamilExplainText}>{speakingFeedback.tamilExplanation}</Text>
                </View>
                <View style={styles.nativeRephraseBox}>
                  <Text style={styles.nativeLabel}>NATURAL REPHRASING</Text>
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
              <Image source={SUPERNOVA_IMAGES.trophyNova} style={styles.victoryTrophyImg} resizeMode="contain" />
            </View>

            <Text style={styles.victoryTitle}>Lesson Complete!</Text>
            <Text style={styles.victorySubtitle}>
              You completed "{lesson.title}". Keep building your daily fluency streak.
            </Text>

            <View style={styles.statsCardGrid}>
              <View style={styles.victoryStatCard}>
                <Ionicons name="flash" size={22} color={THEME.colors.secondary} />
                <Text style={styles.victoryStatVal}>+{lesson.xpReward} XP</Text>
                <Text style={styles.victoryStatLabel}>XP Earned</Text>
              </View>
              <View style={styles.victoryStatCard}>
                <MaterialCommunityIcons name="fire" size={24} color={THEME.colors.gold} />
                <Text style={styles.victoryStatVal}>3 Days</Text>
                <Text style={styles.victoryStatLabel}>Day Streak</Text>
              </View>
              <View style={styles.victoryStatCard}>
                <Ionicons name="checkmark-done-circle" size={22} color={THEME.colors.success} />
                <Text style={styles.victoryStatVal}>100%</Text>
                <Text style={styles.victoryStatLabel}>Accuracy</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.finishContinueTouchable}
              activeOpacity={0.85}
              onPress={() => {
                stopAllAudio();
                onClose();
              }}
            >
              <LinearGradient
                colors={THEME.gradients.primary}
                style={styles.finishContinueBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.finishContinueBtnText}>CONTINUE TO ROADMAP</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </LinearGradient>
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
              style={styles.actionBtnTouchable}
              activeOpacity={0.85}
              onPress={() => setCurrentSlide('jumble')}
            >
              <LinearGradient
                colors={THEME.gradients.primary}
                style={styles.actionButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.btnRowContent}>
                  <Text style={styles.actionBtnText}>CONTINUE</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </View>
              </LinearGradient>
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
                      size={22}
                      color={isJumbleCorrect ? THEME.colors.success : THEME.colors.error}
                    />
                    <Text
                      style={[
                        styles.feedbackHeadline,
                        { color: isJumbleCorrect ? THEME.colors.success : THEME.colors.error },
                      ]}
                    >
                      {isJumbleCorrect ? 'Spot on! Correct sentence.' : 'Incorrect word order'}
                    </Text>
                  </View>
                  {!isJumbleCorrect && (
                    <Text style={styles.jumbleCorrectionNote}>Correct order: {lesson.jumble.correctWords.join(' ')}</Text>
                  )}
                  <TouchableOpacity
                    style={[styles.actionBtnTouchable, { marginTop: 10 }]}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (isJumbleCorrect) {
                        setCurrentSlide('translation');
                      } else {
                        setAvailableWords([...lesson.jumble.scrambledWords]);
                        setAssembledWords([]);
                        setJumbleChecked(false);
                      }
                    }}
                  >
                    <LinearGradient
                      colors={isJumbleCorrect ? THEME.gradients.primary : ['#EF4444', '#DC2626']}
                      style={styles.actionButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <View style={styles.btnRowContent}>
                        <Text style={styles.actionBtnText}>
                          {isJumbleCorrect ? 'CONTINUE' : 'TRY AGAIN'}
                        </Text>
                        <Ionicons
                          name={isJumbleCorrect ? 'arrow-forward' : 'refresh'}
                          size={18}
                          color="#FFFFFF"
                          style={{ marginLeft: 8 }}
                        />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtnTouchable, assembledWords.length === 0 && styles.btnDisabled]}
                  activeOpacity={0.85}
                  onPress={handleCheckJumble}
                  disabled={assembledWords.length === 0}
                >
                  <LinearGradient
                    colors={assembledWords.length > 0 ? THEME.gradients.primary : ['#3D395C', '#28253E']}
                    style={styles.actionButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.actionBtnText}>CHECK ANSWER</Text>
                  </LinearGradient>
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
                      size={22}
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
                        ? 'Great job! Exactly right.'
                        : 'Review this rule:'}
                    </Text>
                  </View>
                  <Text style={styles.jumbleCorrectionNote}>{lesson.translation.explanation}</Text>
                  <Text style={styles.jumbleTamilNote}>{lesson.translation.tamilExplanation}</Text>
                  <TouchableOpacity
                    style={[styles.actionBtnTouchable, { marginTop: 10 }]}
                    activeOpacity={0.85}
                    onPress={() => setCurrentSlide('speaking')}
                  >
                    <LinearGradient
                      colors={THEME.gradients.primary}
                      style={styles.actionButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <View style={styles.btnRowContent}>
                        <Text style={styles.actionBtnText}>PRACTICE SPEAKING</Text>
                        <Ionicons name="mic" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtnTouchable, selectedTransIdx === null && styles.btnDisabled]}
                  activeOpacity={0.85}
                  onPress={handleCheckTranslation}
                  disabled={selectedTransIdx === null}
                >
                  <LinearGradient
                    colors={selectedTransIdx !== null ? THEME.gradients.primary : ['#3D395C', '#28253E']}
                    style={styles.actionButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.actionBtnText}>CHECK ANSWER</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Slide 4 Speaking Action */}
          {currentSlide === 'speaking' && (
            <>
              {speakingFeedback ? (
                <TouchableOpacity
                  style={styles.actionBtnTouchable}
                  activeOpacity={0.85}
                  onPress={handleFinishLesson}
                >
                  <LinearGradient
                    colors={THEME.gradients.accent}
                    style={styles.actionButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <View style={styles.btnRowContent}>
                      <Ionicons name="trophy" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.actionBtnText}>COMPLETE LESSON (+{lesson.xpReward} XP)</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtnTouchable, !spokenText.trim() && styles.btnDisabled]}
                  activeOpacity={0.85}
                  onPress={handleSubmitSpeaking}
                  disabled={!spokenText.trim() || isEvaluating}
                >
                  <LinearGradient
                    colors={spokenText.trim() ? THEME.gradients.primary : ['#3D395C', '#28253E']}
                    style={styles.actionButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isEvaluating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <View style={styles.btnRowContent}>
                        <Ionicons name="mic" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.actionBtnText}>CHECK RESPONSE</Text>
                      </View>
                    )}
                  </LinearGradient>
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
    fontFamily: THEME.fonts.bold,
    fontSize: 14,
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
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.gold,
    letterSpacing: 0.8,
    marginLeft: 6,
  },
  lessonBigTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 22,
    color: THEME.colors.text,
  },
  ruleExplainText: {
    fontFamily: THEME.fonts.body,
    fontSize: 15,
    color: THEME.colors.text,
    lineHeight: 22,
  },
  promptSubtitle: {
    fontFamily: THEME.fonts.body,
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
    fontFamily: THEME.fonts.bold,
    fontSize: 13,
    color: THEME.colors.gold,
    marginLeft: 6,
  },
  tamilModelBody: {
    fontFamily: THEME.fonts.bodyMedium,
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
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.error,
    marginLeft: 6,
  },
  rightLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.success,
    marginLeft: 6,
    flex: 1,
  },
  wrongSentence: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 14,
    color: THEME.colors.text,
    marginTop: 4,
  },
  rightSentence: {
    fontFamily: THEME.fonts.bold,
    fontSize: 14,
    color: THEME.colors.text,
    marginTop: 4,
  },
  speakerBtn: {
    padding: 2,
  },
  whyNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  whyNote: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    flex: 1,
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
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.gold,
  },
  tamilThoughtText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 16,
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
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginBottom: 8,
  },
  emptySlotPlaceholder: {
    fontFamily: THEME.fonts.body,
    fontSize: 13,
    color: THEME.colors.textMuted,
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
    borderRadius: 12,
    borderBottomWidth: 3,
    borderBottomColor: THEME.colors.primaryBorder,
    shadowColor: '#7F43FE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  slotTileText: {
    fontFamily: THEME.fonts.bold,
    color: '#FFFFFF',
    fontSize: 15,
  },
  wordBankWrap: {
    paddingVertical: 12,
  },
  bankTile: {
    backgroundColor: '#221F36',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#3D395C',
    borderBottomWidth: 4,
    borderBottomColor: '#12111E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  bankTileText: {
    fontFamily: THEME.fonts.bold,
    color: '#FFFFFF',
    fontSize: 15,
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
    backgroundColor: 'rgba(127, 67, 254, 0.12)',
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
    fontFamily: THEME.fonts.semiBold,
    fontSize: 14,
    color: THEME.colors.text,
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
    transform: [{ scale: 1.08 }],
  },
  missNovaTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 14,
    color: THEME.colors.text,
  },
  missNovaSub: {
    fontFamily: THEME.fonts.body,
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  missNovaSpeechText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 15,
    color: THEME.colors.primaryGlow,
    lineHeight: 22,
  },
  suggestLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
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
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  speakingInput: {
    fontFamily: THEME.fonts.bodyMedium,
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
    fontFamily: THEME.fonts.bold,
    fontSize: 14,
    color: THEME.colors.secondary,
    marginLeft: 6,
  },
  aiExplainText: {
    fontFamily: THEME.fonts.body,
    fontSize: 13,
    color: THEME.colors.text,
  },
  aiTamilExplainText: {
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 12,
    color: THEME.colors.gold,
    flex: 1,
  },
  nativeRephraseBox: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  nativeLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.secondary,
  },
  nativeText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 13,
    color: THEME.colors.text,
    marginTop: 2,
  },

  novaCoachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(127, 67, 254, 0.12)',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(127, 67, 254, 0.3)',
    marginBottom: 4,
  },
  novaCoachAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: THEME.colors.primaryGlow,
  },
  novaCoachAvatar: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.08 }],
  },
  novaCoachTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 12,
    color: THEME.colors.primaryGlow,
  },
  novaCoachText: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },

  // Victory Styles
  victoryContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  victoryTrophyCircle: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#181724',
    borderWidth: 3,
    borderColor: THEME.colors.gold,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  victoryTrophyImg: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.08 }],
  },
  victoryTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 28,
    color: THEME.colors.text,
  },
  victorySubtitle: {
    fontFamily: THEME.fonts.body,
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
    lineHeight: 20,
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
    fontFamily: THEME.fonts.bold,
    fontSize: 15,
    color: THEME.colors.text,
    marginTop: 4,
  },
  victoryStatLabel: {
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  finishContinueTouchable: {
    width: '100%',
    marginTop: 10,
    borderRadius: 28,
    borderBottomWidth: 4,
    borderBottomColor: '#5B21B6',
    shadowColor: '#7F43FE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  finishContinueBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 28,
  },
  finishContinueBtnText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Bottom Action Drawer
  bottomActionDrawer: {
    backgroundColor: THEME.colors.surfaceDark,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  actionBtnTouchable: {
    width: '100%',
    borderRadius: 16,
    borderBottomWidth: 4,
    borderBottomColor: '#5B21B6',
    shadowColor: '#7F43FE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonGradient: {
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  btnDisabled: {
    opacity: 0.5,
    borderBottomColor: '#201D33',
  },
  feedbackDrawerContent: {
    gap: 6,
  },
  feedbackHeadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedbackHeadline: {
    fontFamily: THEME.fonts.bold,
    fontSize: 15,
    marginLeft: 8,
  },
  jumbleCorrectionNote: {
    fontFamily: THEME.fonts.body,
    fontSize: 13,
    color: THEME.colors.text,
    marginTop: 2,
  },
  jumbleTamilNote: {
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 12,
    color: THEME.colors.gold,
    marginTop: 2,
  },
});

