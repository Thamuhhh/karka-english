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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../constants/theme';
import { SUPERNOVA_LEVELS, SupernovaClass, SupernovaLevel } from '../constants/curriculum';
import {
  SUPERNOVA_IMAGES,
  getLessonNodeEmblem,
  getUnitBanner,
} from '../constants/supernovaAssets';
import {
  ForestMapCanvas,
  TrailSegment,
  ForestDecorSeed,
} from '../components/ForestMapCanvas';

interface CurriculumScreenProps {
  onStartLesson: (lesson: SupernovaClass) => void;
  completedClasses: string[];
  onOpenLeague?: () => void;
}

const MAX_CONTENT_WIDTH = 480;
const NODE_SIZE = 56;
const NODE_RADIUS = NODE_SIZE / 2;
const ROW_STEP = 108;
const GATE_HEIGHT = 96;
const GATE_GAP = 72;
const SIGNPOST_MAX_WIDTH = 148;
const SIGNPOST_HEIGHT = 44;
const TROPHY_SIZE = 72;

// 4-step smooth forest zig-zag wave fraction (-1..+1)
const ZIGZAG_PHASE = [-0.9, -0.1, 0.9, 0.1];

const BIOME_NAMES: Record<number, string> = {
  1: 'Trailhead Grove',
  2: 'Mossy Glade',
  3: 'Canopy Vista',
  4: 'Emerald Summit',
};

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
  const mapWidth = Math.max(300, contentWidth);

  const [selectedLesson, setSelectedLesson] = useState<SupernovaClass | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const totalClassesCount = SUPERNOVA_LEVELS.reduce((acc, lvl) => acc + lvl.classes.length, 0);
  const completedCount = completedClasses.length;
  const overallPercent = Math.round((completedCount / Math.max(1, totalClassesCount)) * 100);
  const nextActiveClassId =
    SUPERNOVA_LEVELS.flatMap((lvl) => lvl.classes).find(
      (cls) => !completedClasses.includes(cls.id)
    )?.id || null;

  const midX = mapWidth / 2;
  const signpostWidth = Math.min(SIGNPOST_MAX_WIDTH, Math.floor(mapWidth * 0.41));
  const waveAmp = Math.min(92, Math.max(66, (mapWidth - 188) * 0.52));

  // Build ONE continuous end-to-end timeline across all 4 forest biomes & 22 lessons
  type GateNode = {
    type: 'gate';
    level: SupernovaLevel;
    topY: number;
    completedInLevel: number;
    progressPercent: number;
  };
  type LessonNode = {
    type: 'lesson';
    cls: SupernovaClass;
    level: SupernovaLevel;
    globalNum: number;
    cx: number;
    cy: number;
  };

  const gateNodes: GateNode[] = [];
  const lessonNodes: LessonNode[] = [];
  const segments: TrailSegment[] = [];
  const decorSeeds: ForestDecorSeed[] = [];
  const unitYMap: Record<number, number> = {};

  let cursorY = 18;
  let globalLessonCounter = 0;
  let prevAnchor: { x: number; y: number } | null = null;
  let prevUnitLastDone = false;
  let activeLessonY: number | null = null;

  for (let lvlIdx = 0; lvlIdx < SUPERNOVA_LEVELS.length; lvlIdx++) {
    const level = SUPERNOVA_LEVELS[lvlIdx];
    const completedInLevel = level.classes.filter((c) =>
      completedClasses.includes(c.id)
    ).length;
    const progressPercent = Math.round((completedInLevel / level.classes.length) * 100);

    const gateTopY = cursorY;
    const gateBotY = gateTopY + GATE_HEIGHT;
    unitYMap[level.levelNumber] = Math.max(0, gateTopY - 8);

    gateNodes.push({
      type: 'gate',
      level,
      topY: gateTopY,
      completedInLevel,
      progressPercent,
    });

    if (prevAnchor) {
      segments.push({
        fromX: prevAnchor.x,
        fromY: prevAnchor.y,
        toX: midX,
        toY: gateTopY,
        status: prevUnitLastDone ? 'completed' : 'upcoming',
      });
      decorSeeds.push({
        y: (prevAnchor.y + gateTopY) / 2,
        avoidX: prevAnchor.x,
        variant: globalLessonCounter + lvlIdx,
        allowTallTree: false,
      });
    }

    prevAnchor = { x: midX, y: gateBotY };
    cursorY = gateBotY + GATE_GAP;

    for (let cIdx = 0; cIdx < level.classes.length; cIdx++) {
      const cls = level.classes[cIdx];
      globalLessonCounter++;
      const phaseIdx = ((lvlIdx % 2 === 0 ? cIdx : cIdx + 2)) % ZIGZAG_PHASE.length;
      const cx = midX + ZIGZAG_PHASE[phaseIdx] * waveAmp;
      const cy = cursorY;

      if (cls.id === nextActiveClassId) {
        activeLessonY = cy;
      }

      const isCompleted = completedClasses.includes(cls.id);
      const isCurrent = cls.id === nextActiveClassId;

      if (prevAnchor) {
        let status: TrailSegment['status'] = 'upcoming';
        if (cIdx === 0) {
          status = isCompleted ? 'completed' : isCurrent ? 'active' : 'upcoming';
        } else {
          const prevClass = level.classes[cIdx - 1];
          const prevDone = completedClasses.includes(prevClass.id);
          if (prevDone && isCompleted) {
            status = 'completed';
          } else if (prevDone && isCurrent) {
            status = 'active';
          } else if (prevDone) {
            status = 'completed';
          } else if (prevClass.id === nextActiveClassId) {
            status = 'active';
          }
        }

        segments.push({
          fromX: prevAnchor.x,
          fromY: prevAnchor.y,
          toX: cx,
          toY: cy,
          status,
        });

        decorSeeds.push({
          y: (prevAnchor.y + cy) / 2,
          avoidX: (prevAnchor.x + cx) / 2,
          variant: globalLessonCounter,
          allowTallTree: cIdx > 0,
        });
      }

      lessonNodes.push({
        type: 'lesson',
        cls,
        level,
        globalNum: globalLessonCounter,
        cx,
        cy,
      });

      prevAnchor = { x: cx, y: cy };
      prevUnitLastDone = isCompleted;
      cursorY += ROW_STEP;
    }

    // Trim trailing step cleanly before next Gate or Summit Trophy
    cursorY -= ROW_STEP - GATE_GAP;
  }

  const trophyX = midX;
  const trophyY = cursorY + 34;
  if (prevAnchor) {
    segments.push({
      fromX: prevAnchor.x,
      fromY: prevAnchor.y,
      toX: trophyX,
      toY: trophyY,
      status: prevUnitLastDone ? 'completed' : 'upcoming',
    });
    decorSeeds.push({
      y: (prevAnchor.y + trophyY) / 2,
      avoidX: prevAnchor.x,
      variant: 99,
      allowTallTree: false,
    });
  }

  const totalCanvasHeight = trophyY + TROPHY_SIZE / 2 + 86;

  const scrollToUnit = (levelNumber: number) => {
    const y = unitYMap[levelNumber];
    if (typeof y === 'number' && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y, animated: true });
    }
  };

  const scrollToActiveLesson = () => {
    if (typeof activeLessonY === 'number' && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: Math.max(0, activeLessonY - 200), animated: true });
    }
  };

  return (
    <View style={styles.container}>
      {/* Forest Emerald Top HUD */}
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

        {/* Sticky Slim Forest Biome Quick-Jump Strip */}
        <View style={[styles.biomeStripBar, { maxWidth: MAX_CONTENT_WIDTH }]}>
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

          <TouchableOpacity
            style={styles.jumpActiveBtn}
            onPress={scrollToActiveLesson}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="compass-rose" size={13} color={THEME.colors.gold} />
            <Text style={styles.jumpActiveText}>{overallPercent}%</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Seamless End-to-End Forest Zig-Zag Trail */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.roadmapScroll}
        contentContainerStyle={[
          styles.roadmapContent,
          { width: contentWidth, alignSelf: 'center' },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: mapWidth, height: totalCanvasHeight, position: 'relative' }}>
          {/* Full-Height Vector Forest Terrain, Pines, Boulders, Fireflies & Cobblestone Path */}
          <ForestMapCanvas
            width={mapWidth}
            height={totalCanvasHeight}
            segments={segments}
            decorSeeds={decorSeeds}
          />

          {/* Biome Portal Gates woven directly ON the continuous path */}
          {gateNodes.map((gate) => {
            const { level, topY, completedInLevel, progressPercent } = gate;
            const gateWidth = mapWidth - 28;
            return (
              <View
                key={`gate-${level.levelNumber}`}
                style={[
                  styles.gateBannerCard,
                  {
                    left: 14,
                    top: topY,
                    width: gateWidth,
                    height: GATE_HEIGHT,
                  },
                ]}
              >
                <Image
                  source={getUnitBanner(level.levelNumber)}
                  style={styles.gateBannerBg}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['rgba(9, 22, 18, 0.35)', 'rgba(9, 22, 18, 0.84)', 'rgba(8, 18, 14, 0.96)']}
                  locations={[0, 0.55, 1]}
                  style={StyleSheet.absoluteFillObject}
                />

                {/* Top Badge Row */}
                <View style={styles.gateTopRow}>
                  <View style={styles.gateBiomeTag}>
                    <MaterialCommunityIcons name="pine-tree" size={12} color={THEME.colors.accent} />
                    <Text style={styles.gateBiomeText}>
                      {BIOME_NAMES[level.levelNumber] || `Biome ${level.levelNumber}`}
                    </Text>
                  </View>
                  <View style={[styles.cefrBadge, { backgroundColor: level.accentColor }]}>
                    <Text style={styles.cefrBadgeText}>{level.cefrTag}</Text>
                  </View>
                </View>

                {/* Bottom Title & Progress */}
                <View style={styles.gateFooter}>
                  <Text style={styles.gateTitle} numberOfLines={1}>
                    {level.levelName}
                  </Text>
                  <View style={styles.gateProgressRow}>
                    <View style={styles.gateProgressTrack}>
                      <View
                        style={[
                          styles.gateProgressFill,
                          { width: `${Math.max(8, progressPercent)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.gateProgressText}>
                      {completedInLevel}/{level.classes.length}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}

          {/* 22 Zig-Zag Stepping Stones & Wooden Trail Signposts */}
          {lessonNodes.map((node) => {
            const { cls, cx, cy, globalNum } = node;
            const isCompleted = completedClasses.includes(cls.id);
            const isCurrent = cls.id === nextActiveClassId;
            const emblemSource = getLessonNodeEmblem(cls.id);

            const tagOnRight = cx <= midX;
            const tagLeft = tagOnRight
              ? cx + NODE_RADIUS + 8
              : Math.max(8, cx - NODE_RADIUS - 8 - signpostWidth);

            return (
              <React.Fragment key={cls.id}>
                {/* Subtle branch stem from stone rim to wooden signpost */}
                <View
                  pointerEvents="none"
                  style={[
                    styles.signpostStem,
                    {
                      left: tagOnRight ? cx + NODE_RADIUS - 1 : cx - NODE_RADIUS - 9,
                      top: cy - 1,
                      backgroundColor: isCompleted
                        ? THEME.colors.accent
                        : isCurrent
                        ? THEME.colors.gold
                        : '#29493B',
                    },
                  ]}
                />

                {/* Active Lantern Beacon Pill above active node */}
                {isCurrent && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.activeBeaconWrap,
                      {
                        left: cx - 34,
                        top: cy - NODE_RADIUS - 25,
                      },
                    ]}
                  >
                    <View style={styles.activeBeaconPill}>
                      <Text style={styles.activeBeaconText}>NEXT UP</Text>
                    </View>
                  </View>
                )}

                {/* Tactile 3D Stepping Stone Medallion */}
                <TouchableOpacity
                  style={[
                    styles.stoneBtn,
                    {
                      left: cx - NODE_RADIUS,
                      top: cy - NODE_RADIUS,
                    },
                    isCompleted && styles.stoneCompleted,
                    isCurrent && styles.stoneCurrent,
                    !isCompleted && !isCurrent && styles.stoneLocked,
                  ]}
                  activeOpacity={0.85}
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
                      <MaterialCommunityIcons name="check-bold" size={11} color="#FFFFFF" />
                    </View>
                  )}
                  {!isCompleted && !isCurrent && (
                    <View style={styles.lockedBadgeSeal}>
                      <Ionicons name="lock-closed" size={10} color="#9BB5A8" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Compact Forest Signpost Pill strictly beside node */}
                <TouchableOpacity
                  activeOpacity={0.86}
                  onPress={() => setSelectedLesson(cls)}
                  style={[
                    styles.signpostCard,
                    isCompleted && styles.signpostCompleted,
                    isCurrent && styles.signpostCurrent,
                    {
                      left: tagLeft,
                      top: cy - SIGNPOST_HEIGHT / 2,
                      width: signpostWidth,
                      height: SIGNPOST_HEIGHT,
                    },
                  ]}
                >
                  <View style={styles.signpostMetaRow}>
                    <Text
                      style={[
                        styles.signpostNum,
                        isCompleted && { color: THEME.colors.accent },
                        isCurrent && { color: THEME.colors.gold },
                      ]}
                    >
                      {String(globalNum).padStart(2, '0')}
                    </Text>
                    <Text style={styles.signpostDuration}>{cls.duration}</Text>
                  </View>
                  <Text style={styles.signpostTitle} numberOfLines={1}>
                    {formatShortLessonTitle(cls.title)}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            );
          })}

          {/* Grand Emerald Summit Trophy Crest at Trail Finish */}
          <TouchableOpacity
            style={[
              styles.summitTrophyBtn,
              {
                left: trophyX - TROPHY_SIZE / 2,
                top: trophyY - TROPHY_SIZE / 2,
              },
            ]}
            activeOpacity={0.85}
            onPress={() => {
              const lastUnit = SUPERNOVA_LEVELS[SUPERNOVA_LEVELS.length - 1];
              setSelectedLesson(lastUnit.classes[lastUnit.classes.length - 1]);
            }}
          >
            <View style={styles.summitTrophyClip}>
              <Image
                source={SUPERNOVA_IMAGES.trophyNova}
                style={styles.summitTrophyImg}
                resizeMode="cover"
              />
            </View>
          </TouchableOpacity>

          <View
            style={[
              styles.summitLabelPill,
              {
                left: trophyX - 88,
                top: trophyY + TROPHY_SIZE / 2 + 8,
                width: 176,
              },
            ]}
          >
            <Text style={styles.summitLabelText}>GRAND FLUENCY SUMMIT</Text>
          </View>
        </View>
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
              colors={['#132920', '#0B1612']}
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
                  colors={['rgba(11, 22, 18, 0.25)', 'rgba(11, 22, 18, 0.96)']}
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
                      colors={THEME.gradients.accent}
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
    backgroundColor: '#091612',
    overflow: 'hidden',
  },
  topStatsWrapper: {
    backgroundColor: '#091612',
    borderBottomWidth: 1,
    borderBottomColor: '#1B3A2C',
    alignItems: 'center',
  },
  topStatsBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
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
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    paddingHorizontal: 7,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.45)',
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
    color: THEME.colors.accent,
    marginLeft: 4,
  },

  /* STICKY BIOME JUMP BAR */
  biomeStripBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  unitJumpRow: {
    gap: 6,
  },
  unitJumpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11261D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#214535',
    gap: 5,
  },
  jumpDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  unitJumpText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 10.5,
    color: THEME.colors.text,
  },
  unitJumpMeta: {
    fontFamily: THEME.fonts.bold,
    fontSize: 9.5,
    color: '#8BB39F',
  },
  jumpActiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    gap: 4,
  },
  jumpActiveText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.gold,
  },

  roadmapScroll: {
    flex: 1,
  },
  roadmapContent: {
    paddingBottom: 20,
  },

  /* BIOME PORTAL GATES */
  gateBannerCard: {
    position: 'absolute',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#23533E',
    backgroundColor: '#0D2018',
    justifyContent: 'space-between',
    padding: 10,
    zIndex: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 7,
  },
  gateBannerBg: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
  },
  gateTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gateBiomeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(9, 22, 18, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    gap: 4,
  },
  gateBiomeText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 9.5,
    color: '#6EE7B7',
    letterSpacing: 0.4,
  },
  cefrBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 7,
  },
  cefrBadgeText: {
    fontFamily: THEME.fonts.extraBold,
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  gateFooter: {
    gap: 5,
  },
  gateTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  gateProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gateProgressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    overflow: 'hidden',
  },
  gateProgressFill: {
    height: '100%',
    borderRadius: 2.5,
    backgroundColor: THEME.colors.accent,
  },
  gateProgressText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.accent,
  },

  /* STEPPING STONE NODES & SIGNPOSTS */
  signpostStem: {
    position: 'absolute',
    width: 10,
    height: 2,
    zIndex: 2,
  },
  activeBeaconWrap: {
    position: 'absolute',
    width: 68,
    alignItems: 'center',
    zIndex: 10,
  },
  activeBeaconPill: {
    backgroundColor: THEME.colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius: 6,
    elevation: 6,
  },
  activeBeaconText: {
    fontFamily: THEME.fonts.extraBold,
    fontSize: 8.5,
    color: '#091612',
    letterSpacing: 0.6,
  },
  stoneBtn: {
    position: 'absolute',
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_RADIUS,
    backgroundColor: '#132820',
    borderBottomWidth: 4,
    borderBottomColor: '#07100C',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  stoneCompleted: {
    borderColor: THEME.colors.accent,
    borderWidth: 2.5,
    borderBottomColor: '#059669',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  stoneCurrent: {
    borderColor: THEME.colors.gold,
    borderWidth: 3,
    borderBottomColor: '#D97706',
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  stoneLocked: {
    borderColor: '#2A4A3C',
    borderWidth: 2,
    borderBottomColor: '#0C1B15',
  },
  nodeImageClip: {
    width: NODE_SIZE - 6,
    height: NODE_SIZE - 6,
    borderRadius: (NODE_SIZE - 6) / 2,
    overflow: 'hidden',
    backgroundColor: '#181724',
  },
  nodeArtworkImage: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.04 }],
  },
  completedBadgeCheck: {
    position: 'absolute',
    right: -2,
    bottom: 0,
    width: 19,
    height: 19,
    borderRadius: 9.5,
    backgroundColor: THEME.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#091612',
  },
  lockedBadgeSeal: {
    position: 'absolute',
    right: -2,
    bottom: 0,
    width: 19,
    height: 19,
    borderRadius: 9.5,
    backgroundColor: '#183026',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2B5140',
  },
  signpostCard: {
    position: 'absolute',
    backgroundColor: 'rgba(13, 30, 23, 0.92)',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#234536',
    paddingHorizontal: 10,
    paddingVertical: 5,
    justifyContent: 'center',
    zIndex: 4,
  },
  signpostCompleted: {
    borderColor: 'rgba(16, 185, 129, 0.45)',
    backgroundColor: 'rgba(14, 34, 26, 0.95)',
  },
  signpostCurrent: {
    borderColor: 'rgba(251, 191, 36, 0.65)',
    backgroundColor: 'rgba(26, 36, 22, 0.96)',
  },
  signpostMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 1,
  },
  signpostNum: {
    fontFamily: THEME.fonts.bold,
    fontSize: 9,
    color: '#7EA593',
    letterSpacing: 0.5,
  },
  signpostDuration: {
    fontFamily: THEME.fonts.medium,
    fontSize: 9,
    color: '#7EA593',
  },
  signpostTitle: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11.5,
    color: '#FFFFFF',
  },

  /* GRAND SUMMIT TROPHY */
  summitTrophyBtn: {
    position: 'absolute',
    width: TROPHY_SIZE,
    height: TROPHY_SIZE,
    borderRadius: TROPHY_SIZE / 2,
    backgroundColor: '#13261E',
    borderWidth: 2.5,
    borderColor: THEME.colors.gold,
    borderBottomWidth: 4,
    borderBottomColor: THEME.colors.goldBorder,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 5,
  },
  summitTrophyClip: {
    width: TROPHY_SIZE - 8,
    height: TROPHY_SIZE - 8,
    borderRadius: (TROPHY_SIZE - 8) / 2,
    overflow: 'hidden',
    backgroundColor: '#181724',
  },
  summitTrophyImg: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.04 }],
  },
  summitLabelPill: {
    position: 'absolute',
    backgroundColor: 'rgba(251, 191, 36, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.45)',
    paddingVertical: 5,
    borderRadius: 10,
    alignItems: 'center',
  },
  summitLabelText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 9.5,
    color: THEME.colors.gold,
    letterSpacing: 0.8,
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
    borderColor: 'rgba(16, 185, 129, 0.45)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeroWrap: {
    height: 90,
    width: '100%',
    justifyContent: 'flex-start',
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
    backgroundColor: THEME.colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 8,
  },
  modalLevelText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: '#091612',
    letterSpacing: 0.5,
  },
  modalDurationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(9, 22, 18, 0.78)',
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
    backgroundColor: 'rgba(9, 22, 18, 0.78)',
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
    borderColor: THEME.colors.accent,
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
    color: '#A7C4B5',
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
    borderColor: '#1E3C2F',
  },
  methodologyTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: '#8BB39F',
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
    color: '#CDE0D6',
    textAlign: 'center',
  },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: THEME.radius.md,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E3C2F',
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
    borderBottomColor: THEME.colors.accentBorder,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
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
