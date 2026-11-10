import React, { useState, useRef } from 'react';
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

const MAX_CONTENT_WIDTH = 520;
const MAP_HORIZONTAL_PAD = 16;
const NODE_SIZE = 72;
const NODE_RADIUS = NODE_SIZE / 2;
const CARD_HEIGHT = 76;
const CARD_GAP = 14;
const ROW_STEP = 148;
const TOP_OFFSET = 52;
const TROPHY_SIZE = 82;

function formatShortLessonTitle(fullTitle: string): string {
  return fullTitle.replace(/^Class\s+\d+:\s*/i, '').trim();
}

export const CurriculumScreen: React.FC<CurriculumScreenProps> = ({
  onStartLesson,
  completedClasses,
  onOpenLeague,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const contentWidth = Math.min(windowWidth, MAX_CONTENT_WIDTH);
  const mapWidth = Math.max(280, contentWidth - MAP_HORIZONTAL_PAD * 2);

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

  const leftNodeCx = NODE_RADIUS + 4;
  const rightNodeCx = mapWidth - NODE_RADIUS - 4;
  const midX = mapWidth / 2;
  const cardWidth = Math.max(160, mapWidth - NODE_SIZE - CARD_GAP - 8);

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
        colors={['rgba(14,14,20,0.45)', 'rgba(14,14,20,0.2)', 'rgba(14,14,20,0.78)']}
        style={styles.mapBackdropScrim}
        pointerEvents="none"
      />

      {/* Top Fixed HUD */}
      <View style={styles.topStatsWrapper}>
        <View style={[styles.topStatsBar, { maxWidth: MAX_CONTENT_WIDTH }]}>
          <View style={styles.hudLeftGroup}>
            <View style={styles.statPillStreak}>
              <MaterialCommunityIcons name="fire" size={15} color={THEME.colors.gold} style={styles.statIcon} />
              <Text style={styles.statPillTextStreak}>3</Text>
            </View>

            <View style={styles.statPillGems}>
              <Ionicons name="diamond" size={13} color={THEME.colors.secondary} style={styles.statIcon} />
              <Text style={styles.statPillTextGems}>450</Text>
            </View>

            <View style={styles.statPillHearts}>
              <Ionicons name="heart" size={13} color="#EF4444" style={styles.statIcon} />
              <Text style={styles.statPillTextHearts}>5</Text>
            </View>
          </View>

          <View style={styles.hudRightGroup}>
            {onOpenLeague && (
              <TouchableOpacity style={styles.statPillLeague} onPress={onOpenLeague} activeOpacity={0.8}>
                <MaterialCommunityIcons name="trophy-award" size={15} color={THEME.colors.gold} style={styles.statIcon} />
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
        </View>
      </View>

      {/* Main Winding Adventure Map */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.roadmapScroll}
        contentContainerStyle={[
          styles.roadmapContent,
          { width: contentWidth, alignSelf: 'center' },
        ]}
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

          // Alternate starting side per unit (Unit 1 starts Left->Right, Unit 2 Right->Left)
          const startLeft = level.levelNumber % 2 === 1;

          const nodePoints = level.classes.map((cls, idx) => {
            const isLeft = startLeft ? idx % 2 === 0 : idx % 2 === 1;
            const cx = isLeft ? leftNodeCx : rightNodeCx;
            const cy = TOP_OFFSET + idx * ROW_STEP;
            return { cls, cx, cy, isLeft, idx };
          });

          const lastPoint = nodePoints[nodePoints.length - 1];
          const trophyX = midX;
          const trophyY = lastPoint ? lastPoint.cy + ROW_STEP - 12 : TOP_OFFSET + 60;
          const allPoints = [
            ...nodePoints.map((p) => ({ x: p.cx, y: p.cy })),
            { x: trophyX, y: trophyY },
          ];
          const canvasHeight = trophyY + TROPHY_SIZE / 2 + 46;

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

                <View style={styles.unitBannerTop}>
                  <View style={[styles.cefrBadge, { backgroundColor: level.accentColor }]}>
                    <Text style={styles.cefrBadgeText}>{level.cefrTag}</Text>
                  </View>
                  <View style={styles.unitNumberPill}>
                    <Text style={styles.unitNumberText}>UNIT {level.levelNumber}</Text>
                  </View>
                </View>

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

              {/* Precision Winding Map Canvas */}
              <View style={[styles.mapCanvas, { width: mapWidth, height: canvasHeight }]}>
                <Svg
                  width={mapWidth}
                  height={canvasHeight}
                  style={styles.svgTrailLayer}
                >
                  {/* Outer recessed road track */}
                  {allPoints.slice(0, -1).map((pt, segIdx) => {
                    const next = allPoints[segIdx + 1];
                    const dy = next.y - pt.y;
                    const cpOffset = dy * 0.56;
                    const d = `M ${pt.x} ${pt.y} C ${pt.x} ${pt.y + cpOffset}, ${next.x} ${next.y - cpOffset}, ${next.x} ${next.y}`;
                    return (
                      <Path
                        key={`casing-${segIdx}`}
                        d={d}
                        stroke="#1A172B"
                        strokeWidth={20}
                        strokeLinecap="round"
                        fill="none"
                      />
                    );
                  })}

                  {/* Active/completed trail highlight strokes */}
                  {allPoints.slice(0, -1).map((pt, segIdx) => {
                    const next = allPoints[segIdx + 1];
                    const dy = next.y - pt.y;
                    const cpOffset = dy * 0.56;
                    const d = `M ${pt.x} ${pt.y} C ${pt.x} ${pt.y + cpOffset}, ${next.x} ${next.y - cpOffset}, ${next.x} ${next.y}`;

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
                            : '#373254'
                        }
                        strokeWidth={isSegCompleted ? 5.5 : isSegActive ? 4.5 : 3.5}
                        strokeDasharray={isSegCompleted ? undefined : '8 8'}
                        strokeLinecap="round"
                        fill="none"
                      />
                    );
                  })}
                </Svg>

                {/* Aligned Map Station Rows (Circle Node + Bridge Stub + Horizontal Lesson Card) */}
                {nodePoints.map(({ cls, cx, cy, isLeft }) => {
                  globalLessonCounter++;
                  const isCompleted = completedClasses.includes(cls.id);
                  const isCurrent = cls.id === nextActiveClassId;

                  const emblemSource = getLessonNodeEmblem(cls.id);
                  const cardLeft = isLeft ? NODE_SIZE + CARD_GAP + 4 : 4;
                  const bridgeLeft = isLeft
                    ? cx + NODE_RADIUS - 2
                    : cardLeft + cardWidth - 2;
                  const bridgeColor = isCompleted
                    ? THEME.colors.accent
                    : isCurrent
                    ? THEME.colors.primary
                    : THEME.colors.border;

                  return (
                    <React.Fragment key={cls.id}>
                      {/* Horizontal Connector Stub linking Pin directly to Station Card */}
                      <View
                        pointerEvents="none"
                        style={[
                          styles.bridgeConnector,
                          {
                            left: bridgeLeft,
                            top: cy - 1,
                            width: CARD_GAP + 4,
                            backgroundColor: bridgeColor,
                          },
                        ]}
                      />

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

                      {/* Vertically Centered Frosted Lesson Station Card */}
                      <TouchableOpacity
                        activeOpacity={0.86}
                        onPress={() => setSelectedLesson(cls)}
                        style={[
                          styles.stationCard,
                          isCompleted && styles.stationCardCompleted,
                          isCurrent && styles.stationCardCurrent,
                          {
                            left: cardLeft,
                            top: cy - CARD_HEIGHT / 2,
                            width: cardWidth,
                            height: CARD_HEIGHT,
                          },
                        ]}
                      >
                        <View style={styles.stationCardLeftCol}>
                          <View style={styles.stationMetaRow}>
                            <Text style={styles.stationIndexText}>
                              LESSON {String(globalLessonCounter).padStart(2, '0')}
                            </Text>
                            {isCurrent ? (
                              <View style={styles.statusPillNext}>
                                <Text style={styles.statusPillTextLight}>NEXT UP</Text>
                              </View>
                            ) : isCompleted ? (
                              <View style={styles.statusPillDone}>
                                <Text style={styles.statusPillTextDone}>DONE</Text>
                              </View>
                            ) : (
                              <Text style={styles.stationDurationText}>{cls.duration}</Text>
                            )}
                          </View>

                          <Text style={styles.stationTitleText} numberOfLines={2}>
                            {formatShortLessonTitle(cls.title)}
                          </Text>
                        </View>

                        <View style={styles.stationActionChevron}>
                          <Ionicons
                            name="chevron-forward"
                            size={16}
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
                    </React.Fragment>
                  );
                })}

                {/* Unit Milestone Pedestal connected cleanly at center bottom */}
                <TouchableOpacity
                  style={[
                    styles.chestBtn,
                    {
                      left: trophyX - TROPHY_SIZE / 2,
                      top: trophyY - TROPHY_SIZE / 2,
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
                      left: trophyX - 82,
                      top: trophyY + TROPHY_SIZE / 2 + 8,
                      width: 164,
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
              style={[
                styles.modalCard,
                { width: Math.min(windowWidth - 32, 460), maxHeight: windowHeight * 0.86 },
              ]}
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
  mapBackdropImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.65,
  },
  mapBackdropScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  topStatsWrapper: {
    backgroundColor: 'rgba(18, 17, 27, 0.94)',
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
    paddingVertical: 10,
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
    marginRight: 4,
  },
  statPillStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    backgroundColor: THEME.colors.goldLight,
    paddingHorizontal: 9,
    borderRadius: 15,
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
    height: 30,
    backgroundColor: THEME.colors.secondaryLight,
    paddingHorizontal: 9,
    borderRadius: 15,
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
    height: 30,
    backgroundColor: THEME.colors.errorLight,
    paddingHorizontal: 9,
    borderRadius: 15,
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
    height: 30,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    paddingHorizontal: 9,
    borderRadius: 15,
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
    height: 30,
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: THEME.colors.primaryGlow,
  },
  headerAvatarWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  missNovaAvatar: {
    width: 20,
    height: 20,
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
    backgroundColor: 'rgba(24, 23, 36, 0.9)',
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
    marginBottom: 28,
  },
  unitBannerCard: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 178,
    borderWidth: 1.5,
    borderColor: 'rgba(127, 67, 254, 0.45)',
    marginBottom: 6,
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
  bridgeConnector: {
    position: 'absolute',
    height: 2,
    zIndex: 2,
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

  /* SIDE-ALIGNED STATION CARDS */
  stationCard: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24, 23, 36, 0.94)',
    borderRadius: 16,
    borderWidth: 1.25,
    borderColor: THEME.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    zIndex: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  stationCardCompleted: {
    borderColor: 'rgba(16, 185, 129, 0.45)',
    backgroundColor: 'rgba(18, 28, 30, 0.94)',
  },
  stationCardCurrent: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(34, 24, 58, 0.96)',
    shadowColor: '#7F43FE',
    shadowOpacity: 0.35,
  },
  stationCardLeftCol: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  stationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stationIndexText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textMuted,
    letterSpacing: 0.7,
  },
  statusPillNext: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillTextLight: {
    fontFamily: THEME.fonts.extraBold,
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  statusPillDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillTextDone: {
    fontFamily: THEME.fonts.bold,
    fontSize: 9,
    color: THEME.colors.accent,
    letterSpacing: 0.5,
  },
  stationDurationText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 10,
    color: THEME.colors.textSecondary,
  },
  stationTitleText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 13,
    color: THEME.colors.text,
    lineHeight: 18,
  },
  stationActionChevron: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* MILESTONE CHEST */
  chestBtn: {
    position: 'absolute',
    width: TROPHY_SIZE,
    height: TROPHY_SIZE,
    borderRadius: TROPHY_SIZE / 2,
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
    width: TROPHY_SIZE - 10,
    height: TROPHY_SIZE - 10,
    borderRadius: (TROPHY_SIZE - 10) / 2,
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
    paddingVertical: 5,
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
    height: 90,
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
