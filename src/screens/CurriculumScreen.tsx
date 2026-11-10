import React, { useState, useRef } from 'react';
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
import Svg, { Path } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../constants/theme';
import { SUPERNOVA_LEVELS, SupernovaClass } from '../constants/curriculum';
import {
  SUPERNOVA_IMAGES,
  getLessonNodeEmblem,
  getUnitBanner,
} from '../constants/supernovaAssets';

interface CurriculumScreenProps {
  onStartLesson: (lesson: SupernovaClass) => void;
  completedClasses: string[];
  onOpenLeague?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_HORIZONTAL_PAD = 16;
const MAP_WIDTH = SCREEN_WIDTH - MAP_HORIZONTAL_PAD * 2;
const NODE_SIZE = 78;
const NODE_RADIUS = NODE_SIZE / 2;
const ROW_STEP = 168;
const TOP_OFFSET = 58;
const LABEL_WIDTH = 162;

// 6-step balanced serpentine offsets (-1..+1 fraction of wave amplitude)
const SNAKE_OFFSETS = [0, 0.72, 0.92, 0.16, -0.72, -0.92];

function formatShortLessonTitle(fullTitle: string): string {
  return fullTitle.replace(/^Class\s+\d+:\s*/i, '').trim();
}

export const CurriculumScreen: React.FC<CurriculumScreenProps> = ({
  onStartLesson,
  completedClasses,
  onOpenLeague,
}) => {
  const [selectedLesson, setSelectedLesson] = useState<SupernovaClass | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const unitYPositions = useRef<Record<number, number>>({});

  const totalClassesCount = SUPERNOVA_LEVELS.reduce((acc, lvl) => acc + lvl.classes.length, 0);
  const completedCount = completedClasses.length;
  const overallPercent = Math.round((completedCount / Math.max(1, totalClassesCount)) * 100);
  const nextActiveClassId =
    SUPERNOVA_LEVELS.flatMap((lvl) => lvl.classes).find(
      (cls) => !completedClasses.includes(cls.id)
    )?.id || null;

  const waveAmp = Math.min(86, Math.max(52, (MAP_WIDTH - NODE_SIZE - 44) / 2));
  const midX = MAP_WIDTH / 2;

  const scrollToUnit = (levelNumber: number) => {
    const y = unitYPositions.current[levelNumber];
    if (typeof y === 'number' && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: Math.max(0, y - 8), animated: true });
    }
  };

  let globalLessonCounter = 0;

  return (
    <View style={styles.container}>
      {/* Subtle Topographical Map Texture Backdrop */}
      <Image
        source={SUPERNOVA_IMAGES.mapTopographyBg}
        style={styles.mapBackdropImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(14,14,20,0.45)', 'rgba(14,14,20,0.2)', 'rgba(14,14,20,0.75)']}
        style={styles.mapBackdropScrim}
        pointerEvents="none"
      />

      {/* Top HUD */}
      <View style={styles.topStatsBar}>
        <View style={styles.statPillStreak}>
          <MaterialCommunityIcons name="fire" size={16} color={THEME.colors.gold} style={styles.statIcon} />
          <Text style={styles.statPillTextStreak}>3</Text>
        </View>

        <View style={styles.statPillGems}>
          <Ionicons name="diamond" size={14} color={THEME.colors.secondary} style={styles.statIcon} />
          <Text style={styles.statPillTextGems}>450</Text>
        </View>

        <View style={styles.statPillHearts}>
          <Ionicons name="heart" size={14} color="#EF4444" style={styles.statIcon} />
          <Text style={styles.statPillTextHearts}>5</Text>
        </View>

        {onOpenLeague && (
          <TouchableOpacity style={styles.statPillLeague} onPress={onOpenLeague} activeOpacity={0.8}>
            <MaterialCommunityIcons name="trophy-award" size={16} color={THEME.colors.gold} style={styles.statIcon} />
            <Text style={styles.statPillTextLeague}>#4</Text>
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

      {/* Main Winding Adventure Map */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.roadmapScroll}
        contentContainerStyle={styles.roadmapContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Map Overview & Quick-Jump Compass Strip */}
        <View style={styles.compassStrip}>
          <View style={styles.compassTopRow}>
            <View style={styles.compassTitleGroup}>
              <Ionicons name="map-outline" size={16} color={THEME.colors.primaryGlow} />
              <Text style={styles.compassTitle}>Fluency Journey Map</Text>
            </View>
            <Text style={styles.compassProgressLabel}>
              {completedCount}/{totalClassesCount} ({overallPercent}%)
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.unitJumpRow}
          >
            {SUPERNOVA_LEVELS.map((lvl) => {
              const doneInLvl = lvl.classes.filter((c) => completedClasses.includes(c.id)).length;
              return (
                <TouchableOpacity
                  key={lvl.levelNumber}
                  style={styles.unitJumpPill}
                  onPress={() => scrollToUnit(lvl.levelNumber)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.jumpDot, { backgroundColor: lvl.accentColor }]} />
                  <Text style={styles.unitJumpText}>Unit {lvl.levelNumber}</Text>
                  <Text style={styles.unitJumpMeta}>
                    {doneInLvl}/{lvl.classes.length}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {SUPERNOVA_LEVELS.map((level) => {
          const completedInLevel = level.classes.filter((c) =>
            completedClasses.includes(c.id)
          ).length;
          const progressPercent = Math.round(
            (completedInLevel / level.classes.length) * 100
          );

          // Alternate S-curve direction per Unit for seamless visual rhythm
          const dir = level.levelNumber % 2 === 1 ? 1 : -1;

          // Compute exact node centers for SVG road & pins
          const nodePoints = level.classes.map((cls, idx) => {
            const offset = SNAKE_OFFSETS[idx % SNAKE_OFFSETS.length] * dir;
            const cx = midX + offset * waveAmp;
            const cy = TOP_OFFSET + idx * ROW_STEP;
            return { cls, cx, cy, offset, idx };
          });

          const trophyX = midX;
          const trophyY = TOP_OFFSET + level.classes.length * ROW_STEP + 6;
          const allPoints = [
            ...nodePoints.map((p) => ({ x: p.cx, y: p.cy })),
            { x: trophyX, y: trophyY },
          ];
          const canvasHeight = trophyY + 114;

          return (
            <View
              key={level.levelNumber}
              style={styles.levelSection}
              onLayout={(e) => {
                unitYPositions.current[level.levelNumber] = e.nativeEvent.layout.y;
              }}
            >
              {/* Widescreen 3D Diorama Unit Banner */}
              <View style={styles.unitBannerCard}>
                <Image
                  source={getUnitBanner(level.levelNumber)}
                  style={styles.unitBannerBgImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['rgba(14,14,20,0.12)', 'rgba(14,14,20,0.68)', 'rgba(14,14,20,0.96)']}
                  locations={[0, 0.48, 1]}
                  style={styles.unitBannerScrim}
                />

                {/* Top Badge Row floating over diorama */}
                <View style={styles.unitBannerTop}>
                  <View style={[styles.cefrBadge, { backgroundColor: level.accentColor }]}>
                    <Text style={styles.cefrBadgeText}>{level.cefrTag}</Text>
                  </View>
                  <View style={styles.unitNumberPill}>
                    <Text style={styles.unitNumberText}>UNIT {level.levelNumber}</Text>
                  </View>
                </View>

                {/* Bottom Info Footer on Banner */}
                <View style={styles.unitBannerFooter}>
                  <Text style={styles.unitTitleText}>{level.levelName}</Text>
                  <Text style={styles.unitDescText} numberOfLines={2}>
                    {level.description}
                  </Text>

                  <View style={styles.unitProgressContainer}>
                    <View style={styles.unitProgressBarBg}>
                      <LinearGradient
                        colors={[level.accentColor, THEME.colors.accent]}
                        style={[
                          styles.unitProgressBarFill,
                          { width: `${Math.max(8, progressPercent)}%` },
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      />
                    </View>
                    <Text style={styles.unitProgressText}>
                      {completedInLevel}/{level.classes.length} Mastered
                    </Text>
                  </View>
                </View>
              </View>

              {/* Connected Winding SVG Map Path Canvas */}
              <View style={[styles.mapCanvas, { width: MAP_WIDTH, height: canvasHeight }]}>
                <Svg
                  width={MAP_WIDTH}
                  height={canvasHeight}
                  style={styles.svgTrailLayer}
                >
                  {/* Outer recessed road casing */}
                  {allPoints.slice(0, -1).map((pt, segIdx) => {
                    const next = allPoints[segIdx + 1];
                    const dy = next.y - pt.y;
                    const d = `M ${pt.x} ${pt.y} C ${pt.x} ${pt.y + dy * 0.55}, ${next.x} ${next.y - dy * 0.55}, ${next.x} ${next.y}`;
                    return (
                      <Path
                        key={`casing-${segIdx}`}
                        d={d}
                        stroke="#19162B"
                        strokeWidth={22}
                        strokeLinecap="round"
                        fill="none"
                      />
                    );
                  })}

                  {/* Active/completed trail highlight segments */}
                  {allPoints.slice(0, -1).map((pt, segIdx) => {
                    const next = allPoints[segIdx + 1];
                    const dy = next.y - pt.y;
                    const d = `M ${pt.x} ${pt.y} C ${pt.x} ${pt.y + dy * 0.55}, ${next.x} ${next.y - dy * 0.55}, ${next.x} ${next.y}`;

                    const segSourceClass = level.classes[segIdx];
                    const isSegCompleted = segSourceClass && completedClasses.includes(segSourceClass.id);
                    const isSegActive = segSourceClass?.id === nextActiveClassId;

                    return (
                      <Path
                        key={`trail-${segIdx}`}
                        d={d}
                        stroke={
                          isSegCompleted
                            ? THEME.colors.accent
                            : isSegActive
                            ? THEME.colors.primaryGlow
                            : '#35314F'
                        }
                        strokeWidth={isSegCompleted ? 6 : isSegActive ? 5 : 4}
                        strokeDasharray={isSegCompleted ? undefined : '9 9'}
                        strokeLinecap="round"
                        fill="none"
                      />
                    );
                  })}
                </Svg>

                {/* Stepping Stone Lesson Nodes anchored cleanly along the SVG spline */}
                {nodePoints.map(({ cls, cx, cy, offset }) => {
                  globalLessonCounter++;
                  const isCompleted = completedClasses.includes(cls.id);
                  const isCurrent = cls.id === nextActiveClassId;

                  const emblemSource = getLessonNodeEmblem(cls.id);
                  const labelLeft = Math.max(
                    4,
                    Math.min(MAP_WIDTH - LABEL_WIDTH - 4, cx - LABEL_WIDTH / 2)
                  );

                  // Decorative topographic waypoint tag on opposite side of wave
                  const showCoordLeft = offset > 0.42;
                  const showCoordRight = offset < -0.42;

                  return (
                    <React.Fragment key={cls.id}>
                      {(showCoordLeft || showCoordRight) && (
                        <View
                          pointerEvents="none"
                          style={[
                            styles.mapCoordTag,
                            showCoordLeft ? { left: 6 } : { right: 6 },
                            { top: cy - 14 },
                          ]}
                        >
                          <Text style={styles.mapCoordCode}>
                            {level.cefrTag.replace('CEFR ', '')} • {String(globalLessonCounter).padStart(2, '0')}
                          </Text>
                          <Text style={styles.mapCoordDuration}>{cls.duration}</Text>
                        </View>
                      )}

                      {/* Floating "NEXT" indicator strictly above active node */}
                      {isCurrent && (
                        <View
                          pointerEvents="none"
                          style={[
                            styles.startBadgeBubble,
                            {
                              left: cx - 44,
                              top: cy - NODE_RADIUS - 34,
                            },
                          ]}
                        >
                          <LinearGradient
                            colors={THEME.gradients.primary}
                            style={styles.startBadgeGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Text style={styles.startBadgeText}>NEXT UP</Text>
                          </LinearGradient>
                          <View style={styles.startBadgeArrow} />
                        </View>
                      )}

                      {/* Circular Map Pin Button */}
                      <TouchableOpacity
                        style={[
                          styles.steppingStoneBtn,
                          {
                            left: cx - NODE_RADIUS,
                            top: cy - NODE_RADIUS,
                          },
                          isCompleted && styles.steppingStoneCompleted,
                          isCurrent && styles.steppingStoneCurrent,
                          !isCompleted && !isCurrent && styles.steppingStoneLocked,
                        ]}
                        activeOpacity={0.84}
                        onPress={() => setSelectedLesson(cls)}
                      >
                        <View style={styles.nodeImageClip}>
                          <Image
                            source={emblemSource}
                            style={[
                              styles.nodeArtworkImage,
                              !isCompleted && !isCurrent && { opacity: 0.45 },
                            ]}
                            resizeMode="cover"
                          />
                        </View>

                        {/* Status corner seal */}
                        {isCompleted && (
                          <View style={styles.completedBadgeCheck}>
                            <MaterialCommunityIcons name="check-bold" size={12} color="#FFFFFF" />
                          </View>
                        )}
                        {!isCompleted && !isCurrent && (
                          <View style={styles.lockedBadgeSeal}>
                            <Ionicons name="lock-closed" size={11} color={THEME.colors.textSecondary} />
                          </View>
                        )}
                      </TouchableOpacity>

                      {/* Clean Station Label Chip */}
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => setSelectedLesson(cls)}
                        style={[
                          styles.nodeLabelCard,
                          isCurrent && styles.nodeLabelCardActive,
                          {
                            left: labelLeft,
                            top: cy + NODE_RADIUS + 8,
                            width: LABEL_WIDTH,
                          },
                        ]}
                      >
                        <Text style={styles.nodeLabelTitle} numberOfLines={1}>
                          {formatShortLessonTitle(cls.title)}
                        </Text>
                        <Text style={styles.nodeLabelSub}>
                          Lesson {globalLessonCounter} • {cls.duration}
                        </Text>
                      </TouchableOpacity>
                    </React.Fragment>
                  );
                })}

                {/* Unit Milestone Pedestal connected at bottom of winding path */}
                <TouchableOpacity
                  style={[
                    styles.chestBtn,
                    {
                      left: trophyX - 44,
                      top: trophyY - 44,
                    },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => setSelectedLesson(level.classes[level.classes.length - 1])}
                >
                  <View style={styles.chestImageClip}>
                    <Image
                      source={SUPERNOVA_IMAGES.trophyNova}
                      style={styles.chestImage}
                      resizeMode="cover"
                    />
                  </View>
                </TouchableOpacity>
                <View
                  style={[
                    styles.chestLabelPill,
                    {
                      left: trophyX - 78,
                      top: trophyY + 50,
                      width: 156,
                    },
                  ]}
                >
                  <Text style={styles.chestLabel}>UNIT {level.levelNumber} MILESTONE</Text>
                </View>
              </View>
            </View>
          );
        })}

        <View style={{ height: 90 }} />
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
              style={styles.modalCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Unit Art Header Strip */}
              <View style={styles.modalHeroWrap}>
                <Image
                  source={getUnitBanner(selectedLesson.levelNumber)}
                  style={styles.modalHeroImg}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['rgba(21,20,36,0.2)', 'rgba(21,20,36,0.95)']}
                  style={styles.modalHeroScrim}
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

              <View style={styles.modalBody}>
                {/* Title & Coach */}
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

                {/* Tamil Concept Bridge */}
                <View style={styles.tamilConceptBox}>
                  <Text style={styles.tamilConceptLabel}>CONCEPT IN TAMIL</Text>
                  <Text style={styles.tamilConceptText}>
                    "{selectedLesson.rule.tamilMentalModel}"
                  </Text>
                </View>

                {/* 4-Step Breakdown */}
                <View style={styles.methodologyBox}>
                  <Text style={styles.methodologyTitle}>LESSON STAGES</Text>
                  <View style={styles.stepGrid}>
                    <View style={styles.stepItem}>
                      <View style={[styles.stepIconWrap, { backgroundColor: 'rgba(251, 191, 36, 0.14)' }]}>
                        <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={THEME.colors.gold} />
                      </View>
                      <Text style={styles.stepText}>Pattern</Text>
                    </View>
                    <View style={styles.stepItem}>
                      <View style={[styles.stepIconWrap, { backgroundColor: 'rgba(6, 182, 212, 0.14)' }]}>
                        <MaterialCommunityIcons name="puzzle-outline" size={18} color={THEME.colors.secondary} />
                      </View>
                      <Text style={styles.stepText}>Scramble</Text>
                    </View>
                    <View style={styles.stepItem}>
                      <View style={[styles.stepIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.14)' }]}>
                        <MaterialCommunityIcons name="translate" size={18} color={THEME.colors.accent} />
                      </View>
                      <Text style={styles.stepText}>Translate</Text>
                    </View>
                    <View style={styles.stepItem}>
                      <View style={[styles.stepIconWrap, { backgroundColor: 'rgba(127, 67, 254, 0.16)' }]}>
                        <Ionicons name="mic-outline" size={18} color={THEME.colors.primaryGlow} />
                      </View>
                      <Text style={styles.stepText}>Speaking</Text>
                    </View>
                  </View>
                </View>

                {/* Rewards Row */}
                <View style={styles.rewardsRow}>
                  <View style={styles.rewardItem}>
                    <MaterialCommunityIcons name="trophy-award" size={17} color={THEME.colors.gold} />
                    <Text style={styles.rewardText}>+{selectedLesson.xpReward} XP</Text>
                  </View>
                  <View style={styles.rewardItem}>
                    <Ionicons name="heart" size={16} color="#EF4444" />
                    <Text style={styles.rewardText}>5 Lives</Text>
                  </View>
                  <View style={styles.rewardItem}>
                    <Ionicons name="diamond" size={16} color={THEME.colors.secondary} />
                    <Text style={styles.rewardText}>+5 Gems</Text>
                  </View>
                </View>

                {/* Start Action */}
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
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
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
  mapBackdropImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.65,
  },
  mapBackdropScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  topStatsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(18, 17, 27, 0.94)',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  statIcon: {
    marginRight: 4,
  },
  statPillStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.goldLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
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
    backgroundColor: THEME.colors.secondaryLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
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
    backgroundColor: THEME.colors.errorLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
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
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
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
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.primaryGlow,
  },
  headerAvatarWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
  },
  missNovaAvatar: {
    width: 22,
    height: 22,
    transform: [{ scale: 1.08 }],
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.accent,
    marginLeft: 4,
  },
  missNovaText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.primaryGlow,
    marginLeft: 4,
  },
  roadmapScroll: {
    flex: 1,
  },
  roadmapContent: {
    paddingHorizontal: MAP_HORIZONTAL_PAD,
    paddingTop: 14,
  },
  compassStrip: {
    backgroundColor: 'rgba(24, 23, 36, 0.88)',
    borderRadius: THEME.radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 18,
  },
  compassTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  compassTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compassTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 13,
    color: THEME.colors.text,
  },
  compassProgressLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 12,
    color: THEME.colors.accent,
  },
  unitJumpRow: {
    gap: 8,
  },
  unitJumpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceCard,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    gap: 6,
  },
  jumpDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  unitJumpText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.text,
  },
  unitJumpMeta: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textSecondary,
  },
  levelSection: {
    marginBottom: 34,
  },
  unitBannerCard: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 186,
    borderWidth: 1.5,
    borderColor: 'rgba(127, 67, 254, 0.45)',
    marginBottom: 10,
    backgroundColor: THEME.colors.surfaceCard,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
    justifyContent: 'space-between',
  },
  unitBannerBgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  unitBannerScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  unitBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  cefrBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cefrBadgeText: {
    fontFamily: THEME.fonts.extraBold,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  unitNumberPill: {
    backgroundColor: 'rgba(14, 14, 20, 0.72)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  unitNumberText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.text,
    letterSpacing: 0.8,
  },
  unitBannerFooter: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  unitTitleText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 17,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  unitDescText: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: '#D2CEE3',
    lineHeight: 16,
    marginBottom: 10,
  },
  unitProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitProgressBarBg: {
    flex: 1,
    height: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 10,
  },
  unitProgressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  unitProgressText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: THEME.colors.accent,
  },

  /* WINDING MAP CANVAS */
  mapCanvas: {
    position: 'relative',
  },
  svgTrailLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  mapCoordTag: {
    position: 'absolute',
    backgroundColor: 'rgba(20, 19, 32, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(61, 57, 92, 0.55)',
  },
  mapCoordCode: {
    fontFamily: THEME.fonts.bold,
    fontSize: 9,
    color: THEME.colors.textMuted,
    letterSpacing: 0.6,
  },
  mapCoordDuration: {
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 9,
    color: THEME.colors.textSecondary,
  },
  startBadgeBubble: {
    position: 'absolute',
    width: 88,
    alignItems: 'center',
    zIndex: 10,
  },
  startBadgeGradient: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C4B5FD',
    shadowColor: '#7F43FE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  startBadgeText: {
    fontFamily: THEME.fonts.extraBold,
    fontSize: 9,
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
  },
  steppingStoneBtn: {
    position: 'absolute',
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_RADIUS,
    backgroundColor: THEME.colors.surfaceCard,
    borderBottomWidth: 5,
    borderBottomColor: '#0E0E14',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 4,
  },
  steppingStoneCompleted: {
    borderColor: THEME.colors.accent,
    borderWidth: 3,
    borderBottomColor: THEME.colors.accentBorder,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  steppingStoneCurrent: {
    borderColor: THEME.colors.primary,
    borderWidth: 3.5,
    borderBottomColor: THEME.colors.primaryBorder,
    shadowColor: '#7F43FE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.65,
    shadowRadius: 14,
    elevation: 9,
  },
  steppingStoneLocked: {
    borderColor: '#363252',
    borderWidth: 2,
    borderBottomColor: '#141320',
  },
  nodeImageClip: {
    width: NODE_SIZE - 8,
    height: NODE_SIZE - 8,
    borderRadius: (NODE_SIZE - 8) / 2,
    overflow: 'hidden',
    backgroundColor: '#181724',
  },
  nodeArtworkImage: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.09 }],
  },
  completedBadgeCheck: {
    position: 'absolute',
    right: -2,
    bottom: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0E0E14',
  },
  lockedBadgeSeal: {
    position: 'absolute',
    right: -2,
    bottom: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#242138',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#3D395C',
  },
  nodeLabelCard: {
    position: 'absolute',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 17, 27, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    zIndex: 5,
  },
  nodeLabelCardActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(31, 25, 56, 0.96)',
  },
  nodeLabelTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  nodeLabelSub: {
    fontFamily: THEME.fonts.medium,
    fontSize: 9,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },

  /* MILESTONE CHEST */
  chestBtn: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#181724',
    borderWidth: 2.5,
    borderColor: THEME.colors.gold,
    borderBottomWidth: 5,
    borderBottomColor: THEME.colors.goldBorder,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 4,
  },
  chestImageClip: {
    width: 78,
    height: 78,
    borderRadius: 39,
    overflow: 'hidden',
    backgroundColor: '#181724',
  },
  chestImage: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.08 }],
  },
  chestLabelPill: {
    position: 'absolute',
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
  },
  chestLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.gold,
    letterSpacing: 0.7,
  },

  /* MODAL POPUP */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: SCREEN_WIDTH - 32,
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
    height: 92,
    width: '100%',
    justifyContent: 'flex-start',
  },
  modalHeroImg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  modalHeroScrim: {
    ...StyleSheet.absoluteFillObject,
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
    transform: [{ scale: 1.08 }],
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
