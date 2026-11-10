import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../constants/theme';
import { SUPERNOVA_IMAGES } from '../constants/supernovaAssets';

interface LeaderboardScreenProps {
  onBack?: () => void;
}

interface LeaderboardUser {
  rank: number;
  name: string;
  initials: string;
  color: string;
  xp: number;
  streak: number;
  isCurrentUser?: boolean;
}

const LEADERBOARD_DATA: LeaderboardUser[] = [
  { rank: 1, name: 'Kavitha R.', initials: 'KR', color: '#F59E0B', xp: 2450, streak: 18 },
  { rank: 2, name: 'Siddharth M.', initials: 'SM', color: '#06B6D4', xp: 2180, streak: 14 },
  { rank: 3, name: 'Ananya S.', initials: 'AS', color: '#EC4899', xp: 1950, streak: 12 },
  { rank: 4, name: 'You', initials: 'ME', color: '#7F43FE', xp: 1650, streak: 7, isCurrentUser: true },
  { rank: 5, name: 'Dinesh Kumar', initials: 'DK', color: '#10B981', xp: 1420, streak: 9 },
  { rank: 6, name: 'Pooja V.', initials: 'PV', color: '#8B5CF6', xp: 1280, streak: 5 },
  { rank: 7, name: 'Vijay Anand', initials: 'VA', color: '#3B82F6', xp: 1150, streak: 6 },
  { rank: 8, name: 'Meera N.', initials: 'MN', color: '#F43F5E', xp: 980, streak: 4 },
  { rank: 9, name: 'Rahul Dev', initials: 'RD', color: '#14B8A6', xp: 840, streak: 3 },
  { rank: 10, name: 'Swetha K.', initials: 'SK', color: '#6366F1', xp: 720, streak: 2 },
];

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ onBack }) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {onBack && (
        <View style={styles.topBackRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={18} color={THEME.colors.text} />
            <Text style={styles.backBtnText}>Course</Text>
          </TouchableOpacity>
          <Text style={styles.screenHeaderTitle}>Leaderboard</Text>
          <View style={{ width: 72 }} />
        </View>
      )}

      {/* League Header Banner */}
      <LinearGradient
        colors={THEME.gradients.banner}
        style={styles.leagueBanner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.leagueTopRow}>
          <View style={styles.leagueIconCircle}>
            <Image source={SUPERNOVA_IMAGES.trophyNova} style={{ width: 44, height: 44 }} resizeMode="contain" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.leagueLabel}>CURRENT LEAGUE</Text>
            <Text style={styles.leagueTitle}>Gold League</Text>
            <Text style={styles.leagueSubtitle}>Top 5 advance to Diamond League</Text>
          </View>
        </View>

        {/* Timer Bar */}
        <View style={styles.timerBar}>
          <Ionicons name="time-outline" size={14} color={THEME.colors.primaryGlow} />
          <Text style={styles.timerText}>Resets in 2 days, 14 hours</Text>
        </View>
      </LinearGradient>

      {/* Top 3 Podium Cards */}
      <View style={styles.podiumContainer}>
        {/* Rank 2 */}
        <View style={[styles.podiumCol, { marginTop: 24 }]}>
          <View style={[styles.podiumAvatar, { backgroundColor: LEADERBOARD_DATA[1].color + '28', borderColor: '#94A3B8' }]}>
            <Text style={styles.podiumInitials}>{LEADERBOARD_DATA[1].initials}</Text>
            <View style={[styles.podiumBadge, { backgroundColor: '#94A3B8' }]}>
              <Text style={styles.podiumRankText}>2</Text>
            </View>
          </View>
          <Text style={styles.podiumName} numberOfLines={1}>{LEADERBOARD_DATA[1].name}</Text>
          <Text style={styles.podiumXp}>{LEADERBOARD_DATA[1].xp} XP</Text>
        </View>

        {/* Rank 1 (Champion) */}
        <View style={styles.podiumCol}>
          <MaterialCommunityIcons name="crown" size={24} color={THEME.colors.gold} style={{ marginBottom: 2 }} />
          <View style={[styles.podiumAvatar, styles.podiumAvatarGold, { backgroundColor: LEADERBOARD_DATA[0].color + '28' }]}>
            <Text style={styles.podiumInitialsGold}>{LEADERBOARD_DATA[0].initials}</Text>
            <View style={[styles.podiumBadge, { backgroundColor: THEME.colors.gold }]}>
              <Text style={styles.podiumRankText}>1</Text>
            </View>
          </View>
          <Text style={styles.podiumNameGold} numberOfLines={1}>{LEADERBOARD_DATA[0].name}</Text>
          <Text style={styles.podiumXpGold}>{LEADERBOARD_DATA[0].xp} XP</Text>
        </View>

        {/* Rank 3 */}
        <View style={[styles.podiumCol, { marginTop: 32 }]}>
          <View style={[styles.podiumAvatar, { backgroundColor: LEADERBOARD_DATA[2].color + '28', borderColor: '#B45309' }]}>
            <Text style={styles.podiumInitials}>{LEADERBOARD_DATA[2].initials}</Text>
            <View style={[styles.podiumBadge, { backgroundColor: '#B45309' }]}>
              <Text style={styles.podiumRankText}>3</Text>
            </View>
          </View>
          <Text style={styles.podiumName} numberOfLines={1}>{LEADERBOARD_DATA[2].name}</Text>
          <Text style={styles.podiumXp}>{LEADERBOARD_DATA[2].xp} XP</Text>
        </View>
      </View>

      {/* Promotion Zone Label */}
      <View style={styles.zoneDivider}>
        <Ionicons name="trending-up" size={14} color={THEME.colors.success} />
        <Text style={styles.zoneDividerText}>PROMOTION ZONE (TOP 5 ADVANCE)</Text>
      </View>

      {/* Ranks 4 to 10 */}
      <View style={styles.ranksList}>
        {LEADERBOARD_DATA.slice(3).map((user) => {
          return (
            <View
              key={user.rank}
              style={[
                styles.rankItem,
                user.isCurrentUser && styles.rankItemCurrent,
              ]}
            >
              <Text style={[styles.rankNumber, user.isCurrentUser && styles.rankNumberCurrent]}>
                {user.rank}
              </Text>
              <View style={[styles.rankAvatarCircle, { backgroundColor: user.color + '28', borderColor: user.color }]}>
                <Text style={[styles.rankInitials, { color: user.color }]}>{user.initials}</Text>
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.rankName, user.isCurrentUser && styles.rankNameCurrent]}>
                  {user.name}
                </Text>
                <View style={styles.streakRow}>
                  <MaterialCommunityIcons name="fire" size={12} color={THEME.colors.gold} />
                  <Text style={styles.streakText}>{user.streak}d streak</Text>
                </View>
              </View>

              <View style={styles.xpPill}>
                <Ionicons name="flash" size={12} color={THEME.colors.secondary} />
                <Text style={styles.xpPillText}>{user.xp} XP</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    padding: 16,
  },
  topBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceCard,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  backBtnText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.text,
    marginLeft: 2,
  },
  screenHeaderTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 16,
    color: THEME.colors.text,
  },
  leagueBanner: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 20,
  },
  leagueTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leagueIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leagueLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.gold,
    letterSpacing: 0.8,
  },
  leagueTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 18,
    color: THEME.colors.text,
    marginTop: 2,
  },
  leagueSubtitle: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  timerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  timerText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.primaryGlow,
    marginLeft: 6,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radius.lg,
    paddingVertical: 20,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 16,
  },
  podiumCol: {
    alignItems: 'center',
    width: '30%',
  },
  podiumAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: THEME.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: THEME.colors.border,
  },
  podiumAvatarGold: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderColor: THEME.colors.gold,
    borderWidth: 3,
  },
  podiumInitials: {
    fontFamily: THEME.fonts.bold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  podiumInitialsGold: {
    fontFamily: THEME.fonts.extraBold,
    fontSize: 22,
    color: THEME.colors.gold,
  },
  podiumBadge: {
    position: 'absolute',
    bottom: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumRankText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: '#000',
  },
  podiumName: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.text,
    marginTop: 10,
    textAlign: 'center',
  },
  podiumNameGold: {
    fontFamily: THEME.fonts.bold,
    fontSize: 14,
    color: THEME.colors.gold,
    marginTop: 10,
    textAlign: 'center',
  },
  podiumXp: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  podiumXpGold: {
    fontFamily: THEME.fonts.bold,
    fontSize: 12,
    color: THEME.colors.secondary,
    marginTop: 2,
  },
  zoneDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 4,
  },
  zoneDividerText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.success,
    marginLeft: 6,
    letterSpacing: 0.6,
  },
  ranksList: {
    gap: 8,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceCard,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  rankItemCurrent: {
    backgroundColor: 'rgba(127, 67, 254, 0.14)',
    borderColor: THEME.colors.primary,
  },
  rankNumber: {
    fontFamily: THEME.fonts.bold,
    fontSize: 14,
    color: THEME.colors.textMuted,
    width: 24,
  },
  rankNumberCurrent: {
    color: THEME.colors.primaryGlow,
  },
  rankAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  rankInitials: {
    fontFamily: THEME.fonts.bold,
    fontSize: 12,
  },
  rankName: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 14,
    color: THEME.colors.text,
  },
  rankNameCurrent: {
    fontFamily: THEME.fonts.bold,
    color: THEME.colors.text,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  streakText: {
    fontFamily: THEME.fonts.body,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginLeft: 4,
  },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  xpPillText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 12,
    color: THEME.colors.secondary,
    marginLeft: 4,
  },
});

