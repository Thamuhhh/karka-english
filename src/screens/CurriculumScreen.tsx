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
import Svg, { Path } from 'react-native-svg';
import { THEME } from '../constants/theme';
import { SUPERNOVA_LEVELS, SupernovaClass } from '../constants/curriculum';
import { UserStats } from '../types';
import {
  SUPERNOVA_IMAGES,
  getLessonNodeEmblem,
} from '../constants/supernovaAssets';
import { LiveStreakBadge } from '../components/LiveStreakBadge';

interface CurriculumScreenProps {
  onStartLesson: (lesson: SupernovaClass) => void;
  stats: UserStats;
  userRank: number;
  onRefillHearts: () => void;
  onOpenLeague?: () => void;
}

const MAX_CONTENT_WIDTH = 480;
const MAP_STEP_Y = 138;
const MAP_TOP_CY = 72;
const NODE_LABEL_WIDTH = 152;
const NODE_DIAMETER = 66;

function getZigZagCenterX(
  index: number,
  totalClassCount: number,
  mapWidth: number,
  isTrophy = false
): number {
  const halfLabel = NODE_LABEL_WIDTH / 2;
  const leftX = Math.max(halfLabel + 8, mapWidth * 0.25);
  const rightX = Math.min(mapWidth - halfLabel - 8, mapWidth * 0.75);
  const centerX = mapWidth / 2;

  if (isTrophy || index === 0 || index >= totalClassCount) {
    return centerX;
  }
  return index % 2 === 1 ? leftX : rightX;
}

const LESSON_STAGES = [
  { key: 'pattern', label: 'Pattern', family: 'mci' as const, icon: 'lightbulb-on-outline' },
  { key: 'scramble', label: 'Scramble', family: 'mci' as const, icon: 'puzzle-outline' },
  { key: 'translate', label: 'Translate', family: 'mci' as const, icon: 'translate' },
  { key: 'speak', label: 'Speak', family: 'ion' as const, icon: 'mic-outline' },
];

function formatShortLessonTitle(fullTitle: string): string {
  return fullTitle.replace(/^Class\s+\d+:\s*/i, '').trim();
}

function formatShortUnitTitle(fullName: string): string {
  return fullName.replace(/^Unit\s+\d+:\s*/i, '').trim();
}

export const CurriculumScreen: React.FC<CurriculumScreenProps> = ({
  onStartLesson,
  stats,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [selectedLesson, setSelectedLesson] = useState<SupernovaClass | null>(null);

  const completedClasses = stats.completedClasses;
  const mapWidth = Math.min(windowWidth - 36, MAX_CONTENT_WIDTH - 36);
  const isSelectedCompleted = selectedLesson
    ? completedClasses.includes(selectedLesson.id)
    : false;
  const selectedXpReward = selectedLesson
    ? isSelectedCompleted
      ? Math.max(25, Math.round(selectedLesson.xpReward * 0.5))
      : selectedLesson.xpReward
    : 0;
  const selectedGemReward = isSelectedCompleted ? 2 : 5;

  const nextActiveClassId =
    SUPERNOVA_LEVELS.flatMap((lvl) => lvl.classes).find(
      (cls) => !completedClasses.includes(cls.id)
    )?.id || null;
  const stickyUnitIndices = SUPERNOVA_LEVELS.map((_, idx) => idx * 2);

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
      {/* Top Navigation Header: Brand Left + Live Streak Right */}
      <View style={styles.topNavHeader}>
        <Text style={styles.appNameText}>NovaBreaker</Text>
        <LiveStreakBadge streakDays={stats.streakDays} />
      </View>

      {/* Single Unified Obsidian Topography Canvas */}
      <View style={styles.mapStage}>
        <Image
          source={SUPERNOVA_IMAGES.mapTopographyBg}
          style={styles.screenBgTexture}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(14,14,20,0.84)', 'rgba(14,14,20,0.62)', 'rgba(14,14,20,0.88)']}
          locations={[0, 0.48, 1]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        {/* Clean Obsidian Architectural Course Timeline with Sticky Unit Headers */}
        <ScrollView
          style={styles.courseScroll}
          contentContainerStyle={styles.courseContent}
          stickyHeaderIndices={stickyUnitIndices}
          showsVerticalScrollIndicator={false}
        >
        {SUPERNOVA_LEVELS.flatMap((level) => {
          const completedInLevel = level.classes.filter((c) =>
            completedClasses.includes(c.id)
          ).length;
          const progressPercent = Math.round(
            (completedInLevel / level.classes.length) * 100
          );
          const lastClass = level.classes[level.classes.length - 1];
          const isUnitCompleted = completedInLevel === level.classes.length;

          return [
            /* Sticky Editorial Unit Header (Pins below Top Nav while in unit) */
            <View key={`hdr-${level.levelNumber}`} style={styles.stickyUnitHeader}>
              <View style={styles.stickyUnitHeaderInner}>
                <View style={styles.unitEditorialMetaRow}>
                  <View style={styles.unitEyebrowGroup}>
                    <View
                      style={[
                        styles.unitDot,
                        isUnitCompleted && styles.unitDotCompleted,
                      ]}
                    />
                    <Text style={styles.unitEyebrowText}>
                      UNIT {String(level.levelNumber).padStart(2, '0')} · {level.cefrTag}
                    </Text>
                  </View>
                  <Text style={styles.unitProgressStatText}>
                    {completedInLevel}/{level.classes.length} · {progressPercent}%
                  </Text>
                </View>

                <Text style={styles.unitEditorialTitle} numberOfLines={1}>
                  {formatShortUnitTitle(level.levelName)}
                </Text>

                <View style={styles.unitHairlineTrack}>
                  {progressPercent > 0 && (
                    <LinearGradient
                      colors={['#7F43FE', '#A78BFA']}
                      style={[
                        styles.unitHairlineFill,
                        { width: `${progressPercent}%` },
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                  )}
                </View>
              </View>
            </View>,

            /* Unit Open Zig-Zag Map Section */
            <View key={`map-${level.levelNumber}`} style={styles.unitMapSection}>
              <Text style={styles.unitEditorialDesc} numberOfLines={2}>
                {level.description}
              </Text>

              {/* Open Winding Obsidian SVG Zig-Zag Progression Path */}
              <View
                style={[
                  styles.mapPathWrap,
                  {
                    width: mapWidth,
                    height: MAP_TOP_CY + level.classes.length * MAP_STEP_Y + 98,
                  },
                ]}
              >
                {/* Smooth Cubic Bezier Winding Road */}
                <Svg
                  width={mapWidth}
                  height={MAP_TOP_CY + level.classes.length * MAP_STEP_Y + 98}
                  style={StyleSheet.absoluteFillObject}
                >
                  {level.classes.map((cls, cIdx) => {
                    const nextIsTrophy = cIdx === level.classes.length - 1;
                    const x1 = getZigZagCenterX(cIdx, level.classes.length, mapWidth, false);
                    const y1 = MAP_TOP_CY + cIdx * MAP_STEP_Y;
                    const x2 = getZigZagCenterX(
                      cIdx + 1,
                      level.classes.length,
                      mapWidth,
                      nextIsTrophy
                    );
                    const y2 = MAP_TOP_CY + (cIdx + 1) * MAP_STEP_Y;
                    const midY = (y1 + y2) / 2;
                    const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

                    const isSegmentDone = completedClasses.includes(cls.id);
                    const isNextClass =
                      level.classes[cIdx + 1]?.id === nextActiveClassId ||
                      cls.id === nextActiveClassId;

                    return (
                      <React.Fragment key={`seg-${cls.id}`}>
                        {(isSegmentDone || isNextClass) && (
                          <Path
                            d={d}
                            stroke="rgba(127, 67, 254, 0.26)"
                            strokeWidth={11}
                            strokeLinecap="round"
                            fill="none"
                          />
                        )}
                        <Path
                          d={d}
                          stroke={
                            isSegmentDone
                              ? '#A78BFA'
                              : isNextClass
                              ? THEME.colors.primary
                              : '#2E2B45'
                          }
                          strokeWidth={isSegmentDone || isNextClass ? 3.5 : 2.5}
                          strokeDasharray={isSegmentDone || isNextClass ? undefined : '6 7'}
                          strokeLinecap="round"
                          fill="none"
                        />
                      </React.Fragment>
                    );
                  })}
                </Svg>

                {/* Zig-Zag Lesson Stop Nodes */}
                {level.classes.map((cls, cIdx) => {
                  const isCompleted = completedClasses.includes(cls.id);
                  const isCurrent = cls.id === nextActiveClassId;
                  const emblemSource = getLessonNodeEmblem(cls.id);
                  const lessonNum = lessonNumberMap[cls.id] || cIdx + 1;
                  const cx = getZigZagCenterX(cIdx, level.classes.length, mapWidth, false);
                  const cy = MAP_TOP_CY + cIdx * MAP_STEP_Y;
                  const halfNode = NODE_DIAMETER / 2;

                  return (
                    <React.Fragment key={cls.id}>
                      {isCurrent && (
                        <View
                          style={[
                            styles.nextFloatTag,
                            { left: cx - 32, top: cy - halfNode - 24 },
                          ]}
                        >
                          <Text style={styles.nextFloatTagText}>NEXT UP</Text>
                        </View>
                      )}

                      <TouchableOpacity
                        style={[
                          styles.mapNodeCircle,
                          isCompleted && styles.mapNodeCompleted,
                          isCurrent && styles.mapNodeCurrent,
                          !isCompleted && !isCurrent && styles.mapNodeLocked,
                          { left: cx - halfNode, top: cy - halfNode },
                        ]}
                        activeOpacity={0.86}
                        onPress={() => setSelectedLesson(cls)}
                      >
                        <View style={styles.mapNodeImgClip}>
                          <Image
                            source={emblemSource}
                            style={[
                              styles.nodeImg,
                              !isCompleted && !isCurrent && { opacity: 0.42 },
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

                      <TouchableOpacity
                        style={[
                          styles.mapLabelPill,
                          isCompleted && styles.mapLabelCompleted,
                          isCurrent && styles.mapLabelCurrent,
                          { left: cx - NODE_LABEL_WIDTH / 2, top: cy + halfNode + 7 },
                        ]}
                        activeOpacity={0.85}
                        onPress={() => setSelectedLesson(cls)}
                      >
                        <Text
                          style={[
                            styles.mapLabelIndex,
                            isCurrent && styles.mapLabelIndexCurrent,
                          ]}
                        >
                          {String(lessonNum).padStart(2, '0')} ·{' '}
                          {isCompleted ? 'DONE' : cls.duration.toUpperCase()}
                        </Text>
                        <Text style={styles.mapLabelTitle} numberOfLines={2}>
                          {formatShortLessonTitle(cls.title)}
                        </Text>
                      </TouchableOpacity>
                    </React.Fragment>
                  );
                })}

                {/* Centered Unit Trophy Crest Milestone */}
                {(() => {
                  const trophyIdx = level.classes.length;
                  const cx = getZigZagCenterX(trophyIdx, level.classes.length, mapWidth, true);
                  const cy = MAP_TOP_CY + trophyIdx * MAP_STEP_Y;
                  const halfTrophy = 31;

                  return (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.trophyNodeCircle,
                          isUnitCompleted && styles.trophyNodeCompleted,
                          { left: cx - halfTrophy, top: cy - halfTrophy },
                        ]}
                        activeOpacity={0.85}
                        onPress={() => lastClass && setSelectedLesson(lastClass)}
                      >
                        <View style={styles.trophyImageClip}>
                          <Image
                            source={SUPERNOVA_IMAGES.trophyNova}
                            style={[styles.nodeImg, !isUnitCompleted && { opacity: 0.55 }]}
                            resizeMode="cover"
                          />
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.mapLabelPill,
                          isUnitCompleted && styles.milestoneLabelDone,
                          { left: cx - NODE_LABEL_WIDTH / 2, top: cy + halfTrophy + 7 },
                        ]}
                        activeOpacity={0.85}
                        onPress={() => lastClass && setSelectedLesson(lastClass)}
                      >
                        <Text style={styles.milestoneEyebrow}>UNIT {level.levelNumber} TROPHY</Text>
                        <Text style={styles.mapLabelTitle} numberOfLines={1}>
                          {isUnitCompleted ? 'Mastery Unlocked' : `Finish ${level.classes.length} Classes`}
                        </Text>
                      </TouchableOpacity>
                    </>
                  );
                })()}
              </View>
            </View>,
          ];
        })}

        <View key="map-bottom-spacer" style={{ height: 32 }} />
        </ScrollView>
      </View>

      {/* Sleek Obsidian Lesson Sheet Modal */}
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
            <View
              style={[
                styles.modalCard,
                { width: Math.min(windowWidth - 32, 420), maxHeight: windowHeight * 0.82 },
              ]}
            >
              {/* Fixed Editorial Header */}
              <View style={styles.modalTopHeader}>
                <View style={styles.modalHeaderRow}>
                  <View style={styles.modalEmblemWrap}>
                    <Image
                      source={getLessonNodeEmblem(selectedLesson.id)}
                      style={styles.modalEmblemImg}
                      resizeMode="cover"
                    />
                  </View>

                  <View style={styles.modalTitleBlock}>
                    <Text style={styles.modalEyebrow}>
                      LESSON {selectedLesson.id.replace('sn-', '').replace('-', '.')}  ·{' '}
                      {selectedLesson.duration.toUpperCase()}
                    </Text>
                    <Text style={styles.modalTitle}>
                      {formatShortLessonTitle(selectedLesson.title)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => setSelectedLesson(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={16} color="#9C98B8" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalSubtitle}>{selectedLesson.subtitle}</Text>
              </View>

              {/* Scrollable Middle Details (Shrinks cleanly on small screens) */}
              <ScrollView
                style={styles.modalScroll}
                bounces={false}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.tamilConceptBox}>
                  <Text style={styles.tamilConceptLabel}>TAMIL KEY INSIGHT</Text>
                  <Text style={styles.tamilConceptText}>
                    "{selectedLesson.rule.tamilMentalModel}"
                  </Text>
                </View>

                <View style={styles.stagesSection}>
                  <Text style={styles.sectionEyebrow}>LESSON FLOW</Text>
                  <View style={styles.stepGrid}>
                    {LESSON_STAGES.map((stage) => (
                      <View key={stage.key} style={styles.stepPill}>
                        {stage.family === 'mci' ? (
                          <MaterialCommunityIcons
                            name={stage.icon as any}
                            size={16}
                            color={THEME.colors.primaryGlow}
                          />
                        ) : (
                          <Ionicons
                            name={stage.icon as any}
                            size={16}
                            color={THEME.colors.primaryGlow}
                          />
                        )}
                        <Text style={styles.stepText} numberOfLines={1}>
                          {stage.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.rewardsStrip}>
                  <View style={styles.rewardItem}>
                    <MaterialCommunityIcons
                      name="trophy-variant"
                      size={15}
                      color={THEME.colors.gold}
                    />
                    <Text style={styles.rewardText}>+{selectedXpReward} XP</Text>
                  </View>

                  <View style={styles.rewardDivider} />

                  <View style={styles.rewardItem}>
                    <Ionicons name="diamond" size={14} color={THEME.colors.secondary} />
                    <Text style={styles.rewardText}>+{selectedGemReward} Gems</Text>
                  </View>

                  <View style={styles.rewardDivider} />

                  <View style={styles.rewardItem}>
                    <Ionicons
                      name={stats.hearts > 0 ? 'heart' : 'shield-checkmark'}
                      size={14.5}
                      color={stats.hearts > 0 ? '#C4B5FD' : '#A78BFA'}
                    />
                    <Text style={styles.rewardText}>
                      {stats.hearts > 0
                        ? `${stats.hearts} ${stats.hearts === 1 ? 'Life' : 'Lives'}`
                        : 'Shield'}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Pinned Primary Action Footer (Always visible on every screen height) */}
              <View style={styles.modalActionsWrap}>
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
                    colors={['#8B5CF6', '#6D28D9']}
                    style={styles.modalStartBtnInner}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.modalStartBtnText}>
                      {isSelectedCompleted ? 'Practice Again' : 'Start Lesson'}
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={17}
                      color="#FFFFFF"
                      style={{ marginLeft: 8 }}
                    />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
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
  topNavHeader: {
    backgroundColor: THEME.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.07)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appNameText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },

  /* COURSE TIMELINE */
  mapStage: {
    flex: 1,
    position: 'relative',
    backgroundColor: THEME.colors.background,
    overflow: 'hidden',
  },
  screenBgTexture: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.22,
  },
  courseScroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  courseContent: {
    paddingBottom: 24,
    width: '100%',
  },
  stickyUnitHeader: {
    width: '100%',
    backgroundColor: 'rgba(14, 14, 20, 0.94)',
    zIndex: 10,
  },
  stickyUnitHeaderInner: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  unitMapSection: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 26,
  },
  unitEditorialMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  unitEyebrowGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  unitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.primary,
  },
  unitDotCompleted: {
    backgroundColor: THEME.colors.gold,
  },
  unitEyebrowText: {
    fontFamily: THEME.fonts.extraBold,
    fontSize: 10.5,
    color: THEME.colors.primaryGlow,
    letterSpacing: 1.1,
  },
  unitProgressStatText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10.5,
    color: '#C4B5FD',
    letterSpacing: 0.4,
  },
  unitEditorialTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 18.5,
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 9,
  },
  unitEditorialDesc: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 17,
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  unitHairlineTrack: {
    width: '100%',
    height: 2,
    borderRadius: 1,
    backgroundColor: '#252238',
    overflow: 'hidden',
  },
  unitHairlineFill: {
    height: '100%',
    borderRadius: 1,
  },

  /* ZIG-ZAG COURSE PATH (OPEN ON UNIFIED BACKGROUND) */
  mapPathWrap: {
    position: 'relative',
    alignSelf: 'center',
  },
  nextFloatTag: {
    position: 'absolute',
    width: 64,
    paddingVertical: 2.5,
    borderRadius: 7,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    shadowColor: '#7F43FE',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.55,
    shadowRadius: 6,
    elevation: 6,
  },
  nextFloatTagText: {
    fontFamily: THEME.fonts.extraBold,
    fontSize: 8.5,
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  mapNodeCircle: {
    position: 'absolute',
    width: NODE_DIAMETER,
    height: NODE_DIAMETER,
    borderRadius: NODE_DIAMETER / 2,
    backgroundColor: THEME.colors.surfaceCard,
    borderWidth: 2,
    borderColor: THEME.colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  mapNodeCompleted: {
    borderColor: '#9D7CFE',
    borderWidth: 2.5,
  },
  mapNodeCurrent: {
    borderColor: THEME.colors.primaryGlow,
    borderWidth: 3,
    shadowColor: '#7F43FE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  mapNodeLocked: {
    borderColor: '#29263F',
  },
  mapNodeImgClip: {
    width: NODE_DIAMETER - 10,
    height: NODE_DIAMETER - 10,
    borderRadius: (NODE_DIAMETER - 10) / 2,
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
    right: -1,
    bottom: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.background,
  },
  nodeLockBadge: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  mapLabelPill: {
    position: 'absolute',
    width: NODE_LABEL_WIDTH,
    backgroundColor: 'rgba(14, 14, 20, 0.68)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
    zIndex: 2,
  },
  mapLabelCompleted: {
    backgroundColor: 'rgba(18, 16, 30, 0.72)',
  },
  mapLabelCurrent: {
    backgroundColor: 'rgba(127, 67, 254, 0.2)',
  },
  mapLabelIndex: {
    fontFamily: THEME.fonts.bold,
    fontSize: 8.5,
    color: THEME.colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 1,
  },
  mapLabelIndexCurrent: {
    color: '#C4B5FD',
  },
  mapLabelTitle: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 14,
  },

  /* TROPHY CREST NODE */
  trophyNodeCircle: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: THEME.colors.surfaceCard,
    borderWidth: 2,
    borderColor: '#34304D',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  trophyNodeCompleted: {
    borderColor: THEME.colors.gold,
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  trophyImageClip: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#181724',
  },
  milestoneLabelDone: {
    borderColor: 'rgba(251, 191, 36, 0.45)',
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
  },
  milestoneEyebrow: {
    fontFamily: THEME.fonts.bold,
    fontSize: 8.5,
    color: THEME.colors.gold,
    letterSpacing: 0.6,
    marginBottom: 1,
  },

  /* MODAL POPUP */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(6, 6, 10, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 28,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: '#141320',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2B2842',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 16,
  },
  modalScroll: {
    flexShrink: 1,
    flexGrow: 0,
  },
  modalTopHeader: {
    flexShrink: 0,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  modalEmblemWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#322E4D',
    backgroundColor: '#1C1A2B',
  },
  modalEmblemImg: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.04 }],
  },
  modalTitleBlock: {
    flex: 1,
    marginLeft: 14,
    paddingRight: 10,
  },
  modalEyebrow: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10.5,
    color: '#A78BFA',
    letterSpacing: 0.7,
  },
  modalTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 24,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E1C2D',
    borderWidth: 1,
    borderColor: '#2E2B44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubtitle: {
    fontFamily: THEME.fonts.body,
    fontSize: 13,
    color: '#9D99B5',
    lineHeight: 19,
    marginTop: 12,
  },
  tamilConceptBox: {
    marginHorizontal: 22,
    marginBottom: 14,
    backgroundColor: '#1A1829',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.primary,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  tamilConceptLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: '#A78BFA',
    marginBottom: 5,
    letterSpacing: 0.8,
  },
  tamilConceptText: {
    fontFamily: THEME.fonts.tamilMedium,
    fontSize: 13.5,
    color: '#F1EFFC',
    lineHeight: 24,
  },
  stagesSection: {
    paddingHorizontal: 22,
    marginBottom: 14,
  },
  sectionEyebrow: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginBottom: 10,
    letterSpacing: 0.8,
  },
  stepGrid: {
    flexDirection: 'row',
    gap: 7,
  },
  stepPill: {
    flex: 1,
    backgroundColor: '#191826',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#27253B',
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  stepText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 10.5,
    color: '#D7D4EC',
    textAlign: 'center',
  },
  rewardsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: 22,
    paddingVertical: 12,
    marginBottom: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  rewardText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  modalActionsWrap: {
    flexShrink: 0,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 20,
    backgroundColor: '#141320',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalStartBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: THEME.colors.primary,
  },
  modalStartBtnInner: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
  },
  modalStartBtnText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 14.5,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
});
