import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { SUPERNOVA_LEVELS, SupernovaLevel, SupernovaClass } from '../constants/curriculum';
import { speakText, stopAllAudio } from '../services/ttsService';
import { addXp, incrementMetric } from '../services/storageService';
import { analyzeSentenceGrammar } from '../api/supernovaAi';

type LessonStep = 'rule' | 'jumble' | 'translation' | 'speaking' | 'celebration';

export const CurriculumScreen: React.FC = () => {
  const [activeClass, setActiveClass] = useState<SupernovaClass | null>(null);
  const [currentStep, setCurrentStep] = useState<LessonStep>('rule');
  const [completedClasses, setCompletedClasses] = useState<string[]>(['sn-1-1']);

  // Step 2: Jumble State
  const [assembledWords, setAssembledWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [jumbleSubmitted, setJumbleSubmitted] = useState(false);
  const [isJumbleCorrect, setIsJumbleCorrect] = useState(false);

  // Step 3: Translation State
  const [selectedTranslationOpt, setSelectedTranslationOpt] = useState<number | null>(null);
  const [translationSubmitted, setTranslationSubmitted] = useState(false);

  // Step 4: Free Speaking State
  const [spokenText, setSpokenText] = useState('');
  const [isEvaluatingSpeech, setIsEvaluatingSpeech] = useState(false);
  const [speechFeedback, setSpeechFeedback] = useState<any>(null);

  // Audio State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const handleOpenClass = (cls: SupernovaClass) => {
    setActiveClass(cls);
    setCurrentStep('rule');
    // Prepare Jumble
    setAvailableWords([...cls.jumble.scrambledWords]);
    setAssembledWords([]);
    setJumbleSubmitted(false);
    setIsJumbleCorrect(false);

    // Prepare Translation
    setSelectedTranslationOpt(null);
    setTranslationSubmitted(false);

    // Prepare Speaking
    setSpokenText('');
    setSpeechFeedback(null);
    stopAllAudio();
  };

  const handlePlayVoice = (text: string, id: string) => {
    setPlayingAudioId(id);
    speakText(text, () => setPlayingAudioId(null));
  };

  // Jumble Handlers
  const handlePickWord = (word: string, index: number) => {
    if (jumbleSubmitted) return;
    setAssembledWords([...assembledWords, word]);
    const updatedAvailable = [...availableWords];
    updatedAvailable.splice(index, 1);
    setAvailableWords(updatedAvailable);
  };

  const handleReturnWord = (word: string, index: number) => {
    if (jumbleSubmitted) return;
    const updatedAssembled = [...assembledWords];
    updatedAssembled.splice(index, 1);
    setAssembledWords(updatedAssembled);
    setAvailableWords([...availableWords, word]);
  };

  const handleCheckJumble = () => {
    if (!activeClass) return;
    const userSentence = assembledWords.join(' ');
    const correctSentence = activeClass.jumble.correctWords.join(' ');
    const isOk = userSentence.trim().toLowerCase() === correctSentence.trim().toLowerCase();
    setIsJumbleCorrect(isOk);
    setJumbleSubmitted(true);
  };

  const handleSelectTranslation = (index: number) => {
    if (translationSubmitted) return;
    setSelectedTranslationOpt(index);
    setTranslationSubmitted(true);
  };

  const handleSubmitSpeaking = async () => {
    const text = spokenText.trim();
    if (!text || isEvaluatingSpeech) return;

    setIsEvaluatingSpeech(true);
    try {
      const feedback = await analyzeSentenceGrammar(text);
      setSpeechFeedback(feedback);
    } catch (e) {
      console.warn('Speech evaluation error:', e);
    } finally {
      setIsEvaluatingSpeech(false);
    }
  };

  const handleFinishClass = async () => {
    if (activeClass) {
      if (!completedClasses.includes(activeClass.id)) {
        setCompletedClasses([...completedClasses, activeClass.id]);
        await addXp(activeClass.xpReward);
        await incrementMetric('wordsMastered', 3);
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
          <Text style={styles.statPillText}>650 XP</Text>
        </View>

        <View style={styles.statPill}>
          <Ionicons name="heart" size={16} color="#EF4444" />
          <Text style={styles.statPillText}>5 / 5</Text>
        </View>
      </View>

      {/* Gamified Celestial Roadmap */}
      <ScrollView style={styles.roadmapScroll} contentContainerStyle={styles.roadmapContent}>
        {SUPERNOVA_LEVELS.map((level) => {
          return (
            <View key={level.levelNumber} style={styles.levelSection}>
              {/* Level Planet Header */}
              <View style={[styles.planetHeader, { borderColor: level.accentColor }]}>
                <View style={styles.planetHeaderLeft}>
                  <Text style={styles.planetBadge}>{level.levelName} • {level.cefrTag}</Text>
                  <Text style={styles.planetSubtitle}>{level.description}</Text>
                </View>
                <View style={[styles.planetIconCircle, { backgroundColor: level.accentColor }]}>
                  <MaterialCommunityIcons name="orbit" size={26} color={THEME.colors.text} />
                </View>
              </View>

              {/* Connected Winding Roadmap Nodes */}
              <View style={styles.nodesContainer}>
                {level.classes.map((cls, cIdx) => {
                  const isCompleted = completedClasses.includes(cls.id);
                  const isCurrent = !isCompleted && (cIdx === 0 || completedClasses.includes(level.classes[cIdx - 1]?.id));

                  // Snake path alignments: center, right, left, center
                  const alignStyles = [
                    styles.nodeCenter,
                    styles.nodeRight,
                    styles.nodeLeft,
                    styles.nodeCenter,
                  ][cIdx % 4];

                  return (
                    <View key={cls.id} style={[styles.nodeWrapper, alignStyles]}>
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
                        onPress={() => handleOpenClass(cls)}
                      >
                        <MaterialCommunityIcons
                          name={isCompleted ? 'check-bold' : isCurrent ? 'play' : 'lock'}
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
      {/* FULL SUPERNOVA 4-STEP SUPERFLUENCY MODAL */}
      {/* ============================================================== */}
      {activeClass && (
        <Modal visible transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.lessonModalContainer}>
              {/* Top Navigation & Step Indicator */}
              <View style={styles.lessonTopBar}>
                <TouchableOpacity onPress={() => setActiveClass(null)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={24} color={THEME.colors.textSecondary} />
                </TouchableOpacity>

                {/* 4 Step Progress Pills */}
                <View style={styles.stepProgressContainer}>
                  {(['rule', 'jumble', 'translation', 'speaking'] as LessonStep[]).map((st, sIdx) => {
                    const stepOrder: LessonStep[] = ['rule', 'jumble', 'translation', 'speaking', 'celebration'];
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
                  <Text style={styles.xpRewardPillText}>+{activeClass.xpReward} XP</Text>
                </View>
              </View>

              <ScrollView style={styles.lessonStageScroll} contentContainerStyle={{ padding: 20 }}>
                {/* ---------------------------------------------------- */}
                {/* STEP 1: GRAMMAR PATTERN & TAMIL MENTAL MODEL */}
                {/* ---------------------------------------------------- */}
                {currentStep === 'rule' && (
                  <View style={styles.stageBox}>
                    <View style={styles.stageTagRow}>
                      <MaterialCommunityIcons name="lightbulb-on" size={18} color={THEME.colors.gold} />
                      <Text style={styles.stageTagText}>STEP 1: GRAMMAR PATTERN & MINDSET</Text>
                    </View>

                    <Text style={styles.stageHeading}>{activeClass.rule.heading}</Text>
                    <Text style={styles.conceptSummaryText}>{activeClass.rule.englishExplanation}</Text>

                    {/* Tamil Mental Model Box */}
                    <View style={styles.tamilMentalCard}>
                      <View style={styles.tamilCardHeader}>
                        <MaterialCommunityIcons name="translate" size={18} color={THEME.colors.gold} />
                        <Text style={styles.tamilCardTitle}>தமிழ் சிந்தனை முறை விளக்கம்:</Text>
                      </View>
                      <Text style={styles.tamilCardBody}>{activeClass.rule.tamilMentalModel}</Text>
                    </View>

                    {/* Do's and Don'ts comparison */}
                    <View style={styles.doDontCard}>
                      <View style={styles.dontBox}>
                        <View style={styles.statusIndicatorRow}>
                          <Ionicons name="close-circle" size={16} color={THEME.colors.error} />
                          <Text style={styles.dontLabel}>AVOID THIS (தவறு):</Text>
                        </View>
                        <Text style={styles.dontSentence}>"{activeClass.rule.doAndDont.wrong}"</Text>
                      </View>

                      <View style={styles.doBox}>
                        <View style={styles.statusIndicatorRow}>
                          <Ionicons name="checkmark-circle" size={16} color={THEME.colors.success} />
                          <Text style={styles.doLabel}>SAY THIS INSTEAD (சரி):</Text>
                          <TouchableOpacity
                            style={styles.miniSpeaker}
                            onPress={() => handlePlayVoice(activeClass.rule.doAndDont.right, 'rule-audio')}
                          >
                            <Ionicons
                              name={playingAudioId === 'rule-audio' ? 'volume-high' : 'volume-medium-outline'}
                              size={18}
                              color={THEME.colors.primaryGlow}
                            />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.doSentence}>"{activeClass.rule.doAndDont.right}"</Text>
                      </View>

                      <Text style={styles.whyText}>💡 {activeClass.rule.doAndDont.whyTamil}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.primaryStageBtn}
                      onPress={() => setCurrentStep('jumble')}
                    >
                      <Text style={styles.primaryStageBtnText}>Step 2: Sentence Scramble</Text>
                      <Ionicons name="arrow-forward" size={18} color={THEME.colors.text} style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* ---------------------------------------------------- */}
                {/* STEP 2: SUPERNOVA SENTENCE SCRAMBLE (JUMBLE BUILDER) */}
                {/* ---------------------------------------------------- */}
                {currentStep === 'jumble' && (
                  <View style={styles.stageBox}>
                    <View style={styles.stageTagRow}>
                      <MaterialCommunityIcons name="puzzle" size={18} color={THEME.colors.secondary} />
                      <Text style={[styles.stageTagText, { color: THEME.colors.secondary }]}>
                        STEP 2: SENTENCE SCRAMBLE (JUMBLE)
                      </Text>
                    </View>

                    <Text style={styles.stageHeading}>Assemble the Sentence</Text>
                    <Text style={styles.stageSubtext}>Translate this Tamil thought by tapping the word blocks in correct English order:</Text>

                    {/* Tamil Prompt Card */}
                    <View style={styles.promptCard}>
                      <Text style={styles.promptTamilLabel}>TAMIL THOUGHT:</Text>
                      <Text style={styles.promptTamilSentence}>{activeClass.jumble.tamilSentence}</Text>
                    </View>

                    {/* Sentence Assembly Area */}
                    <View style={styles.assemblyArea}>
                      <Text style={styles.assemblyAreaLabel}>TAP WORDS BELOW TO ASSEMBLE:</Text>
                      <View style={styles.wordsRow}>
                        {assembledWords.length === 0 ? (
                          <Text style={styles.emptyAssemblyPlaceholder}>Words will appear here as you tap them...</Text>
                        ) : (
                          assembledWords.map((word, wIdx) => (
                            <TouchableOpacity
                              key={wIdx}
                              style={styles.assembledPill}
                              onPress={() => handleReturnWord(word, wIdx)}
                            >
                              <Text style={styles.assembledPillText}>{word}</Text>
                              <Ionicons name="close" size={12} color={THEME.colors.textSecondary} style={{ marginLeft: 4 }} />
                            </TouchableOpacity>
                          ))
                        )}
                      </View>
                    </View>

                    {/* Available Word Bank */}
                    <View style={styles.wordBankArea}>
                      <View style={styles.wordsRow}>
                        {availableWords.map((word, aIdx) => (
                          <TouchableOpacity
                            key={aIdx}
                            style={styles.bankPill}
                            onPress={() => handlePickWord(word, aIdx)}
                          >
                            <Text style={styles.bankPillText}>{word}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Jumble Result Verdict */}
                    {jumbleSubmitted ? (
                      <View style={styles.feedbackVerdictBox}>
                        <View style={styles.statusIndicatorRow}>
                          <Ionicons
                            name={isJumbleCorrect ? 'checkmark-circle' : 'close-circle'}
                            size={20}
                            color={isJumbleCorrect ? THEME.colors.success : THEME.colors.error}
                          />
                          <Text
                            style={[
                              styles.verdictText,
                              { color: isJumbleCorrect ? THEME.colors.success : THEME.colors.error },
                            ]}
                          >
                            {isJumbleCorrect ? 'Semma! Perfect sentence order! 🎉' : 'Oops! Try again!'}
                          </Text>
                        </View>
                        {!isJumbleCorrect && (
                          <Text style={styles.jumbleHintText}>💡 Hint: {activeClass.jumble.hint}</Text>
                        )}
                        <TouchableOpacity
                          style={[styles.primaryStageBtn, { marginTop: 10 }]}
                          onPress={() => {
                            if (isJumbleCorrect) {
                              setCurrentStep('translation');
                            } else {
                              // Reset words
                              setAvailableWords([...activeClass.jumble.scrambledWords]);
                              setAssembledWords([]);
                              setJumbleSubmitted(false);
                            }
                          }}
                        >
                          <Text style={styles.primaryStageBtnText}>
                            {isJumbleCorrect ? 'Step 3: Guided Translation ➡️' : 'Try Assembling Again 🔄'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.primaryStageBtn, assembledWords.length === 0 && { opacity: 0.5 }]}
                        onPress={handleCheckJumble}
                        disabled={assembledWords.length === 0}
                      >
                        <Text style={styles.primaryStageBtnText}>Check Sentence</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* ---------------------------------------------------- */}
                {/* STEP 3: GUIDED TRANSLATION */}
                {/* ---------------------------------------------------- */}
                {currentStep === 'translation' && (
                  <View style={styles.stageBox}>
                    <View style={styles.stageTagRow}>
                      <MaterialCommunityIcons name="translate" size={18} color={THEME.colors.gold} />
                      <Text style={[styles.stageTagText, { color: THEME.colors.gold }]}>
                        STEP 3: GUIDED TRANSLATION
                      </Text>
                    </View>

                    <Text style={styles.stageHeading}>Translate into Natural English</Text>
                    <Text style={styles.stageSubtext}>Select the most natural English expression for this sentence:</Text>

                    <View style={styles.promptCard}>
                      <Text style={styles.promptTamilLabel}>TAMIL SENTENCE:</Text>
                      <Text style={styles.promptTamilSentence}>{activeClass.translation.tamilPrompt}</Text>
                    </View>

                    <View style={styles.translationOptionsList}>
                      {activeClass.translation.options.map((opt, oIdx) => {
                        const isSelected = selectedTranslationOpt === oIdx;
                        const isCorrect = oIdx === activeClass.translation.correctOptionIndex;

                        let pillStyle: any = styles.transOptionPill;
                        if (translationSubmitted) {
                          if (isCorrect) pillStyle = [styles.transOptionPill, styles.optionCorrect];
                          else if (isSelected) pillStyle = [styles.transOptionPill, styles.optionWrong];
                        } else if (isSelected) {
                          pillStyle = [styles.transOptionPill, styles.optionSelected];
                        }

                        return (
                          <TouchableOpacity
                            key={oIdx}
                            style={pillStyle}
                            onPress={() => handleSelectTranslation(oIdx)}
                          >
                            <Text style={styles.transOptionText}>{opt}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {translationSubmitted && (
                      <View style={styles.feedbackVerdictBox}>
                        <Text style={styles.explainHeader}>
                          {selectedTranslationOpt === activeClass.translation.correctOptionIndex
                            ? 'Excellent Translation! 🌟'
                            : 'Look at the rule explanation:'}
                        </Text>
                        <Text style={styles.explainBody}>{activeClass.translation.explanation}</Text>
                        <Text style={styles.explainTamil}>💡 {activeClass.translation.tamilExplanation}</Text>

                        <TouchableOpacity
                          style={[styles.primaryStageBtn, { marginTop: 12 }]}
                          onPress={() => setCurrentStep('speaking')}
                        >
                          <Text style={styles.primaryStageBtnText}>Step 4: Speak with Miss Nova 🎙️</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {/* ---------------------------------------------------- */}
                {/* STEP 4: FREE SPEAKING WITH MISS NOVA */}
                {/* ---------------------------------------------------- */}
                {currentStep === 'speaking' && (
                  <View style={styles.stageBox}>
                    <View style={styles.stageTagRow}>
                      <MaterialCommunityIcons name="microphone" size={18} color={THEME.colors.primaryGlow} />
                      <Text style={styles.stageTagText}>STEP 4: MISS NOVA FREE SPEAKING</Text>
                    </View>

                    <Text style={styles.stageHeading}>Conversational Challenge</Text>
                    <Text style={styles.stageSubtext}>{activeClass.speakingChallenge.prompt}</Text>

                    {/* Miss Nova Avatar & Audio Card */}
                    <View style={styles.missNovaVoiceCard}>
                      <View style={styles.missNovaTop}>
                        <View style={styles.missNovaAvatar}>
                          <Text style={{ fontSize: 28 }}>👩‍🏫</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.missNovaName}>Miss Nova (AI Tutor)</Text>
                          <Text style={styles.missNovaRole}>Listening & assessing pronunciation</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.audioBubbleBtn}
                          onPress={() =>
                            handlePlayVoice(activeClass.speakingChallenge.missNovaQuestion, 'nova-q')
                          }
                        >
                          <Ionicons
                            name={playingAudioId === 'nova-q' ? 'volume-high' : 'volume-medium-outline'}
                            size={22}
                            color={THEME.colors.primaryGlow}
                          />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.missNovaSpeechText}>
                        "{activeClass.speakingChallenge.missNovaQuestion}"
                      </Text>
                    </View>

                    {/* Quick Suggestion Pills */}
                    <Text style={styles.helperLabel}>SUGGESTED ANSWERS (TAP TO USE):</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                      {activeClass.speakingChallenge.suggestedAnswers.map((sug, sIdx) => (
                        <TouchableOpacity
                          key={sIdx}
                          style={styles.suggestPill}
                          onPress={() => setSpokenText(sug)}
                        >
                          <Text style={styles.suggestPillText} numberOfLines={1}>
                            "{sug}"
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* User Speech Input Area */}
                    <TextInput
                      style={styles.speakingInput}
                      placeholder="Type or speak your answer in English..."
                      placeholderTextColor={THEME.colors.textMuted}
                      value={spokenText}
                      onChangeText={setSpokenText}
                      multiline
                      numberOfLines={3}
                    />

                    {/* Real-time AI Evaluation Results */}
                    {speechFeedback && (
                      <View style={styles.speechFeedbackCard}>
                        <View style={styles.statusIndicatorRow}>
                          <Ionicons name="sparkles" size={18} color={THEME.colors.secondary} />
                          <Text style={styles.speechScoreTitle}>
                            Miss Nova's Fluency Score: {speechFeedback.fluencyScore}/100
                          </Text>
                        </View>

                        <Text style={styles.speechFeedbackText}>{speechFeedback.explanation}</Text>
                        <Text style={styles.speechFeedbackTamil}>💡 {speechFeedback.tamilExplanation}</Text>

                        <View style={styles.nativeComparisonBox}>
                          <Text style={styles.nativeLabel}>NATIVE REPHRASING:</Text>
                          <Text style={styles.nativeText}>"{speechFeedback.nativeIdiomaticVersion}"</Text>
                        </View>

                        <TouchableOpacity style={styles.primaryStageBtn} onPress={handleFinishClass}>
                          <Ionicons name="checkmark-done" size={20} color={THEME.colors.text} style={{ marginRight: 6 }} />
                          <Text style={styles.primaryStageBtnText}>Complete Class & Earn Stardust XP!</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {!speechFeedback && (
                      <TouchableOpacity
                        style={[styles.primaryStageBtn, !spokenText.trim() && { opacity: 0.5 }]}
                        onPress={handleSubmitSpeaking}
                        disabled={!spokenText.trim() || isEvaluatingSpeech}
                      >
                        {isEvaluatingSpeech ? (
                          <ActivityIndicator size="small" color={THEME.colors.text} />
                        ) : (
                          <>
                            <Ionicons name="sparkles" size={18} color={THEME.colors.text} style={{ marginRight: 6 }} />
                            <Text style={styles.primaryStageBtnText}>Submit to Miss Nova</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* ---------------------------------------------------- */}
                {/* STEP 5: CELEBRATION & XP REWARD */}
                {/* ---------------------------------------------------- */}
                {currentStep === 'celebration' && (
                  <View style={styles.celebrationBox}>
                    <View style={styles.celebrationIconCircle}>
                      <MaterialCommunityIcons name="star-shooting" size={48} color={THEME.colors.gold} />
                    </View>

                    <Text style={styles.celebrationTitle}>Class Mastered!</Text>
                    <Text style={styles.celebrationSubtitle}>
                      You completed {activeClass.title} using the SuperFluency 4-step method.
                    </Text>

                    <View style={styles.rewardCard}>
                      <View style={styles.rewardRow}>
                        <Ionicons name="sparkles" size={24} color={THEME.colors.secondary} />
                        <Text style={styles.rewardXpText}>+{activeClass.xpReward} Stardust XP Earned</Text>
                      </View>
                      <View style={[styles.rewardRow, { marginTop: 10 }]}>
                        <MaterialCommunityIcons name="fire" size={24} color={THEME.colors.gold} />
                        <Text style={styles.rewardStreakText}>Cosmic Streak Maintained!</Text>
                      </View>
                    </View>

                    <TouchableOpacity style={styles.claimBtn} onPress={() => setActiveClass(null)}>
                      <Text style={styles.claimBtnText}>Claim & Return to Learning Path</Text>
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
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  planetSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  planetIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    marginBottom: 4,
  },
  conceptSummaryText: {
    fontSize: 14,
    color: THEME.colors.text,
    lineHeight: 22,
  },
  tamilMentalCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: THEME.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
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
  doDontCard: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
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
  whyText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginTop: 8,
  },
  primaryStageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 8,
  },
  primaryStageBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },

  // Jumble Styles
  promptCard: {
    backgroundColor: THEME.colors.surfaceCard,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  promptTamilLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.colors.gold,
  },
  promptTamilSentence: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginTop: 4,
  },
  assemblyArea: {
    minHeight: 80,
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: THEME.colors.borderLight,
  },
  assemblyAreaLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyAssemblyPlaceholder: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
  },
  wordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  assembledPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  assembledPillText: {
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  wordBankArea: {
    paddingVertical: 8,
  },
  bankPill: {
    backgroundColor: THEME.colors.surfaceCard,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  bankPillText: {
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  feedbackVerdictBox: {
    backgroundColor: THEME.colors.surfaceCard,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginTop: 8,
  },
  verdictText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  jumbleHintText: {
    fontSize: 12,
    color: THEME.colors.gold,
    marginTop: 6,
  },

  // Translation Styles
  translationOptionsList: {
    gap: 8,
    marginTop: 8,
  },
  transOptionPill: {
    backgroundColor: THEME.colors.surfaceCard,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  transOptionText: {
    fontSize: 14,
    color: THEME.colors.text,
    fontWeight: '600',
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
  explainHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  explainBody: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  explainTamil: {
    fontSize: 12,
    color: THEME.colors.gold,
    marginTop: 4,
  },

  // Speaking Styles
  missNovaVoiceCard: {
    backgroundColor: THEME.colors.surfaceCard,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  missNovaTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  missNovaAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  missNovaName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  missNovaRole: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  audioBubbleBtn: {
    padding: 6,
  },
  missNovaSpeechText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: THEME.colors.primaryGlow,
    lineHeight: 22,
  },
  helperLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.colors.textMuted,
    marginTop: 8,
  },
  suggestPill: {
    backgroundColor: THEME.colors.surfaceCard,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  speechFeedbackCard: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  speechScoreTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.secondary,
    marginLeft: 6,
  },
  speechFeedbackText: {
    fontSize: 13,
    color: THEME.colors.text,
  },
  speechFeedbackTamil: {
    fontSize: 12,
    color: THEME.colors.gold,
  },
  nativeComparisonBox: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    padding: 10,
    borderRadius: 8,
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

  // Celebration
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
