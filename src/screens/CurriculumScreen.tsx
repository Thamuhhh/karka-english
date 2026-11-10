import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { SUPERNOVA_LEVELS, SupernovaClass } from '../constants/curriculum';

interface CurriculumScreenProps {
  onStartLesson: (lesson: SupernovaClass) => void;
  completedClasses: string[];
}

export const CurriculumScreen: React.FC<CurriculumScreenProps> = ({
  onStartLesson,
  completedClasses,
}) => {
  const [selectedNode, setSelectedNode] = useState<SupernovaClass | null>(null);

  return (
    <View style={styles.container}>
      {/* Top Header Stats Bar */}
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
                  const isSelected = selectedNode?.id === cls.id;

                  // Snake path alignments: center, right, left, center
                  const alignStyles = [
                    styles.nodeCenter,
                    styles.nodeRight,
                    styles.nodeLeft,
                    styles.nodeCenter,
                  ][cIdx % 4];

                  return (
                    <View key={cls.id} style={[styles.nodeWrapper, alignStyles]}>
                      {/* Floating Tooltip Card over Selected/Current Node */}
                      {(isSelected || (isCurrent && !selectedNode)) && (
                        <View style={styles.nodeTooltipCard}>
                          <Text style={styles.tooltipTitle}>{cls.title}</Text>
                          <Text style={styles.tooltipSub} numberOfLines={1}>
                            {cls.subtitle}
                          </Text>

                          <TouchableOpacity
                            style={styles.startClassBtn}
                            onPress={() => {
                              setSelectedNode(null);
                              onStartLesson(cls);
                            }}
                          >
                            <Text style={styles.startClassBtnText}>
                              {isCompleted ? 'PRACTICE AGAIN (+50 XP)' : 'START LESSON (+100 XP)'}
                            </Text>
                            <Ionicons name="arrow-forward" size={14} color={THEME.colors.text} style={{ marginLeft: 6 }} />
                          </TouchableOpacity>

                          <View style={styles.tooltipPointer} />
                        </View>
                      )}

                      {/* Main Stepping Stone Circle */}
                      <TouchableOpacity
                        style={[
                          styles.roadmapNode,
                          isCompleted && styles.nodeCompleted,
                          isCurrent && styles.nodeCurrent,
                          isSelected && styles.nodeSelectedRing,
                        ]}
                        activeOpacity={0.8}
                        onPress={() => setSelectedNode(cls)}
                      >
                        <MaterialCommunityIcons
                          name={isCompleted ? 'check-bold' : isCurrent ? 'play' : 'lock'}
                          size={26}
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

                {/* Milestone Treasure Chest at End of Level */}
                <View style={styles.milestoneChestWrapper}>
                  <TouchableOpacity
                    style={styles.chestBtn}
                    onPress={() => {
                      onStartLesson(level.classes[0]);
                    }}
                  >
                    <Text style={{ fontSize: 32 }}>🎁</Text>
                  </TouchableOpacity>
                  <Text style={styles.chestLabel}>Level {level.levelNumber} Bonus Chest</Text>
                </View>
              </View>
            </View>
          );
        })}
        <View style={{ height: 60 }} />
      </ScrollView>
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
    marginBottom: 32,
    position: 'relative',
    width: 220,
  },
  nodeCenter: {
    alignSelf: 'center',
  },
  nodeRight: {
    alignSelf: 'flex-end',
    marginRight: 16,
  },
  nodeLeft: {
    alignSelf: 'flex-start',
    marginLeft: 16,
  },
  nodeTooltipCard: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    width: 200,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    shadowColor: THEME.colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
  },
  tooltipTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.colors.text,
    textAlign: 'center',
  },
  tooltipSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
  startClassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    width: '100%',
  },
  startClassBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.text,
    letterSpacing: 0.5,
  },
  tooltipPointer: {
    position: 'absolute',
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: THEME.colors.primary,
  },
  roadmapNode: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3.5,
    borderColor: THEME.colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  nodeCompleted: {
    backgroundColor: THEME.colors.success,
    borderColor: '#34D399',
  },
  nodeCurrent: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primaryGlow,
  },
  nodeSelectedRing: {
    borderColor: THEME.colors.gold,
    borderWidth: 4,
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
  milestoneChestWrapper: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  chestBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 2,
    borderColor: THEME.colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chestLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.gold,
    marginTop: 6,
  },
});
