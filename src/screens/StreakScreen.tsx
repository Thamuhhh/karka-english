import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { UserStats } from '../types';
import { ElvateWordmark } from '../components/ElvateBrand';
import {
  getStreakWeekActivity,
  hasSecuredStreakToday,
} from '../services/storageService';

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface StreakScreenProps {
  stats: UserStats;
  onClose: () => void;
}

export const StreakScreen: React.FC<StreakScreenProps> = ({ stats, onClose }) => {
  const flamePulse = useRef(new Animated.Value(0)).current;
  const goal = Math.max(1, stats.dailyGoalXp);
  const progress = Math.min(1, stats.todayXp / goal);
  const secured = hasSecuredStreakToday(stats);
  const activeDays = getStreakWeekActivity(stats);
  const todayIndex = (new Date().getDay() + 6) % 7;
  const nextMilestone = (Math.floor(stats.streakDays / 7) + 1) * 7;
  const isMilestoneDay = secured && stats.streakDays > 0 && stats.streakDays % 7 === 0;
  const flameGlowOpacity = flamePulse.interpolate({ inputRange: [0, 1], outputRange: [0.48, 0.95] });
  const flameGlowScale = flamePulse.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.12] });
  const flameScale = flamePulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.045] });

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(flamePulse, {
          toValue: 1,
          duration: 720,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(flamePulse, {
          toValue: 0,
          duration: 860,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [flamePulse]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar style="light" backgroundColor="#0E0D14" translucent animated />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back to course"
          >
            <Ionicons name="chevron-back" size={21} color="#F6F2FF" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>YOUR STREAK</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.hero}>
          <View style={styles.flameStage}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.flameGlow,
                { opacity: flameGlowOpacity, transform: [{ scale: flameGlowScale }] },
              ]}
            >
              <LinearGradient
                colors={['rgba(167,139,250,0.38)', 'rgba(127,67,254,0.16)', 'rgba(127,67,254,0)']}
                style={styles.flameGlowFill}
              />
            </Animated.View>
            <Animated.View style={{ transform: [{ scale: flameScale }] }}>
              <LinearGradient
                colors={['rgba(196,181,253,0.22)', 'rgba(127,67,254,0.09)']}
                style={styles.flameHalo}
              >
                <MaterialCommunityIcons name="fire" size={76} color="#C4B5FD" />
              </LinearGradient>
            </Animated.View>
            <View style={[styles.ember, styles.emberLeft]} />
            <View style={[styles.ember, styles.emberRight]} />
          </View>
          <Text style={styles.streakNumber}>{stats.streakDays}</Text>
          <Text style={styles.streakUnit}>
            {stats.streakDays === 1 ? 'DAY STREAK' : 'DAYS IN A ROW'}
          </Text>
          <Text style={styles.heroNote}>
            {secured
              ? 'Today is in the books. Keep the rhythm going tomorrow.'
              : stats.streakDays > 0
                ? 'A little practice today keeps your streak alive.'
                : 'Reach your daily XP goal to start your streak.'}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>THIS WEEK</Text>
            <Text style={styles.weekCount}>{activeDays.filter(Boolean).length}/7</Text>
          </View>
          <View style={styles.weekRow}>
            {WEEK_DAYS.map((day, index) => (
              <View key={`${day}-${index}`} style={styles.weekDay}>
                <View
                  style={[
                    styles.dayRing,
                    index === todayIndex && styles.dayRingToday,
                    activeDays[index] && styles.dayRingActive,
                  ]}
                >
                  {activeDays[index] ? (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  ) : index === todayIndex ? (
                    <View style={styles.todayDot} />
                  ) : (
                    <View style={styles.idleDot} />
                  )}
                </View>
                <Text style={[styles.dayLabel, index === todayIndex && styles.dayLabelToday]}>
                  {day}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>TODAY'S GOAL</Text>
            <Text style={styles.xpCount}>
              {stats.todayXp}<Text style={styles.xpTarget}> / {goal} XP</Text>
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={secured ? ['#D9CCFF', '#8B5CF6'] : ['#C3A4FF', '#8352F5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
          <Text style={styles.goalMessage}>
            {secured
              ? isMilestoneDay
                ? `${stats.streakDays}-day milestone reached · 30 Gems earned`
                : 'Streak secured for today'
              : `${Math.max(0, goal - stats.todayXp)} XP left to secure today`}
          </Text>
        </View>

        <View style={styles.milestoneRow}>
          <View style={styles.milestoneIcon}>
            <Ionicons name="diamond" size={16} color={THEME.colors.primaryGlow} />
          </View>
          <View style={styles.milestoneCopy}>
            <Text style={styles.milestoneTitle}>NEXT MILESTONE</Text>
            <Text style={styles.milestoneSubtitle}>{nextMilestone} days · earn 30 Gems</Text>
          </View>
          <Text style={styles.milestoneRemaining}>
            {Math.max(0, nextMilestone - stats.streakDays)} to go
          </Text>
        </View>

        <Text style={styles.ruleNote}>Your streak counts when you complete your daily XP goal.</Text>
      </ScrollView>
      <View style={styles.footerBrand}>
        <ElvateWordmark width={84} height={24} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0E0D14' },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 24 },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
  topTitle: {
    fontFamily: THEME.fonts.bold,
    color: '#AAA1BA',
    fontSize: 10,
    letterSpacing: 1.6,
  },
  topBarSpacer: { width: 38 },
  hero: { alignItems: 'center', paddingTop: 28, paddingBottom: 38 },
  flameStage: {
    width: 156,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    shadowColor: '#7F43FE',
    shadowOpacity: 0.7,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 0 },
    elevation: 16,
  },
  flameGlowFill: { flex: 1, borderRadius: 75 },
  flameHalo: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.28)',
  },
  ember: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D9CCFF',
    shadowColor: '#A78BFA',
    shadowOpacity: 0.9,
    shadowRadius: 7,
    elevation: 4,
  },
  emberLeft: { left: 24, top: 52 },
  emberRight: { right: 22, top: 83, width: 4, height: 4 },
  streakNumber: {
    marginTop: 14,
    fontFamily: THEME.fonts.extraBold,
    color: '#FFF9EF',
    fontSize: 62,
    lineHeight: 68,
    fontVariant: ['tabular-nums'],
  },
  streakUnit: {
    marginTop: 2,
    fontFamily: THEME.fonts.bold,
    color: '#C4B5FD',
    fontSize: 10,
    letterSpacing: 2,
  },
  heroNote: {
    maxWidth: 260,
    marginTop: 12,
    fontFamily: THEME.fonts.medium,
    color: '#A8A1B5',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  section: {
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.075)',
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: THEME.fonts.bold,
    color: '#90889F',
    fontSize: 9,
    letterSpacing: 1.35,
  },
  weekCount: {
    fontFamily: THEME.fonts.semiBold,
    color: '#CFC6DC',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  weekDay: { alignItems: 'center', gap: 7 },
  dayRing: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.035)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayRingToday: { borderColor: '#B99AFF' },
  dayRingActive: { backgroundColor: '#8B5CF6', borderColor: '#C4B5FD' },
  todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C9AEFF' },
  idleDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#615A6D' },
  dayLabel: { fontFamily: THEME.fonts.bold, color: '#716A7D', fontSize: 9 },
  dayLabelToday: { color: '#D4C1FF' },
  xpCount: {
    fontFamily: THEME.fonts.extraBold,
    color: '#F8F4FF',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  xpTarget: { fontFamily: THEME.fonts.medium, color: '#938BA1' },
  progressTrack: {
    height: 8,
    marginTop: 13,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  progressFill: { height: '100%', borderRadius: 5 },
  goalMessage: { marginTop: 9, fontFamily: THEME.fonts.medium, color: '#BDB4CC', fontSize: 11 },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.075)',
  },
  milestoneIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(127,67,254,0.14)',
  },
  milestoneCopy: { flex: 1, marginLeft: 11 },
  milestoneTitle: { fontFamily: THEME.fonts.bold, color: '#B0A7BE', fontSize: 9, letterSpacing: 1 },
  milestoneSubtitle: { marginTop: 3, fontFamily: THEME.fonts.semiBold, color: '#F0EAF8', fontSize: 12 },
  milestoneRemaining: { fontFamily: THEME.fonts.medium, color: '#958DA3', fontSize: 10 },
  ruleNote: {
    marginTop: 18,
    fontFamily: THEME.fonts.body,
    color: '#6F687B',
    fontSize: 10,
    textAlign: 'center',
  },
  footerBrand: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 80,
    opacity: 0.82,
  },
});
