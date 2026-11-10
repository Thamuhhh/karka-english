import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../constants/theme';
import { SUPERNOVA_LEVELS, SupernovaClass } from '../constants/curriculum';
import { UserStats } from '../types';
import {
  SUPERNOVA_IMAGES,
  getLessonNodeEmblem,
  getUnitBanner,
} from '../constants/supernovaAssets';

interface CurriculumScreenProps {
  onStartLesson: (lesson: SupernovaClass) => void;
  stats: UserStats;
  userRank: number;
  onRefillHearts: () => void;
  onOpenLeague?: () => void;
}

const MAX_CONTENT_WIDTH = 480;

function formatShortLessonTitle(fullTitle: string): string {
  return fullTitle.replace(/^Class\s+\d+:\s*/i, '').trim();
}

export const CurriculumScreen: React.FC<CurriculumScreenProps> = ({
  onStartLesson,
  stats,
  userRank,
  onRefillHearts,
  onOpenLeague,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [selectedLesson, setSelectedLesson] = useState<SupernovaClass | null>(null);
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<number | 'all'>('all');

  const completedClasses = stats.completedClasses;
  const totalClassesCount = SUPERNOVA_LEVELS.reduce((acc, lvl) => acc + lvl.classes.length, 0);
  const completedCount = completedClasses.length;
  const overallPercent = Math.round((completedCount / Math.max(1, totalClassesCount)) * 100);

  const nextActiveClassId =
    SUPERNOVA_LEVELS.flatMap((lvl) => lvl.classes).find(
      (cls) => !completedClasses.includes(cls.id)
    )?.id || null;

  const visibleLevels =
    selectedUnitFilter === 'all'
      ? SUPERNOVA_LEVELS
      : SUPERNOVA_LEVELS.filter((lvl) => lvl.levelNumber === selectedUnitFilter);

  // Precompute global sequential lesson number for each class ID
  const lessonNumberMap: Record<string, number> = {};
  let runningNum = 0;
  for (const lvl of SUPERNOVA_LEVELS) {
    for (const cls of lvl.classes) {
      runningNum++;
      lessonNumberMap[cls.id] = runningNum;
    }
  }

  return (
    <View style={styles.container}>
      {/* Top Obsidian HUD */}
      <View style={styles.topStatsWrapper}>
        <View style={[styles.topStatsBar, { maxWidth: MAX_CONTENT_WIDTH }]}>
          <View style={styles.hudLeftGroup}>
            <View style={styles.statPillStreak}>
              <MaterialCommunityIcons
                name="fire"
                size={15}
                color={THEME.colors.gold}
                style={styles.statIcon}
              />
              <Text style={styles.statPillTextStreak}>{stats.streakDays}</Text>
            </View>

            <View style={styles.statPillGems}>
              <Ionicons
                name="diamond"
                size={13}
                color={THEME.colors.secondary}
                style={styles.statIcon}
              />
              <Text style={styles.statPillTextGems}>{stats.gems}</Text>
            </View>

            <TouchableOpacity
              style={styles.statPillHearts}
              onPress={onRefillHearts}
              activeOpacity={0.8}
            >
              <Ionicons name="heart" size={13} color="#EF4444" style={styles.statIcon} />
              <Text style={styles.statPillTextHearts}>{stats.hearts}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.hudRightGroup}>
            {onOpenLeague && (
              <TouchableOpacity
                style={styles.statPillLeague}
                onPress={onOpenLeague}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="trophy-award"
                  size={15}
                  color={THEME.colors.gold}
                  style={styles.statIcon}
                />
                <Text style={styles.statPillTextLeague}>#{userRank}</Text>
              </TouchableOpacity>
            )}

            <View style={styles.missNovaHeaderPill}>
              <View style={styles.headerAvatarWrap}>
                <Image source={SUPERNOVA_IMAGES.novaAvatar} style={styles.missNovaAvatar} />
              </View>
              <View style={styles.onlineDot} />
              <Text style={styles.missNovaText}>Nova</Text>
            </View>
          </View>
        </View>

        {/* Unit Filter Tabs */}
        <View style={[styles.unitFilterBar, { maxWidth: MAX_CONTENT_WIDTH }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.unitFilterRow}
          >
            <TouchableOpacity
              style={[
                styles.unitFilterPill,
                selectedUnitFilter === 'all' && styles.unitFilterPillActive,
              ]}
              onPress={() => setSelectedUnitFilter('all')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.unitFilterText,
                  selectedUnitFilter === 'all' && styles.unitFilterTextActive,
                ]}
              >
                All ({completedCount}/{totalClassesCount})
              </Text>
            </TouchableOpacity>

            {SUPERNOVA_LEVELS.map((lvl) => {
              const isSelected = selectedUnitFilter === lvl.levelNumber;
              const doneInLvl = lvl.classes.filter((c) => completedClasses.includes(c.id)).length;
              return (
                <TouchableOpacity
                  key={lvl.levelNumber}
                  style={[styles.unitFilterPill, isSelected && styles.unitFilterPillActive]}
                  onPress={() => setSelectedUnitFilter(lvl.levelNumber)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.unitDot, { backgroundColor: lvl.accentColor }]} />
                  <Text style={[styles.unitFilterText, isSelected && styles.unitFilterTextActive]}>
                    Unit {lvl.levelNumber}
                  </Text>
                  <Text style={styles.unitFilterCount}>
                    {doneInLvl}/{lvl.classes.length}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.overallPctBadge}>{overallPercent}%</Text>
        </View>
      </View>

      {/* Clean Obsidian Architectural Course Timeline */}
      <ScrollView
        style={styles.courseScroll}
        contentContainerStyle={styles.courseContent}
        showsVerticalScrollIndicator={false}
      >
        {visibleLevels.map((level) => {
          const completedInLevel = level.classes.filter((c) =>
            completedClasses.includes(c.id)
          ).length;
          const progressPercent = Math.round(
            (completedInLevel / level.classes.length) * 100
          );
          const lastClass = level.classes[level.classes.length - 1];
          const isUnitCompleted = completedInLevel === level.classes.length;

          return (
            <View key={level.levelNumber} style={styles.unitSection}>
              {/* Full-Aspect 3D Diorama Unit Showcase Card */}
              <View style={styles.unitCard}>
                <View style={styles.unitMediaBox}>
                  <Image
                    source={getUnitBanner(level.levelNumber)}
                    style={styles.unitBannerBg}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['rgba(14,14,20,0.35)', 'rgba(14,14,20,0)', 'rgba(24,23,36,0.92)']}
                    locations={[0, 0.48, 1]}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={styles.unitCardTopRow}>
                    <View style={[styles.cefrBadge, { backgroundColor: level.accentColor }]}>
                      <Text style={styles.cefrBadgeText}>{level.cefrTag}</Text>
                    </View>
                    <View style={styles.unitCountPill}>
                      <Text style={styles.unitCountText}>
                        UNIT {level.levelNumber} • {completedInLevel}/{level.classes.length}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.unitCardFooter}>
                  <Text style={styles.unitTitle}>{level.levelName}</Text>
                  <Text style={styles.unitDesc} numberOfLines={2}>
                    {level.description}
                  </Text>
                  <View style={styles.unitProgressRow}>
                    <View style={styles.unitProgressTrack}>
                      <LinearGradient
                        colors={[level.accentColor, THEME.colors.accent]}
                        style={[
                          styles.unitProgressFill,
                          { width: `${Math.max(6, progressPercent)}%` },
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      />
                    </View>
                    <Text style={styles.unitProgressPctText}>{progressPercent}%</Text>
                  </View>
                </View>
              </View>

              {/* Straight Left-Spine Lesson Timeline */}
              <View style={styles.timelineList}>
                {level.classes.map((cls, cIdx) => {
                  const isCompleted = completedClasses.includes(cls.id);
                  const isCurrent = cls.id === nextActiveClassId;
                  const prevClass = cIdx > 0 ? level.classes[cIdx - 1] : null;
                  const prevCompleted = prevClass ? completedClasses.includes(prevClass.id) : false;
                  const emblemSource = getLessonNodeEmblem(cls.id);
                  const lessonNum = lessonNumberMap[cls.id] || cIdx + 1;

                  return (
                    <View key={cls.id} style={styles.timelineRow}>
                      {/* Left Aligned Vertical Spine + Node Medallion */}
                      <View style={styles.railColumn}>
                        <View
                          style={[
                            styles.railSegment,
                            cIdx === 0 && styles.railSegmentHidden,
                            prevCompleted && styles.railSegmentCompleted,
                            prevClass?.id === nextActiveClassId && styles.railSegmentActive,
                          ]}
                        />

                        <TouchableOpacity
                          style={[
                            styles.nodeCircle,
                            isCompleted && styles.nodeCircleCompleted,
                            isCurrent && styles.nodeCircleCurrent,
                            !isCompleted && !isCurrent && styles.nodeCircleLocked,
                          ]}
                          activeOpacity={0.85}
                          onPress={() => setSelectedLesson(cls)}
                        >
                          <View style={styles.nodeImageClip}>
                            <Image
                              source={emblemSource}
                              style={[
                                styles.nodeImg,
                                !isCompleted && !isCurrent && { opacity: 0.45 },
                              ]}
                              resizeMode="cover"
                            />
                          </View>

                          {isCompleted && (
                            <View style={styles.nodeCheckBadge}>
                              <MaterialCommunityIcons name="check-bold" size={10} color="#FFFFFF" />
                            </View>
                          )}
                          {!isCompleted && !isCurrent && (
                            <View style={styles.nodeLockBadge}>
                              <Ionicons
                                name="lock-closed"
                                size={9}
                                color={THEME.colors.textSecondary}
                              />
                            </View>
                          )}
                        </TouchableOpacity>

                        <View
                          style={[
                            styles.railSegment,
                            isCompleted && styles.railSegmentCompleted,
                            isCurrent && styles.railSegmentActive,
                          ]}
                        />
                      </View>

                      {/* Right Clean Lesson Card */}
                      <TouchableOpacity
                        style={[
                          styles.lessonCard,
                          isCompleted && styles.lessonCardCompleted,
                          isCurrent && styles.lessonCardCurrent,
                        ]}
                        activeOpacity={0.84}
                        onPress={() => setSelectedLesson(cls)}
                      >
                        <View style={styles.lessonCardBody}>
                          <View style={styles.lessonMetaRow}>
                            <Text style={styles.lessonIndexTag}>
                              CLASS {String(lessonNum).padStart(2, '0')}
                            </Text>

                            {isCurrent ? (
                              <View style={styles.badgeNext}>
                                <Text style={styles.badgeNextText}>NEXT UP</Text>
                              </View>
                            ) : isCompleted ? (
                              <View style={styles.badgeDone}>
                                <Text style={styles.badgeDoneText}>COMPLETED</Text>
                              </View>
                            ) : (
                              <Text style={styles.lessonDurationText}>{cls.duration}</Text>
                            )}
                          </View>

                          <Text style={styles.lessonTitle} numberOfLines={1}>
                            {formatShortLessonTitle(cls.title)}
                          </Text>
                          <Text style={styles.lessonSub} numberOfLines={1}>
                            {cls.grammarTopic}
                          </Text>
                        </View>

                        <View style={styles.lessonActionCol}>
                          <Ionicons
                            name={isCurrent ? 'play-circle' : 'chevron-forward'}
                            size={isCurrent ? 22 : 17}
                            color={
                              isCurrent
                                ? THEME.colors.primaryGlow
                                : isCompleted
                                ? THEME.colors.accent
                                : THEME.colors.textMuted
                            }
                          />
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })}

                {/* Unit Milestone Trophy Row */}
                <View style={styles.timelineRow}>
                  <View style={styles.railColumn}>
                    <View
                      style={[
                        styles.railSegment,
                        isUnitCompleted && styles.railSegmentCompleted,
                      ]}
                    />
                    <TouchableOpacity
                      style={[
                        styles.trophyNodeCircle,
                        isUnitCompleted && styles.trophyNodeCompleted,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => lastClass && setSelectedLesson(lastClass)}
                    >
                      <View style={styles.trophyImageClip}>
                        <Image
                          source={SUPERNOVA_IMAGES.trophyNova}
                          style={styles.nodeImg}
                          resizeMode="cover"
                        />
                      </View>
                    </TouchableOpacity>
                    <View style={[styles.railSegment, styles.railSegmentHidden]} />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.milestoneCard,
                      isUnitCompleted && styles.milestoneCardCompleted,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => lastClass && setSelectedLesson(lastClass)}
                  >
                    <View style={styles.lessonCardBody}>
                      <Text style={styles.milestoneEyebrow}>UNIT {level.levelNumber} MILESTONE</Text>
                      <Text style={styles.milestoneTitle}>
                        {isUnitCompleted
                          ? 'Unit Mastery Unlocked'
                          : `Complete ${level.classes.length} classes to unlock Trophy`}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="trophy-outline"
                      size={20}
                      color={isUnitCompleted ? THEME.colors.gold : THEME.colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* LESSON START MODAL */}
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
              style={[
                styles.modalCard,
                { width: Math.min(windowWidth - 32, 460), maxHeight: windowHeight * 0.86 },
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.modalHeroWrap}>
                <Image
                  source={getUnitBanner(selectedLesson.levelNumber)}
                  style={styles.modalHeroImg}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['rgba(21,20,36,0.2)', 'rgba(21,20,36,0.96)']}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={styles.modalHeaderOverlay}>
                  <View style={styles.modalBadgeRow}>
                    <View style={styles.modalLevelPill}>
                      <Text style={styles.modalLevelText}>
                        LESSON {selectedLesson.id.replace('sn-', '').replace('-', '.')}
                      </Text>
                    </View>
                    <View style={styles.modalDurationPill}>
                      <Ionicons name="time-outline" size={13} color={THEME.colors.text} />
                      <Text style={styles.modalDurationText}>{selectedLesson.duration}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => setSelectedLesson(null)}
                  >
                    <Ionicons name="close" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                <View style={styles.modalBody}>
                  <View style={styles.modalNovaRow}>
                    <View style={styles.modalAvatarRing}>
                      <View style={styles.modalAvatarInnerClip}>
                        <Image source={SUPERNOVA_IMAGES.novaAvatar} style={styles.modalNovaAvatar} />
                      </View>
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={styles.modalTitle}>{selectedLesson.title}</Text>
                      <Text style={styles.modalSubtitle}>{selectedLesson.subtitle}</Text>
                    </View>
                  </View>

                  <View style={styles.tamilConceptBox}>
                    <Text style={styles.tamilConceptLabel}>CONCEPT IN TAMIL</Text>
                    <Text style={styles.tamilConceptText}>
                      "{selectedLesson.rule.tamilMentalModel}"
                    </Text>
                  </View>

                  <View style={styles.methodologyBox}>
                    <Text style={styles.methodologyTitle}>LESSON STAGES</Text>
                    <View style={styles.stepGrid}>
                      <View style={styles.stepItem}>
                        <View
                          style={[
                            styles.stepIconWrap,
                            { backgroundColor: 'rgba(251, 191, 36, 0.14)' },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name="lightbulb-on-outline"
                            size={18}
                            color={THEME.colors.gold}
                          />
                        </View>
                        <Text style={styles.stepText}>Pattern</Text>
                      </View>
                      <View style={styles.stepItem}>
                        <View
                          style={[
                            styles.stepIconWrap,
                            { backgroundColor: 'rgba(6, 182, 212, 0.14)' },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name="puzzle-outline"
                            size={18}
                            color={THEME.colors.secondary}
                          />
                        </View>
                        <Text style={styles.stepText}>Scramble</Text>
                      </View>
                      <View style={styles.stepItem}>
                        <View
                          style={[
                            styles.stepIconWrap,
                            { backgroundColor: 'rgba(16, 185, 129, 0.14)' },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name="translate"
                            size={18}
                            color={THEME.colors.accent}
                          />
                        </View>
                        <Text style={styles.stepText}>Translate</Text>
                      </View>
                      <View style={styles.stepItem}>
                        <View
                          style={[
                            styles.stepIconWrap,
                            { backgroundColor: 'rgba(127, 67, 254, 0.16)' },
                          ]}
                        >
                          <Ionicons
                            name="mic-outline"
                            size={18}
                            color={THEME.colors.primaryGlow}
                          />
                        </View>
                        <Text style={styles.stepText}>Speaking</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.rewardsRow}>
                    <View style={styles.rewardItem}>
                      <MaterialCommunityIcons
                        name="trophy-award"
                        size={17}
                        color={THEME.colors.gold}
                      />
                      <Text style={styles.rewardText}>
                        +
                        {completedClasses.includes(selectedLesson.id)
                          ? Math.max(25, Math.round(selectedLesson.xpReward * 0.5))
                          : selectedLesson.xpReward}{' '}
                        XP
                      </Text>
                    </View>
                    <View style={styles.rewardItem}>
                      <Ionicons
                        name={stats.hearts > 0 ? 'heart' : 'shield-checkmark'}
                        size={16}
                        color={stats.hearts > 0 ? '#EF4444' : THEME.colors.accent}
                      />
                      <Text style={styles.rewardText}>
                        {stats.hearts > 0
                          ? `${stats.hearts} ${stats.hearts === 1 ? 'Life' : 'Lives'}`
                          : 'Shield'}
                      </Text>
                    </View>
                    <View style={styles.rewardItem}>
                      <Ionicons name="diamond" size={16} color={THEME.colors.secondary} />
                      <Text style={styles.rewardText}>
                        +{completedClasses.includes(selectedLesson.id) ? 2 : 5} Gems
                      </Text>
                    </View>
                  </View>

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
                          ? `PRACTICE AGAIN (+${Math.max(25, Math.round(selectedLesson.xpReward * 0.5))} XP)`
                          : `START LESSON (+${selectedLesson.xpReward} XP)`}
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={18}
                        color="#FFFFFF"
                        style={{ marginLeft: 8 }}
                      />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ScrollView>
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
  topStatsWrapper: {
    backgroundColor: THEME.colors.surfaceDark,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    alignItems: 'center',
  },
  topStatsBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
  },
  hudLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hudRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    marginRight: 3,
  },
  statPillStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 26,
    backgroundColor: THEME.colors.goldLight,
    paddingHorizontal: 8,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  statPillTextStreak: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: THEME.colors.gold,
  },
  statPillGems: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 26,
    backgroundColor: THEME.colors.secondaryLight,
    paddingHorizontal: 8,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
  },
  statPillTextGems: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: THEME.colors.secondary,
  },
  statPillHearts: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 26,
    backgroundColor: THEME.colors.errorLight,
    paddingHorizontal: 8,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  statPillTextHearts: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: '#F87171',
  },
  statPillLeague: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 26,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    paddingHorizontal: 8,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  statPillTextLeague: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: THEME.colors.gold,
  },
  missNovaHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 26,
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: 7,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: THEME.colors.primaryGlow,
  },
  headerAvatarWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
  },
  missNovaAvatar: {
    width: 18,
    height: 18,
    transform: [{ scale: 1.04 }],
  },
  onlineDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: THEME.colors.accent,
    marginLeft: 4,
  },
  missNovaText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.primaryGlow,
    marginLeft: 4,
  },

  /* UNIT FILTER TABS */
  unitFilterBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 9,
    gap: 8,
  },
  unitFilterRow: {
    gap: 6,
  },
  unitFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceCard,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 5,
  },
  unitFilterPillActive: {
    backgroundColor: 'rgba(127, 67, 254, 0.18)',
    borderColor: THEME.colors.primary,
  },
  unitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  unitFilterText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  unitFilterTextActive: {
    fontFamily: THEME.fonts.bold,
    color: '#FFFFFF',
  },
  unitFilterCount: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  overallPctBadge: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: THEME.colors.accent,
    paddingHorizontal: 4,
  },

  /* COURSE TIMELINE */
  courseScroll: {
    flex: 1,
  },
  courseContent: {
    padding: 14,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  unitSection: {
    marginBottom: 24,
  },
  unitCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(127, 67, 254, 0.4)',
    backgroundColor: THEME.colors.surface,
    marginBottom: 14,
  },
  unitMediaBox: {
    width: '100%',
    aspectRatio: 1376 / 768,
    justifyContent: 'flex-start',
    backgroundColor: THEME.colors.surfaceDark,
  },
  unitBannerBg: {
    width: '100%',
    height: '100%',
  },
  unitCardTopRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 11,
  },
  cefrBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cefrBadgeText: {
    fontFamily: THEME.fonts.extraBold,
    fontSize: 9.5,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  unitCountPill: {
    backgroundColor: 'rgba(14, 14, 20, 0.82)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  unitCountText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 9.5,
    color: THEME.colors.text,
    letterSpacing: 0.5,
  },
  unitCardFooter: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 13,
    backgroundColor: THEME.colors.surface,
  },
  unitTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 15.5,
    color: '#FFFFFF',
    marginBottom: 3,
  },
  unitDesc: {
    fontFamily: THEME.fonts.body,
    fontSize: 11.5,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
    marginBottom: 10,
  },
  unitProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  unitProgressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  unitProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  unitProgressPctText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10.5,
    color: THEME.colors.accent,
  },

  /* TIMELINE ROWS */
  timelineList: {
    width: '100%',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  railColumn: {
    width: 56,
    alignItems: 'center',
  },
  railSegment: {
    width: 2.5,
    flex: 1,
    minHeight: 12,
    backgroundColor: THEME.colors.border,
  },
  railSegmentHidden: {
    backgroundColor: 'transparent',
  },
  railSegmentCompleted: {
    backgroundColor: THEME.colors.accent,
  },
  railSegmentActive: {
    backgroundColor: THEME.colors.primary,
  },
  nodeCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: THEME.colors.surfaceCard,
    borderWidth: 2,
    borderColor: THEME.colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeCircleCompleted: {
    borderColor: THEME.colors.accent,
    borderWidth: 2.5,
  },
  nodeCircleCurrent: {
    borderColor: THEME.colors.primary,
    borderWidth: 3,
    shadowColor: '#7F43FE',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.55,
    shadowRadius: 8,
    elevation: 6,
  },
  nodeCircleLocked: {
    borderColor: THEME.colors.border,
  },
  nodeImageClip: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    backgroundColor: '#181724',
  },
  nodeImg: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.04 }],
  },
  nodeCheckBadge: {
    position: 'absolute',
    right: -2,
    bottom: -1,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: THEME.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.background,
  },
  nodeLockBadge: {
    position: 'absolute',
    right: -2,
    bottom: -1,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: THEME.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },

  /* RIGHT COLUMN CARDS */
  lessonCard: {
    flex: 1,
    marginLeft: 10,
    marginVertical: 5,
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lessonCardCompleted: {
    borderColor: 'rgba(16, 185, 129, 0.38)',
    backgroundColor: 'rgba(16, 32, 28, 0.55)',
  },
  lessonCardCurrent: {
    borderColor: THEME.colors.primary,
    borderWidth: 1.5,
    backgroundColor: 'rgba(40, 28, 72, 0.72)',
  },
  lessonCardBody: {
    flex: 1,
    paddingRight: 8,
  },
  lessonMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  lessonIndexTag: {
    fontFamily: THEME.fonts.bold,
    fontSize: 9.5,
    color: THEME.colors.textMuted,
    letterSpacing: 0.6,
  },
  badgeNext: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  badgeNextText: {
    fontFamily: THEME.fonts.extraBold,
    fontSize: 8.5,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  badgeDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  badgeDoneText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 8.5,
    color: THEME.colors.accent,
    letterSpacing: 0.4,
  },
  lessonDurationText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 9.5,
    color: THEME.colors.textSecondary,
  },
  lessonTitle: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 13.5,
    color: THEME.colors.text,
  },
  lessonSub: {
    fontFamily: THEME.fonts.body,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  lessonActionCol: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* MILESTONE ROW */
  trophyNodeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.surfaceCard,
    borderWidth: 2,
    borderColor: THEME.colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trophyNodeCompleted: {
    borderColor: THEME.colors.gold,
  },
  trophyImageClip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#181724',
  },
  milestoneCard: {
    flex: 1,
    marginLeft: 10,
    marginVertical: 5,
    backgroundColor: 'rgba(24, 23, 36, 0.65)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },
  milestoneCardCompleted: {
    borderColor: 'rgba(251, 191, 36, 0.45)',
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
  },
  milestoneEyebrow: {
    fontFamily: THEME.fonts.bold,
    fontSize: 9.5,
    color: THEME.colors.gold,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  milestoneTitle: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },

  /* MODAL POPUP */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    borderRadius: THEME.radius.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(127, 67, 254, 0.5)',
    shadowColor: '#7F43FE',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeroWrap: {
    aspectRatio: 2.0,
    width: '100%',
    justifyContent: 'flex-start',
    backgroundColor: THEME.colors.surfaceDark,
  },
  modalHeroImg: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
  },
  modalHeaderOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 4,
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
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  modalDurationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 14, 20, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  modalDurationText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 11,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(14, 14, 20, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalNovaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalAvatarRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: THEME.colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatarInnerClip: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
  },
  modalNovaAvatar: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.04 }],
  },
  modalTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 17,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontFamily: THEME.fonts.body,
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
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.gold,
    marginBottom: 4,
    letterSpacing: 0.8,
  },
  tamilConceptText: {
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 13,
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
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginBottom: 10,
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
  stepIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: THEME.radius.md,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 12,
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
    paddingVertical: 15,
  },
  modalStartBtnText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
});
