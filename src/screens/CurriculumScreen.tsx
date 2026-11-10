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
import { LinearGradient } from 'expo-linear-gradient';
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
      {/* Ultra-Premium Supernova Top HUD */}
      <View style={styles.topStatsBar}>
        <View style={styles.statPillStreak}>
          <Text style={styles.statEmoji}>🔥</Text>
          <Text style={styles.statPillTextStreak}>3 Days</Text>
        </View>

        <View style={styles.statPillGems}>
          <Text style={styles.statEmoji}>💎</Text>
          <Text style={styles.statPillTextGems}>450</Text>
        </View>

        <View style={styles.statPillHearts}>
          <Text style={styles.statEmoji}>❤️</Text>
          <Text style={styles.statPillTextHearts}>5 / 5</Text>
        </View>

        {/* Real Miss Nova Live Status Pill */}
        <View style={styles.missNovaHeaderPill}>
          <Image source={SUPERNOVA_IMAGES.novaAvatar} style={styles.missNovaAvatar} />
          <View style={styles.onlineDot} />
          <Text style={styles.missNovaText}>Miss Nova</Text>
        </View>
      </View>

      {/* Gamified Course V5 Roadmap */}
      <ScrollView
        style={styles.roadmapScroll}
        contentContainerStyle={styles.roadmapContent}
        showsVerticalScrollIndicator={false}
      >
        {SUPERNOVA_LEVELS.map((level) => {
          const completedInLevel = level.classes.filter((c) =>
            completedClasses.includes(c.id)
          ).length;
          const progressPercent = Math.round(
            (completedInLevel / level.classes.length) * 100
          );

          return (
            <View key={level.levelNumber} style={styles.levelSection}>
              {/* Ultra-Premium Radiant Unit Banner */}
              <LinearGradient
                colors={THEME.gradients.banner}
                style={styles.unitBanner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.unitBannerLeft}>
                  <View style={styles.unitBadgeRow}>
                    <View style={styles.cefrBadge}>
                      <Text style={styles.cefrBadgeText}>{level.cefrTag}</Text>
                    </View>
                    <Text style={styles.unitNumberText}>UNIT {level.levelNumber}</Text>
                  </View>
                  <Text style={styles.unitTitleText}>{level.levelName}</Text>
                  <Text style={styles.unitDescText}>{level.description}</Text>

                  {/* Sleek Neon Progress Bar */}
                  <View style={styles.unitProgressContainer}>
                    <View style={styles.unitProgressBarBg}>
                      <LinearGradient
                        colors={THEME.gradients.accent}
                        style={[styles.unitProgressBarFill, { width: `${Math.max(8, progressPercent)}%` }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      />
                    </View>
                    <Text style={styles.unitProgressText}>
                      {completedInLevel}/{level.classes.length} Done
                    </Text>
                  </View>
                </View>

                <View style={styles.unitLevelArtBox}>
                  <Image
                    source={SUPERNOVA_IMAGES.levelTitles[level.levelNumber] || SUPERNOVA_IMAGES.levelTitle1}
                    style={styles.levelTitleArt}
                    resizeMode="contain"
                  />
                </View>
              </LinearGradient>

              {/* Serpentine Stepping Stone Path */}
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
                          <LinearGradient
                            colors={THEME.gradients.primary}
                            style={styles.startBadgeGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Text style={styles.startBadgeText}>START HERE</Text>
                          </LinearGradient>
                          <View style={styles.startBadgeArrow} />
                        </View>
                      )}

                      {/* Stepping Stone Node with Glowing Depth */}
                      <TouchableOpacity
                        style={[
                          styles.steppingStoneBtn,
                          isCompleted && styles.steppingStoneCompleted,
                          isCurrent && styles.steppingStoneCurrent,
                          !isCompleted && !isCurrent && styles.steppingStoneLocked,
                        ]}
                        activeOpacity={0.82}
                        onPress={() => setSelectedLesson(cls)}
                      >
                        {isCurrent && <View style={styles.currentPulseRing} />}

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

                        {/* Completed Checkmark Emblem */}
                        {isCompleted && (
                          <View style={styles.completedBadgeCheck}>
                            <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>

                      {/* Lesson Label Chip */}
                      <View style={styles.nodeLabelCard}>
                        <Text style={styles.nodeLabelTitle} numberOfLines={1}>
                          {cls.title}
                        </Text>
                        <Text style={styles.nodeLabelSub}>{cls.duration}</Text>
                      </View>
                    </View>
                  );
                })}

                {/* Milestone Trophy Chest */}
                <View style={styles.milestoneChestWrapper}>
                  <TouchableOpacity
                    style={styles.chestBtn}
                    activeOpacity={0.85}
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
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ULTRA-PREMIUM LESSON MODAL (OnStartChallengePopup) */}
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
            <LinearGradient
              colors={['#241B42', '#151424']}
              style={styles.modalCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
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
                <View style={styles.modalAvatarRing}>
                  <Image source={SUPERNOVA_IMAGES.novaAvatar} style={styles.modalNovaAvatar} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
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
                <View style={styles.rewardItem}>
                  <Text style={{ fontSize: 16 }}>💎</Text>
                  <Text style={styles.rewardText}>+5 Gems</Text>
                </View>
              </View>

              {/* Radiant 3D Start Button */}
              <TouchableOpacity
                style={styles.modalStartBtn}
                activeOpacity={0.85}
                onPress={() => {
                  const lesson = selectedLesson;
                  setSelectedLesson(null);
                  onStartLesson(lesson);
                }}
              >
                <LinearGradient
                  colors={THEME.gradients.primary}
                  style={styles.modalStartBtnInner}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.modalStartBtnText}>
                    {completedClasses.includes(selectedLesson.id)
                      ? 'PRACTICE AGAIN (+50 XP)'
                      : 'START LESSON (+100 XP)'}
                  </Text>
                  <Image source={SUPERNOVA_IMAGES.continueArrow} style={styles.continueArrowIcon} />
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
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
    backgroundColor: THEME.colors.surfaceDark,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  statPillStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.goldLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  statPillTextStreak: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.gold,
  },
  statPillGems: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.secondaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
  },
  statPillTextGems: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.secondary,
  },
  statPillHearts: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.errorLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  statPillTextHearts: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F87171',
  },
  statEmoji: {
    fontSize: 13,
    marginRight: 4,
  },
  missNovaHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.primaryGlow,
  },
  missNovaAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.accent,
    marginLeft: 4,
  },
  missNovaText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primaryGlow,
    marginLeft: 4,
    marginRight: 2,
  },
  roadmapScroll: {
    flex: 1,
  },
  roadmapContent: {
    padding: 16,
  },
  levelSection: {
    marginBottom: 40,
  },
  unitBanner: {
    flexDirection: 'row',
    borderRadius: THEME.radius.lg,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(127, 67, 254, 0.4)',
    marginBottom: 28,
    shadowColor: '#7F43FE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  unitBannerLeft: {
    flex: 1,
    paddingRight: 10,
  },
  unitBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cefrBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: THEME.colors.primary,
    marginRight: 8,
  },
  cefrBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  unitNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primaryGlow,
    letterSpacing: 0.8,
  },
  unitTitleText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  unitDescText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  unitProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitProgressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
    fontWeight: '800',
    color: THEME.colors.accent,
  },
  unitLevelArtBox: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  levelTitleArt: {
    width: 64,
    height: 64,
  },
  nodesContainer: {
    alignItems: 'center',
  },
  nodeWrapper: {
    alignItems: 'center',
    marginBottom: 32,
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
    marginBottom: 8,
    alignItems: 'center',
  },
  startBadgeGradient: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    shadowColor: '#7F43FE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  startBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
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
    borderTopColor: '#7F43FE',
    alignSelf: 'center',
  },
  steppingStoneBtn: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: THEME.colors.surfaceCard,
    borderBottomWidth: 5,
    borderBottomColor: '#0E0E14',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  currentPulseRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 41,
    borderWidth: 3,
    borderColor: THEME.colors.primaryGlow,
  },
  steppingStoneCompleted: {
    borderColor: THEME.colors.accent,
    borderWidth: 2.5,
    borderBottomColor: THEME.colors.accentBorder,
  },
  steppingStoneCurrent: {
    borderColor: THEME.colors.primary,
    borderWidth: 3.5,
    borderBottomColor: THEME.colors.primaryBorder,
    shadowColor: '#7F43FE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  steppingStoneLocked: {
    borderColor: THEME.colors.border,
    borderWidth: 1.5,
    opacity: 0.55,
  },
  nodeArtworkImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  completedBadgeCheck: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  nodeLabelCard: {
    marginTop: 8,
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceDark,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  nodeLabelTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  nodeLabelSub: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  milestoneChestWrapper: {
    alignItems: 'center',
    marginTop: 14,
  },
  chestBtn: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: THEME.colors.surfaceCard,
    borderWidth: 2,
    borderColor: THEME.colors.gold,
    borderBottomWidth: 6,
    borderBottomColor: THEME.colors.goldBorder,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  chestImage: {
    width: 58,
    height: 58,
  },
  chestLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: THEME.colors.gold,
    marginTop: 8,
    letterSpacing: 0.5,
  },

  /* ULTRA-PREMIUM MODAL POPUP */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: width - 36,
    borderRadius: THEME.radius.xl,
    padding: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(127, 67, 254, 0.5)',
    shadowColor: '#7F43FE',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
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
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  modalDurationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  modalDurationText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginLeft: 4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalNovaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalAvatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: THEME.colors.primaryGlow,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalNovaAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
  },
  tamilConceptBox: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderRadius: THEME.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    marginBottom: 14,
  },
  tamilConceptLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.gold,
    marginBottom: 4,
    letterSpacing: 0.8,
  },
  tamilConceptText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.gold,
    lineHeight: 18,
  },
  methodologyBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: THEME.radius.md,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  methodologyTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    marginBottom: 8,
    letterSpacing: 0.8,
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: THEME.radius.md,
    paddingVertical: 10,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  modalStartBtn: {
    borderRadius: THEME.radius.lg,
    overflow: 'hidden',
    borderBottomWidth: 4,
    borderBottomColor: THEME.colors.primaryBorder,
    shadowColor: '#7F43FE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
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
    letterSpacing: 0.8,
  },
  continueArrowIcon: {
    width: 14,
    height: 14,
    tintColor: '#FFFFFF',
    marginLeft: 8,
  },
});
