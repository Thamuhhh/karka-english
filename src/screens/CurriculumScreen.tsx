import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { DEEP_CURRICULUM, DeepLevelCourse, DeepClassLesson } from '../constants/curriculum';
import { speakText, stopAllAudio } from '../services/ttsService';
import { addXp, incrementMetric } from '../services/storageService';

type LessonStep = 'concept' | 'dos_and_donts' | 'dialogue' | 'quiz' | 'celebration';

export const CurriculumScreen: React.FC = () => {
  const [activeLesson, setActiveLesson] = useState<DeepClassLesson | null>(null);
  const [currentStep, setCurrentStep] = useState<LessonStep>('concept');
  const [completedClasses, setCompletedClasses] = useState<string[]>(['cls-1-1']);

  // Quiz State
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [scoreCount, setScoreCount] = useState(0);

  // Audio State
  const [playingId, setPlayingId] = useState<string | null>(null);

  const handleOpenLesson = (lesson: DeepClassLesson) => {
    setActiveLesson(lesson);
    setCurrentStep('concept');
    setQuizIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScoreCount(0);
    stopAllAudio();
  };

  const handlePlayAudio = (text: string, id: string) => {
    setPlayingId(id);
    speakText(text, () => setPlayingId(null));
  };

  const handleQuizAnswer = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(idx);
    setIsAnswerSubmitted(true);
    if (activeLesson && idx === activeLesson.quizQuestions[quizIndex]?.correctIndex) {
      setScoreCount((prev) => prev + 1);
    }
  };

  const handleNextQuizQuestion = () => {
    if (!activeLesson) return;
    if (quizIndex < activeLesson.quizQuestions.length - 1) {
      setQuizIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      // Finished all quiz questions -> Move to Celebration!
      handleFinishLesson();
    }
  };

  const handleFinishLesson = async () => {
    if (activeLesson) {
      if (!completedClasses.includes(activeLesson.id)) {
        setCompletedClasses([...completedClasses, activeLesson.id]);
        await addXp(100); // 100 XP Stardust reward!
        await incrementMetric('wordsMastered', 2);
      }
    }
    setCurrentStep('celebration');
  };

  return (
    <View style={styles.container}>
      {/* Top Cosmic Header Stats */}
      <View style={styles.topStatsBar}>
        <View style={styles.statPill}>
          <MaterialCommunityIcons name="fire" size={18} color={THEME.colors.gold} />
          <Text style={styles.statPillText}>3 Day Streak</Text>
        </View>

        <View style={styles.statPill}>
          <Ionicons name="sparkles" size={16} color={THEME.colors.secondary} />
          <Text style={styles.statPillText}>550 XP</Text>
        </View>

        <View style={styles.statPill}>
          <Ionicons name="heart" size={16} color="#EF4444" />
          <Text style={styles.statPillText}>5 / 5</Text>
        </View>
      </View>

      <ScrollView style={styles.roadmapScroll} contentContainerStyle={styles.roadmapContent}>
        {DEEP_CURRICULUM.map((level, lIdx) => {
          return (
            <View key={level.levelNumber} style={styles.levelSection}>
              {/* Level Planet Header */}
              <View style={[styles.planetHeader, { borderColor: level.planetColor }]}>
                <View style={styles.planetHeaderLeft}>
                  <Text style={styles.planetBadge}>LEVEL {level.levelNumber} • {level.cefrTag}</Text>
                  <Text style={styles.planetTitle}>{level.levelTitle}</Text>
                  <Text style={styles.planetSubtitle}>{level.subtitle}</Text>
                </View>
                <View style={[styles.planetIconCircle, { backgroundColor: level.planetColor }]}>
                  <MaterialCommunityIcons name="orbit" size={26} color={THEME.colors.text} />
                </View>
              </View>

              {/* Connected Winding Roadmap Nodes */}
              <View style={styles.nodesContainer}>
                {level.classes.map((cls, cIdx) => {
                  const isCompleted = completedClasses.includes(cls.id);
                  const isCurrent = !isCompleted && (cIdx === 0 || completedClasses.includes(level.classes[cIdx - 1]?.id));

                  // Alternating node positions for a gamified snake path: 0 = center, 1 = right, 2 = left, 3 = center
                  const alignStyles = [
                    styles.nodeCenter,
                    styles.nodeRight,
                    styles.nodeLeft,
                    styles.nodeCenter,
                  ][cIdx % 4];

                  return (
                    <View key={cls.id} style={[styles.nodeWrapper, alignStyles]}>
                      {/* Active "START" Pulsing Bubble */}
                      {isCurrent && (
                        <View style={styles.startBubble}>
                          <Text style={styles.startBubbleText}>START CLASS</Text>
                          <View style={styles.bubbleArrow} />
                        </View>
                      )}

                      <TouchableOpacity
                        style={[
                          styles.roadmapNode,
                          isCompleted && styles.nodeCompleted,
                          isCurrent && styles.nodeCurrent,
                        ]}
                        activeOpacity={0.8}
                        onPress={() => handleOpenLesson(cls)}
                      >
                        <MaterialCommunityIcons
                          name={
                            isCompleted
                              ? 'check-bold'
                              : isCurrent
                              ? 'play'
                              : 'lock'
                          }
                          size={24}
                          color={THEME.colors.text}
                        />
                      </TouchableOpacity>

                      <View style={styles.nodeLabelBox}>
                        <Text style={styles.nodeTitleText} numberOfLines={1}>
                          {cls.title}
                        </Text>
                        <Text style={styles.nodeSubText}>{cls.duration}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ============================================================== */}
      {/* DEEP INTERACTIVE CLASS MODAL (5-Stage Step Flow) */}
      {/* ============================================================== */}
      {activeLesson && (
        <Modal visible transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.lessonModalContainer}>
              {/* Top Progress & Close Bar */}
              <View style={styles.lessonTopBar}>
                <TouchableOpacity
                  onPress={() => setActiveLesson(null)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={24} color={THEME.colors.textSecondary} />
                </TouchableOpacity>

                {/* Step Progress Dots */}
                <View style={styles.stepProgressContainer}>
                  {(['concept', 'dos_and_donts', 'dialogue', 'quiz'] as LessonStep[]).map((st, sIdx) => {
                    const stepOrder: LessonStep[] = ['concept', 'dos_and_donts', 'dialogue', 'quiz', 'celebration'];
                    const currentIdx = stepOrder.indexOf(currentStep);
                    const isDone = currentIdx >= sIdx;

                    return (
                      <View
                        key={st}
                        style={[
                          styles.stepProgressSegment,
                          isDone && styles.stepProgressSegmentActive,
                        ]}
                      />
                    );
                  })}
                </View>

                <View style={styles.xpRewardPill}>
                  <Ionicons name="sparkles" size={14} color={THEME.colors.gold} />
                  <Text style={styles.xpRewardPillText}>+100 XP</Text>
                </View>
              </View>

              {/* Stage Body */}
              <ScrollView style={styles.lessonStageScroll} contentContainerStyle={{ padding: 20 }}>
                {/* -------------------------------------------------------- */}
                {/* STAGE 1: THE CONCEPT & TAMIL MENTAL MODEL */}
                {/* -------------------------------------------------------- */}
                {currentStep === 'concept' && (
                  <View style={styles.stageBox}>
                    <View style={styles.stageTagRow}>
                      <MaterialCommunityIcons name="lightbulb-on" size={18} color={THEME.colors.gold} />
                      <Text style={styles.stageTagText}>STAGE 1: THE CORE MINDSET</Text>
                    </View>

                    <Text style={styles.stageHeading}>{activeLesson.title}</Text>
                    <Text style={styles.grammarFocusTag}>Focus: {activeLesson.grammarFocus}</Text>

                    <Text style={styles.conceptSummaryText}>{activeLesson.conceptSummary}</Text>

                    {/* Tamil Mental Model Box */}
                    <View style={styles.tamilMentalCard}>
                      <View style={styles.tamilCardHeader}>
                        <MaterialCommunityIcons name="translate" size={18} color={THEME.colors.gold} />
                        <Text style={styles.tamilCardTitle}>தமிழ் சிந்தனை முறை விளக்கம்:</Text>
                      </View>
                      <Text style={styles.tamilCardBody}>{activeLesson.tamilMentalModel}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.primaryStageBtn}
                      onPress={() => setCurrentStep('dos_and_donts')}
                    >
                      <Text style={styles.primaryStageBtnText}>Next: Do's & Don'ts</Text>
                      <Ionicons name="arrow-forward" size={18} color={THEME.colors.text} style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* -------------------------------------------------------- */}
                {/* STAGE 2: DO'S & DON'TS (ERROR BUSTER) */}
                {/* -------------------------------------------------------- */}
                {currentStep === 'dos_and_donts' && (
                  <View style={styles.stageBox}>
                    <View style={styles.stageTagRow}>
                      <MaterialCommunityIcons name="scale-balance" size={18} color={THEME.colors.secondary} />
                      <Text style={[styles.stageTagText, { color: THEME.colors.secondary }]}>
                        STAGE 2: ERROR BUSTER
                      </Text>
                    </View>

                    <Text style={styles.stageHeading}>Common Mistakes & Fixes</Text>
                    <Text style={styles.stageSubtext}>Compare how wrong habits sound vs the natural native way:</Text>

                    {activeLesson.dosAndDonts.map((item, dIdx) => (
                      <View key={dIdx} style={styles.doDontCard}>
                        {/* Incorrect Box */}
                        <View style={styles.dontBox}>
                          <View style={styles.statusIndicatorRow}>
                            <Ionicons name="close-circle" size={16} color={THEME.colors.error} />
                            <Text style={styles.dontLabel}>AVOID THIS (தவறு):</Text>
                          </View>
                          <Text style={styles.dontSentence}>"{item.incorrect}"</Text>
                        </View>

                        {/* Correct Box */}
                        <View style={styles.doBox}>
                          <View style={styles.statusIndicatorRow}>
                            <Ionicons name="checkmark-circle" size={16} color={THEME.colors.success} />
                            <Text style={styles.doLabel}>SAY THIS INSTEAD (சரி):</Text>
                            <TouchableOpacity
                              style={styles.miniSpeaker}
                              onPress={() => handlePlayAudio(item.correct, `dont-${dIdx}`)}
                            >
                              <Ionicons
                                name={playingId === `dont-${dIdx}` ? 'volume-high' : 'volume-medium-outline'}
                                size={18}
                                color={THEME.colors.primaryGlow}
                              />
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.doSentence}>"{item.correct}"</Text>
                        </View>

                        {/* Why in Tamil */}
                        <View style={styles.whyBox}>
                          <Text style={styles.whyText}>💡 {item.whyTamil}</Text>
                        </View>
                      </View>
                    ))}

                    <View style={styles.btnRow}>
                      <TouchableOpacity
                        style={styles.backStageBtn}
                        onPress={() => setCurrentStep('concept')}
                      >
                        <Ionicons name="arrow-back" size={18} color={THEME.colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.primaryStageBtn, { flex: 1, marginLeft: 10 }]}
                        onPress={() => setCurrentStep('dialogue')}
                      >
                        <Text style={styles.primaryStageBtnText}>Next: Real Dialogue</Text>
                        <Ionicons name="arrow-forward" size={18} color={THEME.colors.text} style={{ marginLeft: 6 }} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* -------------------------------------------------------- */}
                {/* STAGE 3: DIALOGUE & SHADOWING LAB */}
                {/* -------------------------------------------------------- */}
                {currentStep === 'dialogue' && (
                  <View style={styles.stageBox}>
                    <View style={styles.stageTagRow}>
                      <MaterialCommunityIcons name="chat-processing" size={18} color={THEME.colors.primaryGlow} />
                      <Text style={styles.stageTagText}>STAGE 3: CONVERSATION LAB</Text>
                    </View>

                    <Text style={styles.stageHeading}>Interactive Conversation</Text>
                    <Text style={styles.stageSubtext}>Listen closely to the conversational flow and tone:</Text>

                    {/* Dialogue Turns */}
                    <View style={styles.dialogueList}>
                      {activeLesson.dialogue.map((turn, tIdx) => (
                        <View key={tIdx} style={styles.dialogueBubbleCard}>
                          <View style={styles.speakerRow}>
                            <Text style={styles.speakerAvatar}>{turn.avatar}</Text>
                            <Text style={styles.speakerName}>{turn.speaker}</Text>
                            <TouchableOpacity
                              style={styles.miniSpeaker}
                              onPress={() => handlePlayAudio(turn.text, `turn-${tIdx}`)}
                            >
                              <Ionicons
                                name={playingId === `turn-${tIdx}` ? 'volume-high' : 'volume-medium-outline'}
                                size={18}
                                color={THEME.colors.primaryGlow}
                              />
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.dialogueEnglishText}>{turn.text}</Text>
                          <Text style={styles.dialogueTamilText}>{turn.tamilMeaning}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Shadowing Phrases */}
                    <Text style={[styles.stageHeading, { marginTop: 16 }]}>🗣️ Shadowing Practice:</Text>
                    <Text style={styles.stageSubtext}>Listen and repeat these phrases aloud:</Text>

                    {activeLesson.shadowingPhrases.map((phrase, pIdx) => (
                      <TouchableOpacity
                        key={pIdx}
                        style={styles.shadowCard}
                        onPress={() => handlePlayAudio(phrase.english, `shadow-${pIdx}`)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.shadowEnglish}>{phrase.english}</Text>
                          <Text style={styles.shadowPhonetic}>{phrase.phonetic}</Text>
                          <Text style={styles.shadowContext}>💡 {phrase.tamilContext}</Text>
                        </View>
                        <Ionicons
                          name={playingId === `shadow-${pIdx}` ? 'volume-high' : 'volume-medium-outline'}
                          size={24}
                          color={THEME.colors.primaryGlow}
                        />
                      </TouchableOpacity>
                    ))}

                    <View style={styles.btnRow}>
                      <TouchableOpacity
                        style={styles.backStageBtn}
                        onPress={() => setCurrentStep('dos_and_donts')}
                      >
                        <Ionicons name="arrow-back" size={18} color={THEME.colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.primaryStageBtn, { flex: 1, marginLeft: 10 }]}
                        onPress={() => setCurrentStep('quiz')}
                      >
                        <Text style={styles.primaryStageBtnText}>Next: Mastery Quiz</Text>
                        <Ionicons name="arrow-forward" size={18} color={THEME.colors.text} style={{ marginLeft: 6 }} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* -------------------------------------------------------- */}
                {/* STAGE 4: MULTI-QUESTION MASTERY QUIZ */}
                {/* -------------------------------------------------------- */}
                {currentStep === 'quiz' && (
                  <View style={styles.stageBox}>
                    <View style={styles.stageTagRow}>
                      <MaterialCommunityIcons name="trophy" size={18} color={THEME.colors.gold} />
                      <Text style={[styles.stageTagText, { color: THEME.colors.gold }]}>
                        STAGE 4: MASTERY QUIZ ({quizIndex + 1}/{activeLesson.quizQuestions.length})
                      </Text>
                    </View>

                    <Text style={styles.quizMainQuestion}>
                      {activeLesson.quizQuestions[quizIndex]?.question}
                    </Text>

                    <View style={styles.quizOptionsList}>
                      {activeLesson.quizQuestions[quizIndex]?.options.map((opt, oIdx) => {
                        const isSelected = selectedOption === oIdx;
                        const isCorrect = oIdx === activeLesson.quizQuestions[quizIndex]?.correctIndex;

                        let optionStyle: any = styles.quizOptionPill;
                        if (isAnswerSubmitted) {
                          if (isCorrect) optionStyle = [styles.quizOptionPill, styles.optionCorrect];
                          else if (isSelected) optionStyle = [styles.quizOptionPill, styles.optionWrong];
                        } else if (isSelected) {
                          optionStyle = [styles.quizOptionPill, styles.optionSelected];
                        }

                        return (
                          <TouchableOpacity
                            key={oIdx}
                            style={optionStyle}
                            onPress={() => handleQuizAnswer(oIdx)}
                          >
                            <Text style={styles.quizOptionPillText}>{opt}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Feedback after answer */}
                    {isAnswerSubmitted && (
                      <View style={styles.quizFeedbackBox}>
                        <View style={styles.feedbackHeaderRow}>
                          <Ionicons
                            name={
                              selectedOption === activeLesson.quizQuestions[quizIndex]?.correctIndex
                                ? 'checkmark-circle'
                                : 'close-circle'
                            }
                            size={20}
                            color={
                              selectedOption === activeLesson.quizQuestions[quizIndex]?.correctIndex
                                ? THEME.colors.success
                                : THEME.colors.error
                            }
                          />
                          <Text
                            style={[
                              styles.feedbackHeaderText,
                              {
                                color:
                                  selectedOption === activeLesson.quizQuestions[quizIndex]?.correctIndex
                                    ? THEME.colors.success
                                    : THEME.colors.error,
                              },
                            ]}
                          >
                            {selectedOption === activeLesson.quizQuestions[quizIndex]?.correctIndex
                              ? 'Semma! Correct Answer! 🎉'
                              : 'Oops! Check the reason below:'}
                          </Text>
                        </View>

                        <Text style={styles.feedbackExplain}>
                          {activeLesson.quizQuestions[quizIndex]?.explanation}
                        </Text>
                        <Text style={styles.feedbackTamilExplain}>
                          💡 {activeLesson.quizQuestions[quizIndex]?.tamilExplanation}
                        </Text>

                        <TouchableOpacity
                          style={styles.nextQuizBtn}
                          onPress={handleNextQuizQuestion}
                        >
                          <Text style={styles.nextQuizBtnText}>
                            {quizIndex < activeLesson.quizQuestions.length - 1
                              ? 'Next Question ➡️'
                              : 'Complete Class! 🏆'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {/* -------------------------------------------------------- */}
                {/* STAGE 5: CELEBRATION & XP REWARD */}
                {/* -------------------------------------------------------- */}
                {currentStep === 'celebration' && (
                  <View style={styles.celebrationBox}>
                    <View style={styles.celebrationIconCircle}>
                      <MaterialCommunityIcons name="star-shooting" size={48} color={THEME.colors.gold} />
                    </View>

                    <Text style={styles.celebrationTitle}>Class Mastered!</Text>
                    <Text style={styles.celebrationSubtitle}>
                      You completed {activeLesson.title} like a champion.
                    </Text>

                    <View style={styles.rewardCard}>
                      <View style={styles.rewardRow}>
                        <Ionicons name="sparkles" size={24} color={THEME.colors.secondary} />
                        <Text style={styles.rewardXpText}>+100 Stardust XP Earned</Text>
                      </View>
                      <View style={[styles.rewardRow, { marginTop: 10 }]}>
                        <MaterialCommunityIcons name="fire" size={24} color={THEME.colors.gold} />
                        <Text style={styles.rewardStreakText}>Cosmic Streak Maintained!</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.claimBtn}
                      onPress={() => setActiveLesson(null)}
                    >
                      <Text style={styles.claimBtnText}>Claim & Return to Path</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  topStatsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceCard,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  statPillText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginLeft: 6,
  },
  roadmapScroll: {
    flex: 1,
  },
  roadmapContent: {
    padding: 16,
  },
  levelSection: {
    marginBottom: 32,
  },
  planetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceCard,
    padding: 16,
    borderRadius: THEME.radius.lg,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  planetHeaderLeft: {
    flex: 1,
    paddingRight: 12,
  },
  planetBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primaryGlow,
    letterSpacing: 0.8,
  },
  planetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginTop: 2,
  },
  planetSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  planetIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodesContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  nodeWrapper: {
    alignItems: 'center',
    marginBottom: 28,
    position: 'relative',
    width: 200,
  },
  nodeCenter: {
    alignSelf: 'center',
  },
  nodeRight: {
    alignSelf: 'flex-end',
    marginRight: 20,
  },
  nodeLeft: {
    alignSelf: 'flex-start',
    marginLeft: 20,
  },
  startBubble: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 6,
    alignItems: 'center',
  },
  startBubbleText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.text,
    letterSpacing: 0.5,
  },
  bubbleArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: THEME.colors.primary,
    marginTop: 1,
  },
  roadmapNode: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: THEME.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: THEME.colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  nodeCompleted: {
    backgroundColor: THEME.colors.success,
    borderColor: '#34D399',
  },
  nodeCurrent: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primaryGlow,
  },
  nodeLabelBox: {
    alignItems: 'center',
    marginTop: 6,
  },
  nodeTitleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.text,
    textAlign: 'center',
  },
  nodeSubText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  lessonModalContainer: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingBottom: 20,
  },
  lessonTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  modalCloseBtn: {
    padding: 4,
  },
  stepProgressContainer: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    marginHorizontal: 16,
  },
  stepProgressSegment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.surfaceElevated,
  },
  stepProgressSegmentActive: {
    backgroundColor: THEME.colors.primary,
  },
  xpRewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  xpRewardPillText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.colors.gold,
    marginLeft: 4,
  },
  lessonStageScroll: {
    maxHeight: '100%',
  },
  stageBox: {
    gap: 12,
  },
  stageTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stageTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.gold,
    letterSpacing: 0.8,
    marginLeft: 6,
  },
  stageHeading: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  stageSubtext: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginBottom: 8,
  },
  grammarFocusTag: {
    fontSize: 12,
    color: THEME.colors.primaryGlow,
    fontWeight: '600',
  },
  conceptSummaryText: {
    fontSize: 15,
    color: THEME.colors.text,
    lineHeight: 22,
    marginTop: 6,
  },
  tamilMentalCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: THEME.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    marginVertical: 10,
  },
  tamilCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tamilCardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.colors.gold,
    marginLeft: 6,
  },
  tamilCardBody: {
    fontSize: 13,
    color: THEME.colors.text,
    lineHeight: 20,
  },
  primaryStageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 14,
  },
  primaryStageBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  backStageBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.surfaceCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },

  // Do's and Don'ts styles
  doDontCard: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 12,
  },
  dontBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  doBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginTop: 8,
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dontLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.error,
    marginLeft: 6,
  },
  doLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.success,
    marginLeft: 6,
    flex: 1,
  },
  dontSentence: {
    fontSize: 14,
    color: THEME.colors.text,
    fontWeight: '600',
    marginTop: 4,
  },
  doSentence: {
    fontSize: 14,
    color: THEME.colors.text,
    fontWeight: 'bold',
    marginTop: 4,
  },
  miniSpeaker: {
    padding: 2,
  },
  whyBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  whyText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },

  // Dialogue styles
  dialogueList: {
    gap: 10,
  },
  dialogueBubbleCard: {
    backgroundColor: THEME.colors.surfaceCard,
    padding: 12,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  speakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  speakerAvatar: {
    fontSize: 16,
    marginRight: 6,
  },
  speakerName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.textSecondary,
    flex: 1,
  },
  dialogueEnglishText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text,
    lineHeight: 20,
  },
  dialogueTamilText: {
    fontSize: 12,
    color: THEME.colors.gold,
    marginTop: 2,
  },
  shadowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceCard,
    padding: 14,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 8,
  },
  shadowEnglish: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  shadowPhonetic: {
    fontSize: 12,
    color: THEME.colors.primaryGlow,
    marginTop: 2,
  },
  shadowContext: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },

  // Quiz styles
  quizMainQuestion: {
    fontSize: 17,
    fontWeight: 'bold',
    color: THEME.colors.text,
    lineHeight: 24,
    marginVertical: 10,
  },
  quizOptionsList: {
    gap: 8,
    marginVertical: 10,
  },
  quizOptionPill: {
    backgroundColor: THEME.colors.surfaceCard,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  optionSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  optionCorrect: {
    borderColor: THEME.colors.success,
    backgroundColor: THEME.colors.successBg,
  },
  optionWrong: {
    borderColor: THEME.colors.error,
    backgroundColor: THEME.colors.errorBg,
  },
  quizOptionPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  quizFeedbackBox: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.radius.md,
    padding: 14,
    marginTop: 10,
  },
  feedbackHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  feedbackHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  feedbackExplain: {
    fontSize: 13,
    color: THEME.colors.text,
    lineHeight: 18,
  },
  feedbackTamilExplain: {
    fontSize: 12,
    color: THEME.colors.gold,
    marginTop: 4,
  },
  nextQuizBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 12,
  },
  nextQuizBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },

  // Celebration Stage
  celebrationBox: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  celebrationIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  celebrationTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  celebrationSubtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  rewardCard: {
    backgroundColor: THEME.colors.surfaceCard,
    padding: 18,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    width: '100%',
    marginVertical: 24,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardXpText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.secondary,
    marginLeft: 10,
  },
  rewardStreakText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.gold,
    marginLeft: 10,
  },
  claimBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 24,
  },
  claimBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
});
