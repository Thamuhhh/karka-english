import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { SUPERNOVA_LEVELS, SupernovaClass } from '../constants/curriculum';
import { SUPERNOVA_IMAGES, COURSE_NODE_IMAGES } from '../constants/supernovaAssets';

interface CurriculumScreenProps {
  onStartLesson: (lesson: SupernovaClass) => void;
  completedClasses: string[];
}

const { width } = Dimensions.get('window');

export const CurriculumScreen: React.FC<CurriculumScreenProps> = ({
  onStartLesson,
  completedClasses,
}) => {
  const [selectedLesson, setSelectedLesson] = useState<SupernovaClass | null>(null);

  let globalLessonIndex = 0;

  return (
    <View style={styles.container}>
      {/* Supernova Top Stats Bar */}
      <View style={styles.topStatsBar}>
        <View style={styles.statPill}>
          <Text style={styles.statEmoji}>🔥</Text>
          <Text style={styles.statPillText}>3 Days</Text>
        </View>

        <View style={styles.statPill}>
          <Text style={styles.statEmoji}>💎</Text>
          <Text style={styles.statPillText}>450</Text>
        </View>

        <View style={styles.statPill}>
          <Text style={styles.statEmoji}>❤️</Text>
          <Text style={styles.statPillText}>5 / 5</Text>
        </View>

        {/* Real Miss Nova Avatar Card */}
        <View style={styles.missNovaHeaderPill}>
          <Image source={SUPERNOVA_IMAGES.novaAvatar} style={styles.missNovaAvatar} />
          <Text style={styles.missNovaText}>Miss Nova</Text>
        </View>
      </View>

      {/* Gamified Course V5 Roadmap */}
      <ScrollView
        style={styles.roadmapScroll}
        contentContainerStyle={styles.roadmapContent}
        showsVerticalScrollIndicator={false}
      >
        {SUPERNOVA_LEVELS.map((level, lIdx) => {
          const completedInLevel = level.classes.filter((c) =>
            completedClasses.includes(c.id)
          ).length;
          const progressPercent = Math.round(
            (completedInLevel / level.classes.length) * 100
          );

          return (
            <View key={level.levelNumber} style={styles.levelSection}>
              {/* Supernova Unit Banner */}
              <View style={[styles.unitBanner, { borderLeftColor: level.accentColor }]}>
                <View style={styles.unitBannerLeft}>
                  <View style={styles.unitBadgeRow}>
                    <View
                      style={[
                        styles.cefrBadge,
                        { backgroundColor: level.accentColor },
                      ]}
                    >
                      <Text style={styles.cefrBadgeText}>{level.cefrTag}</Text>
                    </View>
                    <Text style={styles.unitNumberText}>UNIT {level.levelNumber}</Text>
                  </View>
                  <Text style={styles.unitTitleText}>{level.levelName}</Text>
                  <Text style={styles.unitDescText}>{level.description}</Text>

                  {/* Progress Bar */}
                  <View style={styles.unitProgressContainer}>
                    <View style={styles.unitProgressBarBg}>
                      <View
                        style={[
                          styles.unitProgressBarFill,
                          {
                            width: `${progressPercent}%`,
                            backgroundColor: level.accentColor,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.unitProgressText}>
                      {completedInLevel}/{level.classes.length} Done
                    </Text>
                  </View>
                </View>

                <View style={styles.unitLevelArtBox}>
                  <Image source={SUPERNOVA_IMAGES.levelTitle1} style={styles.levelTitleArt} resizeMode="contain" />
                </View>
              </View>

              {/* Serpentine Connected Stepping Stone Nodes */}
              <View style={styles.nodesContainer}>
                {level.classes.map((cls, cIdx) => {
                  globalLessonIndex++;
                  const nodeImageIndex = ((globalLessonIndex - 1) % 22) + 1;
                  const nodeArt = COURSE_NODE_IMAGES[nodeImageIndex];

                  const isCompleted = completedClasses.includes(cls.id);
                  const isCurrent =
                    !isCompleted &&
                    (cIdx === 0 ||
                      completedClasses.includes(level.classes[cIdx - 1]?.id));

                  // Snake alignment: Center -> Right -> Center -> Left
                  const alignStyle = [
                    styles.nodeCenter,
                    styles.nodeRight,
                    styles.nodeCenter,
                    styles.nodeLeft,
                  ][cIdx % 4];

                  return (
                    <View key={cls.id} style={[styles.nodeWrapper, alignStyle]}>
                      {/* Current Node Bouncing Callout Indicator */}
                      {isCurrent && (
                        <View style={styles.startBadgeBubble}>
                          <Text style={styles.startBadgeText}>START HERE</Text>
                          <View style={styles.startBadgeArrow} />
                        </View>
                      )}

                      {/* 3D Stepping Stone with Real Course V5 Artwork */}
                      <TouchableOpacity
                        style={[
                          styles.steppingStoneBtn,
                          isCompleted && styles.steppingStoneCompleted,
                          isCurrent && styles.steppingStoneCurrent,
                          !isCompleted && !isCurrent && styles.steppingStoneLocked,
                        ]}
                        activeOpacity={0.8}
                        onPress={() => setSelectedLesson(cls)}
                      >
                        {nodeArt ? (
                          <Image
                            source={isCompleted || isCurrent ? nodeArt.colored : nodeArt.grayscale}
                            style={styles.nodeArtworkImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <MaterialCommunityIcons
                            name={isCompleted ? 'check-bold' : isCurrent ? 'star' : 'lock'}
                            size={28}
                            color="#FFFFFF"
                          />
                        )}

                        {/* Status Overlay Icon */}
                        {isCompleted && (
                          <View style={styles.completedBadgeCheck}>
                            <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>

                      {/* Lesson Label */}
                      <View style={styles.nodeLabelCard}>
                        <Text style={styles.nodeLabelTitle} numberOfLines={1}>
                          {cls.title}
                        </Text>
                        <Text style={styles.nodeLabelSub}>{cls.duration}</Text>
                      </View>
                    </View>
                  );
                })}

                {/* Milestone Treasure Chest */}
                <View style={styles.milestoneChestWrapper}>
                  <TouchableOpacity
                    style={styles.chestBtn}
                    activeOpacity={0.8}
                    onPress={() => setSelectedLesson(level.classes[0])}
                  >
                    <Image source={SUPERNOVA_IMAGES.trophyNova} style={styles.chestImage} resizeMode="contain" />
                  </TouchableOpacity>
                  <Text style={styles.chestLabel}>Level {level.levelNumber} Trophy</Text>
                </View>
              </View>
            </View>
          );
        })}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* SUPERNOVA AUTHENTIC LESSON MODAL (OnStartChallengePopup) */}
      <Modal
        visible={!!selectedLesson}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedLesson(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedLesson(null)}
          />

          {selectedLesson && (
            <View style={styles.modalCard}>
              {/* Header with Close */}
              <View style={styles.modalHeader}>
                <View style={styles.modalBadgeRow}>
                  <View style={styles.modalLevelPill}>
                    <Text style={styles.modalLevelText}>
                      LESSON {selectedLesson.id.replace('sn-', '').replace('-', '.')}
                    </Text>
                  </View>
                  <View style={styles.modalDurationPill}>
                    <Ionicons name="time-outline" size={13} color={THEME.colors.textSecondary} />
                    <Text style={styles.modalDurationText}>{selectedLesson.duration}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setSelectedLesson(null)}
                >
                  <Ionicons name="close" size={20} color={THEME.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Title & Concept with Miss Nova portrait */}
              <View style={styles.modalNovaRow}>
                <Image source={SUPERNOVA_IMAGES.novaAvatar} style={styles.modalNovaAvatar} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.modalTitle}>{selectedLesson.title}</Text>
                  <Text style={styles.modalSubtitle}>{selectedLesson.subtitle}</Text>
                </View>
              </View>

              {/* Tamil Mother Tongue Bridge Preview */}
              <View style={styles.tamilConceptBox}>
                <Text style={styles.tamilConceptLabel}>CONCEPT IN TAMIL:</Text>
                <Text style={styles.tamilConceptText}>
                  "{selectedLesson.rule.tamilMentalModel}"
                </Text>
              </View>

              {/* Supernova 4-Step Methodology Breakdown */}
              <View style={styles.methodologyBox}>
                <Text style={styles.methodologyTitle}>SUPERFLUENCY 4-STEP DRILL:</Text>
                <View style={styles.stepGrid}>
                  <View style={styles.stepItem}>
                    <Text style={styles.stepIcon}>🧠</Text>
                    <Text style={styles.stepText}>Pattern Rule</Text>
                  </View>
                  <View style={styles.stepItem}>
                    <Text style={styles.stepIcon}>🧩</Text>
                    <Text style={styles.stepText}>Word Scramble</Text>
                  </View>
                  <View style={styles.stepItem}>
                    <Text style={styles.stepIcon}>🗣️</Text>
                    <Text style={styles.stepText}>Translation</Text>
                  </View>
                  <View style={styles.stepItem}>
                    <Text style={styles.stepIcon}>🎙️</Text>
                    <Text style={styles.stepText}>AI Speaking</Text>
                  </View>
                </View>
              </View>

              {/* Rewards Row */}
              <View style={styles.rewardsRow}>
                <View style={styles.rewardItem}>
                  <Text style={{ fontSize: 16 }}>🏆</Text>
                  <Text style={styles.rewardText}>+100 XP Bounty</Text>
                </View>
                <View style={styles.rewardItem}>
                  <Text style={{ fontSize: 16 }}>❤️</Text>
                  <Text style={styles.rewardText}>5 Hearts Full</Text>
                </View>
              </View>

              {/* Big 3D Start Button */}
              <TouchableOpacity
                style={styles.modalStartBtn}
                activeOpacity={0.85}
                onPress={() => {
                  const lesson = selectedLesson;
                  setSelectedLesson(null);
                  onStartLesson(lesson);
                }}
              >
                <View style={styles.modalStartBtnInner}>
                  <Text style={styles.modalStartBtnText}>
                    {completedClasses.includes(selectedLesson.id)
                      ? 'PRACTICE AGAIN (+50 XP)'
                      : 'START LESSON (+100 XP)'}
                  </Text>
                  <Image source={SUPERNOVA_IMAGES.continueArrow} style={styles.continueArrowIcon} />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  statEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  statPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  missNovaHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceCard,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.primary,
  },
  missNovaAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  missNovaText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary,
    marginLeft: 6,
    marginRight: 4,
  },
  roadmapScroll: {
    flex: 1,
  },
  roadmapContent: {
    padding: 16,
  },
  levelSection: {
    marginBottom: 36,
  },
  unitBanner: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderLeftWidth: 6,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  unitBannerLeft: {
    flex: 1,
    paddingRight: 10,
  },
  unitBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cefrBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  cefrBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  unitNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5,
  },
  unitTitleText: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.text,
    marginBottom: 4,
  },
  unitDescText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  unitProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitProgressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8,
  },
  unitProgressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  unitProgressText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  unitLevelArtBox: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  levelTitleArt: {
    width: 60,
    height: 60,
  },
  nodesContainer: {
    alignItems: 'center',
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
  startBadgeBubble: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME.colors.primaryBorder,
    marginBottom: 6,
    alignItems: 'center',
  },
  startBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  startBadgeArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: THEME.colors.primaryBorder,
    position: 'absolute',
    bottom: -6,
  },
  steppingStoneBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: THEME.colors.surfaceCard,
    borderBottomWidth: 6,
    borderBottomColor: '#12151E',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  steppingStoneCompleted: {
    borderColor: THEME.colors.accent,
    borderWidth: 2,
    borderBottomColor: THEME.colors.accentBorder,
  },
  steppingStoneCurrent: {
    borderColor: THEME.colors.primary,
    borderWidth: 3,
    borderBottomColor: THEME.colors.primaryBorder,
  },
  steppingStoneLocked: {
    borderColor: THEME.colors.border,
    borderWidth: 1,
    opacity: 0.6,
  },
  nodeArtworkImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  completedBadgeCheck: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  nodeLabelCard: {
    marginTop: 8,
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceCard,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  nodeLabelTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  nodeLabelSub: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
  },
  milestoneChestWrapper: {
    alignItems: 'center',
    marginTop: 10,
  },
  chestBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.colors.surfaceCard,
    borderWidth: 2,
    borderColor: THEME.colors.gold,
    borderBottomWidth: 6,
    borderBottomColor: THEME.colors.goldBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chestImage: {
    width: 56,
    height: 56,
  },
  chestLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.gold,
    marginTop: 8,
  },

  /* MODAL POPUP STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: width - 40,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalLevelPill: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 8,
  },
  modalLevelText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalDurationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  modalDurationText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginLeft: 4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalNovaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalNovaAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.text,
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
  },
  tamilConceptBox: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.goldBorder,
    marginBottom: 14,
  },
  tamilConceptLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.gold,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  tamilConceptText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.gold,
    lineHeight: 18,
  },
  methodologyBox: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.radius.md,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  methodologyTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  stepGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  stepText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.radius.md,
    paddingVertical: 10,
    marginBottom: 16,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.text,
    marginLeft: 6,
  },
  modalStartBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.lg,
    borderBottomWidth: 4,
    borderBottomColor: THEME.colors.primaryBorder,
    overflow: 'hidden',
  },
  modalStartBtnInner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  modalStartBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  continueArrowIcon: {
    width: 14,
    height: 14,
    tintColor: '#FFFFFF',
    marginLeft: 8,
  },
});
