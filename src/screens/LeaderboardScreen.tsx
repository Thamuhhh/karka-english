import React, { useState } from 'react';
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

interface LeaderboardUser {
  rank: number;
  name: string;
  avatar: string;
  xp: number;
  streak: number;
  isCurrentUser?: boolean;
}

const LEADERBOARD_DATA: LeaderboardUser[] = [
  { rank: 1, name: 'Kavitha R.', avatar: '👩‍🔬', xp: 2450, streak: 18 },
  { rank: 2, name: 'Siddharth M.', avatar: '🧑‍💼', xp: 2180, streak: 14 },
  { rank: 3, name: 'Ananya S.', avatar: '👩‍🎓', xp: 1950, streak: 12 },
  { rank: 4, name: 'Alex (You)', avatar: '🧑‍💻', xp: 1650, streak: 7, isCurrentUser: true },
  { rank: 5, name: 'Dinesh Kumar', avatar: '👨‍🏫', xp: 1420, streak: 9 },
  { rank: 6, name: 'Pooja V.', avatar: '👩‍💻', xp: 1280, streak: 5 },
  { rank: 7, name: 'Vijay Anand', avatar: '👨‍🎨', xp: 1150, streak: 6 },
  { rank: 8, name: 'Meera N.', avatar: '👩‍⚕️', xp: 980, streak: 4 },
  { rank: 9, name: 'Rahul Dev', avatar: '🧑‍🚀', xp: 840, streak: 3 },
  { rank: 10, name: 'Swetha K.', avatar: '👩‍💼', xp: 720, streak: 2 },
];

export const LeaderboardScreen: React.FC = () => {
  const [activeLeague, setActiveLeague] = useState<'bronze' | 'silver' | 'gold'>('gold');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
            <Text style={styles.leagueTitle}>Gold Supernova League</Text>
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
          <View style={styles.podiumAvatar}>
            <Text style={{ fontSize: 26 }}>{LEADERBOARD_DATA[1].avatar}</Text>
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
          <View style={[styles.podiumAvatar, styles.podiumAvatarGold]}>
            <Text style={{ fontSize: 32 }}>{LEADERBOARD_DATA[0].avatar}</Text>
            <View style={[styles.podiumBadge, { backgroundColor: THEME.colors.gold }]}>
              <Text style={styles.podiumRankText}>1</Text>
            </View>
          </View>
          <Text style={styles.podiumNameGold} numberOfLines={1}>{LEADERBOARD_DATA[0].name}</Text>
          <Text style={styles.podiumXpGold}>{LEADERBOARD_DATA[0].xp} XP</Text>
        </View>

        {/* Rank 3 */}
        <View style={[styles.podiumCol, { marginTop: 32 }]}>
          <View style={styles.podiumAvatar}>
            <Text style={{ fontSize: 26 }}>{LEADERBOARD_DATA[2].avatar}</Text>
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
              <Text style={styles.rankAvatar}>{user.avatar}</Text>

              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.rankName, user.isCurrentUser && styles.rankNameCurrent]}>
                  {user.name}
                </Text>
                <View style={styles.streakRow}>
                  <MaterialCommunityIcons name="fire" size={12} color={THEME.colors.gold} />
                  <Text style={styles.streakText}>{user.streak}d streak</Text>
                </View>
              </View>

              <View style={styles.xpPill}>
                <Ionicons name="sparkles" size={12} color={THEME.colors.secondary} />
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
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.gold,
    letterSpacing: 0.8,
  },
  leagueTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginTop: 2,
  },
  leagueSubtitle: {
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
    fontSize: 12,
    color: THEME.colors.primaryGlow,
    fontWeight: '600',
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
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text,
    marginTop: 10,
    textAlign: 'center',
  },
  podiumNameGold: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.gold,
    marginTop: 10,
    textAlign: 'center',
  },
  podiumXp: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: 'bold',
    marginTop: 2,
  },
  podiumXpGold: {
    fontSize: 12,
    color: THEME.colors.secondary,
    fontWeight: 'bold',
    marginTop: 2,
  },
  zoneDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 4,
  },
  zoneDividerText: {
    fontSize: 10,
    fontWeight: '800',
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
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: THEME.colors.primary,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.textMuted,
    width: 24,
  },
  rankNumberCurrent: {
    color: THEME.colors.primaryGlow,
  },
  rankAvatar: {
    fontSize: 22,
  },
  rankName: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  rankNameCurrent: {
    color: THEME.colors.text,
    fontWeight: 'bold',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  streakText: {
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
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.secondary,
    marginLeft: 4,
  },
});

