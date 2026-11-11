import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { THEME } from '../constants/theme';
import { SUPERNOVA_LEVELS, SupernovaClass } from '../constants/curriculum';
import { UserStats } from '../types';
import {
  SUPERNOVA_IMAGES,
} from '../constants/supernovaAssets';
import { LiveStreakBadge } from '../components/LiveStreakBadge';
import { KarkaWordmark } from '../components/KarkaBrand';
import { LessonEmblemView } from '../components/LessonEmblemView';

interface CurriculumScreenProps {
  onStartLesson: (lesson: SupernovaClass) => void;
  stats: UserStats;
  userRank: number;
  onRefillHearts: () => void;
  onOpenLeague?: () => void;
  onTopColorChange?: (color: string) => void;
}

const MAX_CONTENT_WIDTH = 480;
const UNIT_TOP_COLORS = ['#1E1438', '#131E36', '#1D1A36', '#261640'] as const;
const MAP_STEP_Y = 138;
const MAP_TOP_CY = 62;
const NODE_LABEL_WIDTH = 152;
const NODE_DIAMETER = 66;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

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

function formatShortLessonTitle(fullTitle: string): string {
  return fullTitle.replace(/^Class\s+\d+:\s*/i, '').trim();
}

function formatShortUnitTitle(fullName: string): string {
  return fullName.replace(/^Unit\s+\d+:\s*/i, '').trim();
}

export const CurriculumScreen: React.FC<CurriculumScreenProps> = ({
  onStartLesson,
  stats,
  onTopColorChange,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const [selectedLesson, setSelectedLesson] = useState<SupernovaClass | null>(null);
  const [activeUnitIdx, setActiveUnitIdx] = useState(0);
  const activeUnitIdxRef = useRef(0);
  const unitStartYRef = useRef<number[]>([]);
  const unitSwapAnim = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const showScrollTopRef = useRef(false);
  const scrollTopAnim = useRef(new Animated.Value(0)).current;

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

  const nextActiveClassId =
    SUPERNOVA_LEVELS.flatMap((lvl) => lvl.classes).find(
      (cls) => !completedClasses.includes(cls.id)
    )?.id || null;

  const activeLevel = SUPERNOVA_LEVELS[activeUnitIdx] || SUPERNOVA_LEVELS[0];
  const activeUnitTopColor = UNIT_TOP_COLORS[activeUnitIdx % UNIT_TOP_COLORS.length];

  useEffect(() => {
    onTopColorChange?.(activeUnitTopColor);
  }, [activeUnitTopColor, onTopColorChange]);
  const activeCompletedCount = activeLevel.classes.filter((c) =>
    completedClasses.includes(c.id)
  ).length;
  const activeProgressPct = Math.round(
    (activeCompletedCount / activeLevel.classes.length) * 100
  );
  const isActiveUnitDone = activeCompletedCount === activeLevel.classes.length;

  const handleMapScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    let nextIdx = 0;
    for (let i = SUPERNOVA_LEVELS.length - 1; i >= 1; i--) {
      const unitY = unitStartYRef.current[i];
      if (typeof unitY === 'number' && scrollY >= unitY - 24) {
        nextIdx = i;
        break;
      }
    }
    if (nextIdx !== activeUnitIdxRef.current) {
      activeUnitIdxRef.current = nextIdx;
      setActiveUnitIdx(nextIdx);
      unitSwapAnim.setValue(0.35);
      Animated.timing(unitSwapAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
    }

    const shouldShowTop = scrollY > 240;
    if (shouldShowTop !== showScrollTopRef.current) {
      showScrollTopRef.current = shouldShowTop;
      setShowScrollTop(shouldShowTop);
      Animated.timing(scrollTopAnim, {
        toValue: shouldShowTop ? 1 : 0,
        duration: 180,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
    }
  };

  const handleScrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Precompute global sequential lesson number for each class ID
  const lessonNumberMap: Record<string, number> = {};
  let runningNum = 0;
  for (const lvl of SUPERNOVA_LEVELS) {
    for (const cls of lvl.classes) {
      runningNum++;
      lessonNumberMap[cls.id] = runningNum;
    }
  }

  const renderUnitBandContent = (
    levelNum: number,
    levelName: string,
    totalClasses: number,
    completedCount: number,
    progressPct: number,
    isDone: boolean,
    isInline: boolean
  ) => (
    <>
      <View style={styles.unitEditorialMetaRow}>
        <View style={styles.unitEyebrowGroup}>
          <View style={[styles.unitDot, isDone && styles.unitDotCompleted]} />
          <Text style={styles.unitEyebrowText}>
            UNIT {String(levelNum).padStart(2, '0')} · {progressPct}%
          </Text>
        </View>
        <Text style={styles.unitProgressStatText}>
          {completedCount}/{totalClasses}
        </Text>
      </View>

      <Text
        style={isInline ? styles.unitInlineTitle : styles.unitEditorialTitle}
        numberOfLines={1}
      >
        {formatShortUnitTitle(levelName)}
      </Text>

      <View style={styles.unitHairlineTrack}>
        {progressPct > 0 && (
          <LinearGradient
            colors={['#7F43FE', '#A78BFA']}
            style={[styles.unitHairlineFill, { width: `${progressPct}%` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        )}
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      {/* Single Solid Unified Header: Brand + Live Streak + Sticky Active Unit */}
      <LinearGradient
        colors={[activeUnitTopColor, THEME.colors.background]}
        style={styles.unifiedTopBar}
      >
        <View style={styles.unifiedTopBarInner}>
          <View style={styles.brandRow}>
            <View style={styles.brandLogoWrap}>
              <KarkaWordmark width={74} height={22} />
            </View>
            <LiveStreakBadge streakDays={stats.streakDays} />
          </View>

          <Animated.View
            style={[
              styles.activeUnitBand,
              {
                opacity: unitSwapAnim,
                transform: [
                  {
                    translateY: unitSwapAnim.interpolate({
                      inputRange: [0.35, 1],
                      outputRange: [5, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {renderUnitBandContent(
              activeLevel.levelNumber,
              activeLevel.levelName,
              activeLevel.classes.length,
              activeCompletedCount,
              activeProgressPct,
              isActiveUnitDone,
              false
            )}
          </Animated.View>
        </View>
      </LinearGradient>

      {/* Single Unified Obsidian Topography Canvas */}
      <View style={styles.mapStage}>
        <Image
          source={SUPERNOVA_IMAGES.mapTopographyBg}
          style={styles.screenBgTexture}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(14,14,20,0.88)', 'rgba(14,14,20,0.62)', 'rgba(14,14,20,0.9)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        {/* Continuous Open Obsidian Course Map (Zero Opaque Cutout Blocks) */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.courseScroll}
          contentContainerStyle={styles.courseContent}
          onScroll={handleMapScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
        {SUPERNOVA_LEVELS.map((level, levelIdx) => {
          const completedInLevel = level.classes.filter((c) =>
            completedClasses.includes(c.id)
          ).length;
          const progressPercent = Math.round(
            (completedInLevel / level.classes.length) * 100
          );
          const lastClass = level.classes[level.classes.length - 1];
          const isUnitCompleted = completedInLevel === level.classes.length;

          return (
            <View
              key={level.levelNumber}
              onLayout={(event) => {
                unitStartYRef.current[levelIdx] = event.nativeEvent.layout.y;
              }}
              style={[
                styles.unitMapSection,
                levelIdx === 0 && styles.firstUnitMapSection,
              ]}
            >
              {levelIdx > 0 && (
                <View style={styles.inlineUnitBreak}>
                  {renderUnitBandContent(
                    level.levelNumber,
                    level.levelName,
                    level.classes.length,
                    completedInLevel,
                    progressPercent,
                    isUnitCompleted,
                    true
                  )}
                </View>
              )}

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
                          <LessonEmblemView
                            classId={cls.id}
                            dimmed={!isCompleted && !isCurrent}
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
            </View>
          );
        })}

        <View style={{ height: 28 }} />
        </ScrollView>

        {/* Soft Feather Lip under Unified Header */}
        <LinearGradient
          colors={['rgba(14,14,20,0.78)', 'rgba(14,14,20,0)']}
          style={styles.topFeatherEdge}
          pointerEvents="none"
        />

        {/* Circular Scroll-To-Top Button (Bottom-Right) */}
        <Animated.View
          pointerEvents={showScrollTop ? 'auto' : 'none'}
          style={[
            styles.scrollTopWrap,
            {
              right: Math.max(26, (windowWidth - MAX_CONTENT_WIDTH) / 2 + 26),
              opacity: scrollTopAnim,
              transform: [
                {
                  scale: scrollTopAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.scrollTopBtn}
            onPress={handleScrollToTop}
            activeOpacity={0.85}
            accessibilityLabel="Scroll to top"
          >
            <Ionicons name="arrow-up" size={19} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Ultra-Minimal Quick Popover Lesson Card */}
      <Modal
        visible={!!selectedLesson}
        transparent
        statusBarTranslucent
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
                styles.popoverCard,
                { width: Math.min(windowWidth - 44, 320) },
              ]}
            >
              <View style={styles.popoverMetaRow}>
                <View style={styles.popoverMetaLeft}>
                  <Text style={styles.popoverEyebrow}>
                    CLASS {String(lessonNumberMap[selectedLesson.id] || selectedLesson.classNumber).padStart(2, '0')} ·{' '}
                    {selectedLesson.duration.toUpperCase()}
                  </Text>
                  <Text style={styles.popoverXp}>+{selectedXpReward} XP</Text>
                </View>
                <TouchableOpacity
                  style={styles.popoverCloseBtn}
                  onPress={() => setSelectedLesson(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="close" size={15} color="#C9C5DE" />
                </TouchableOpacity>
              </View>

              <Text style={styles.popoverTitle}>
                {formatShortLessonTitle(selectedLesson.title)}
              </Text>
              <Text style={styles.popoverSubtitle} numberOfLines={2}>
                {selectedLesson.subtitle}
              </Text>

              <TouchableOpacity
                style={styles.popoverStartBtn}
                activeOpacity={0.86}
                onPress={() => {
                  const lesson = selectedLesson;
                  setSelectedLesson(null);
                  onStartLesson(lesson);
                }}
              >
                <Text style={styles.popoverStartText}>
                  {isSelectedCompleted ? 'PRACTICE AGAIN' : 'START LESSON'}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#141320" />
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
  unifiedTopBar: {
    width: '100%',
    zIndex: 10,
  },
  unifiedTopBarInner: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingTop: 18,
    paddingBottom: 12,
    paddingHorizontal: 22,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },
  brandLogoWrap: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    justifyContent: 'center',
  },
  activeUnitBand: {
    width: '100%',
  },

  /* COURSE TIMELINE */
  mapStage: {
    flex: 1,
    position: 'relative',
    backgroundColor: THEME.colors.background,
    overflow: 'hidden',
  },
  topFeatherEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 14,
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
  unitMapSection: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
  },
  firstUnitMapSection: {
    paddingTop: 6,
  },
  inlineUnitBreak: {
    marginBottom: 8,
  },
  unitInlineTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 18.5,
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 8,
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

  /* QUICK POPOVER MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(6, 6, 10, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  popoverCard: {
    backgroundColor: '#1B1633',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(127, 67, 254, 0.58)',
    shadowColor: '#7F43FE',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 14,
  },
  popoverMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  popoverMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  popoverEyebrow: {
    fontFamily: THEME.fonts.extraBold,
    fontSize: 10.5,
    color: '#C4B5FD',
    letterSpacing: 0.8,
  },
  popoverXp: {
    fontFamily: THEME.fonts.extraBold,
    fontSize: 11,
    color: THEME.colors.goldGlow,
  },
  popoverCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popoverTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 17.5,
    color: '#FFFFFF',
    lineHeight: 23,
  },
  popoverSubtitle: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: '#C9C5DE',
    lineHeight: 17,
    marginTop: 5,
  },
  popoverStartBtn: {
    marginTop: 16,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  popoverStartText: {
    fontFamily: THEME.fonts.extraBold,
    fontSize: 13,
    color: '#141320',
    letterSpacing: 0.5,
  },
  scrollTopWrap: {
    position: 'absolute',
    bottom: 28,
    zIndex: 12,
  },
  scrollTopBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1B1633',
    borderWidth: 1.5,
    borderColor: 'rgba(167, 139, 250, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7F43FE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});
