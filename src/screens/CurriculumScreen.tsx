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
import { SUPERNOVA_CURRICULUM, LevelCourse, ClassLesson } from '../constants/curriculum';
import { speakText } from '../services/ttsService';
import { addXp } from '../services/storageService';

export const CurriculumScreen: React.FC = () => {
  const [selectedLesson, setSelectedLesson] = useState<ClassLesson | null>(null);
  const [completedClasses, setCompletedClasses] = useState<string[]>(['class-1-1']);
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [activeSpeechIdx, setActiveSpeechIdx] = useState<number | null>(null);

  const handleOpenLesson = (lesson: ClassLesson) => {
    setSelectedLesson(lesson);
    setQuizSelected(null);
    setQuizSubmitted(false);
    setActiveSpeechIdx(null);
  };

  const handleSelectQuizOption = (idx: number) => {
    if (quizSubmitted) return;
    setQuizSelected(idx);
    setQuizSubmitted(true);
  };

  const handleCompleteLesson = async () => {
    if (selectedLesson && !completedClasses.includes(selectedLesson.id)) {
      setCompletedClasses([...completedClasses, selectedLesson.id]);
      await addXp(50); // 50 XP per class completed!
    }
    setSelectedLesson(null);
  };

  const handlePlayPhrase = (phrase: string, idx: number) => {
    setActiveSpeechIdx(idx);
    speakText(phrase, () => setActiveSpeechIdx(null));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="school" size={24} color={THEME.colors.primaryGlow} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>Supernova Curriculum</Text>
          <Text style={styles.subtitle}>Level-by-Level Spoken English Roadmap</Text>
        </View>
      </View>

      {/* Levels & Classes Roadmaps */}
      {SUPERNOVA_CURRICULUM.map((level) => {
        return (
          <View key={level.levelNumber} style={styles.levelCard}>
            {/* Level Banner */}
            <View style={styles.levelHeader}>
              <View style={styles.levelBadgeRow}>
                <View style={styles.levelNumBadge}>
                  <Text style={styles.levelNumText}>LEVEL {level.levelNumber}</Text>
                </View>
                <View style={styles.cefrBadge}>
                  <Text style={styles.cefrText}>{level.cefrTag}</Text>
                </View>
              </View>
              <Text style={styles.levelTitle}>{level.levelTitle}</Text>
              <Text style={styles.levelDesc}>{level.description}</Text>
            </View>

            {/* Classes List */}
            <View style={styles.classesList}>
              {level.classes.map((cls, idx) => {
                const isCompleted = completedClasses.includes(cls.id);
                return (
                  <TouchableOpacity
                    key={cls.id}
                    style={[styles.classItem, isCompleted && styles.classItemCompleted]}
                    activeOpacity={0.8}
                    onPress={() => handleOpenLesson(cls)}
                  >
                    <View style={[styles.stepCircle, isCompleted && styles.stepCircleCompleted]}>
                      {isCompleted ? (
                        <Ionicons name="checkmark" size={16} color={THEME.colors.text} />
                      ) : (
                        <Text style={styles.stepNum}>{idx + 1}</Text>
                      )}
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.classTitle}>{cls.title}</Text>
                      <Text style={styles.classSubtitle}>{cls.subtitle}</Text>
                      <View style={styles.metaRow}>
                        <Ionicons name="time-outline" size={12} color={THEME.colors.textMuted} />
                        <Text style={styles.metaDuration}>{cls.duration}</Text>
                        <Text style={styles.metaDot}>•</Text>
                        <Text style={styles.metaGrammar}>{cls.grammarFocus}</Text>
                      </View>
                    </View>

                    <Ionicons name="chevron-forward" size={18} color={THEME.colors.borderLight} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}

      {/* Interactive Lesson Modal */}
      {selectedLesson && (
        <Modal visible transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLessonTitle}>{selectedLesson.title}</Text>
                  <Text style={styles.modalSubtitle}>{selectedLesson.subtitle}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedLesson(null)} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={THEME.colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Tamil Mental Model Clarity */}
                <View style={styles.tamilConceptBox}>
                  <View style={styles.tamilConceptTop}>
                    <MaterialCommunityIcons name="lightbulb-on" size={18} color={THEME.colors.gold} />
                    <Text style={styles.tamilConceptLabel}>தமிழ் வழிகாட்டுதல் (Tamil Core Concept):</Text>
                  </View>
                  <Text style={styles.tamilConceptText}>{selectedLesson.tamilConcept}</Text>
                </View>

                {/* Key Speaking Sentences */}
                <Text style={styles.lessonSectionHeader}>🗣️ Listen & Practice Sentences:</Text>
                {selectedLesson.keyPhrases.map((phrase, pIdx) => (
                  <TouchableOpacity
                    key={pIdx}
                    style={styles.phraseRow}
                    onPress={() => handlePlayPhrase(phrase, pIdx)}
                  >
                    <Ionicons
                      name={activeSpeechIdx === pIdx ? 'volume-high' : 'volume-medium-outline'}
                      size={20}
                      color={THEME.colors.primaryGlow}
                    />
                    <Text style={styles.phraseText}>{phrase}</Text>
                  </TouchableOpacity>
                ))}

                {/* Practice Quiz */}
                <Text style={[styles.lessonSectionHeader, { marginTop: 18 }]}>
                  ⚡ Quick Comprehension Quiz:
                </Text>
                <View style={styles.quizCard}>
                  <Text style={styles.quizQuestion}>{selectedLesson.quiz.question}</Text>
                  {selectedLesson.quiz.options.map((opt, oIdx) => {
                    const isSelected = quizSelected === oIdx;
                    const isCorrect = selectedLesson.quiz.correctIndex === oIdx;

                    let btnStyle: any = styles.quizOption;
                    if (quizSubmitted) {
                      if (isCorrect) btnStyle = [styles.quizOption, styles.quizCorrect];
                      else if (isSelected) btnStyle = [styles.quizOption, styles.quizWrong];
                    }

                    return (
                      <TouchableOpacity
                        key={oIdx}
                        style={btnStyle}
                        onPress={() => handleSelectQuizOption(oIdx)}
                      >
                        <Text style={styles.quizOptionText}>{opt}</Text>
                      </TouchableOpacity>
                    );
                  })}

                  {quizSubmitted && (
                    <View style={styles.quizResultBox}>
                      <Text style={styles.quizExplanation}>
                        {quizSelected === selectedLesson.quiz.correctIndex
                          ? '🎉 Semma! Correct answer!'
                          : '❌ Try to remember the concept below:'}
                      </Text>
                      <Text style={styles.quizExplainDetail}>
                        {selectedLesson.quiz.explanation}
                      </Text>
                      <Text style={styles.quizTamilDetail}>
                        💡 {selectedLesson.quiz.tamilExplanation}
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Complete Lesson Button */}
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.completeBtn} onPress={handleCompleteLesson}>
                  <Ionicons name="checkmark-circle" size={20} color={THEME.colors.text} />
                  <Text style={styles.completeBtnText}>Complete Class (+50 XP)</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  levelCard: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 20,
    overflow: 'hidden',
  },
  levelHeader: {
    padding: 16,
    backgroundColor: THEME.colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  levelBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  levelNumBadge: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  levelNumText: {
    color: THEME.colors.text,
    fontSize: 10,
    fontWeight: 'bold',
  },
  cefrBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cefrText: {
    color: THEME.colors.secondary,
    fontSize: 11,
    fontWeight: '700',
  },
  levelTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  levelDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  classesList: {
    padding: 12,
    gap: 10,
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceCard,
    padding: 12,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  classItemCompleted: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  stepCircleCompleted: {
    backgroundColor: THEME.colors.success,
    borderColor: THEME.colors.success,
  },
  stepNum: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.textSecondary,
  },
  classTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  classSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaDuration: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginLeft: 4,
  },
  metaDot: {
    color: THEME.colors.textMuted,
    marginHorizontal: 4,
  },
  metaGrammar: {
    fontSize: 11,
    color: THEME.colors.primaryGlow,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  modalLessonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  tamilConceptBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 16,
  },
  tamilConceptTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tamilConceptLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.gold,
    marginLeft: 6,
  },
  tamilConceptText: {
    fontSize: 13,
    color: THEME.colors.text,
    lineHeight: 20,
  },
  lessonSectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginBottom: 10,
  },
  phraseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceCard,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 8,
  },
  phraseText: {
    fontSize: 14,
    color: THEME.colors.text,
    marginLeft: 10,
    flex: 1,
  },
  quizCard: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  quizQuestion: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginBottom: 12,
  },
  quizOption: {
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    marginBottom: 8,
  },
  quizCorrect: {
    backgroundColor: THEME.colors.successBg,
    borderColor: THEME.colors.success,
  },
  quizWrong: {
    backgroundColor: THEME.colors.errorBg,
    borderColor: THEME.colors.error,
  },
  quizOptionText: {
    fontSize: 13,
    color: THEME.colors.text,
  },
  quizResultBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  quizExplanation: {
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  quizExplainDetail: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  quizTamilDetail: {
    fontSize: 12,
    color: THEME.colors.gold,
    marginTop: 4,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: 24,
  },
  completeBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginLeft: 8,
  },
});
