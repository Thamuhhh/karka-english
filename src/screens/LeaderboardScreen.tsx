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
import { UserStats } from '../types';
import {
  getRankedLeaderboard,
  PROMOTION_CUTOFF_RANK,
} from '../services/leaderboardService';

interface LeaderboardScreenProps {
  stats: UserStats;
  onBack?: () => void;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ stats, onBack }) => {
  const rankedUsers = getRankedLeaderboard(stats);
  const top3 = rankedUsers.slice(0, 3);
  const rest = rankedUsers.slice(3);
  const me = rankedUsers.find((u) => u.isCurrentUser);
  const myRank = me?.rank ?? rankedUsers.length;
  const inPromotionZone = myRank <= PROMOTION_CUTOFF_RANK;
  const fifthPlaceXp = rankedUsers[PROMOTION_CUTOFF_RANK - 1]?.xp ?? 1420;
  const xpNeeded = Math.max(0, fifthPlaceXp - stats.stardustXp + 10);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {onBack && (
        <View style={styles.topBackRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={16} color={THEME.colors.text} />
            <Text style={styles.backBtnText}>Course</Text>
          </TouchableOpacity>
          <Text style={styles.screenHeaderTitle}>Leaderboard</Text>
          <View style={{ width: 68 }} />
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
            <Image
              source={SUPERNOVA_IMAGES.trophyNova}
              style={styles.leagueTrophyImg}
              resizeMode="cover"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.leagueLabel}>CURRENT LEAGUE</Text>
            <Text style={styles.leagueTitle}>{stats.cosmicRank}</Text>
            <Text style={styles.leagueSubtitle}>
              {inPromotionZone
                ? `Rank #${myRank} — Inside Top ${PROMOTION_CUTOFF_RANK} Promotion Zone`
                : `Rank #${myRank} — Earn ${xpNeeded} XP for Top ${PROMOTION_CUTOFF_RANK}`}
            </Text>
          </View>
        </View>

        <View style={styles.timerBar}>
          <Ionicons name="flash-outline" size={14} color={THEME.colors.primaryGlow} />
          <Text style={styles.timerText}>
            Your Score: {stats.stardustXp} XP • {stats.streakDays}d Streak
          </Text>
        </View>
      </LinearGradient>

      {/* Top 3 Podium */}
      <View style={styles.podiumContainer}>
        {/* Rank 2 */}
        {top3[1] && (
          <View style={[styles.podiumCol, { marginTop: 20 }]}>
            <View
              style={[
                styles.podiumAvatar,
                { backgroundColor: top3[1].color + '28', borderColor: '#94A3B8' },
                top3[1].isCurrentUser && styles.podiumYouRing,
              ]}
            >
              <Text style={styles.podiumInitials}>{top3[1].initials}</Text>
              <View style={[styles.podiumBadge, { backgroundColor: '#94A3B8' }]}>
                <Text style={styles.podiumRankText}>2</Text>
              </View>
            </View>
            <Text style={styles.podiumName} numberOfLines={1}>{top3[1].name}</Text>
            <Text style={styles.podiumXp}>{top3[1].xp} XP</Text>
          </View>
        )}

        {/* Rank 1 */}
        {top3[0] && (
          <View style={styles.podiumCol}>
            <MaterialCommunityIcons name="crown" size={22} color={THEME.colors.gold} style={{ marginBottom: 2 }} />
            <View
              style={[
                styles.podiumAvatar,
                styles.podiumAvatarGold,
                { backgroundColor: top3[0].color + '28' },
                top3[0].isCurrentUser && styles.podiumYouRing,
              ]}
            >
              <Text style={styles.podiumInitialsGold}>{top3[0].initials}</Text>
              <View style={[styles.podiumBadge, { backgroundColor: THEME.colors.gold }]}>
                <Text style={styles.podiumRankText}>1</Text>
              </View>
            </View>
            <Text style={styles.podiumNameGold} numberOfLines={1}>{top3[0].name}</Text>
            <Text style={styles.podiumXpGold}>{top3[0].xp} XP</Text>
          </View>
        )}

        {/* Rank 3 */}
        {top3[2] && (
          <View style={[styles.podiumCol, { marginTop: 26 }]}>
            <View
              style={[
                styles.podiumAvatar,
                { backgroundColor: top3[2].color + '28', borderColor: '#B45309' },
                top3[2].isCurrentUser && styles.podiumYouRing,
              ]}
            >
              <Text style={styles.podiumInitials}>{top3[2].initials}</Text>
              <View style={[styles.podiumBadge, { backgroundColor: '#B45309' }]}>
                <Text style={styles.podiumRankText}>3</Text>
              </View>
            </View>
            <Text style={styles.podiumName} numberOfLines={1}>{top3[2].name}</Text>
            <Text style={styles.podiumXp}>{top3[2].xp} XP</Text>
          </View>
        )}
      </View>

      <View style={styles.zoneDivider}>
        <Ionicons name="trending-up" size={14} color={THEME.colors.primaryGlow} />
        <Text style={styles.zoneDividerText}>
          PROMOTION ZONE (TOP {PROMOTION_CUTOFF_RANK} ADVANCE)
        </Text>
      </View>

      {/* Remaining Ranks */}
      <View style={styles.ranksList}>
        {rest.map((user) => (
          <View
            key={`${user.rank}-${user.name}`}
            style={[
              styles.rankItem,
              user.isCurrentUser && styles.rankItemCurrent,
              user.rank === PROMOTION_CUTOFF_RANK && styles.rankCutoffBorder,
            ]}
          >
            <Text style={[styles.rankNumber, user.isCurrentUser && styles.rankNumberCurrent]}>
              {user.rank}
            </Text>
            <View
              style={[
                styles.rankAvatarCircle,
                { backgroundColor: user.color + '28', borderColor: user.color },
              ]}
            >
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
        ))}
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
    padding: 14,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  topBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceCard,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
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
    fontSize: 15,
    color: THEME.colors.text,
  },
  leagueBanner: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 14,
  },
  leagueTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leagueIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#181724',
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.5)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leagueTrophyImg: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.04 }],
  },
  leagueLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.gold,
    letterSpacing: 0.8,
  },
  leagueTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 16,
    color: THEME.colors.text,
    marginTop: 2,
  },
  leagueSubtitle: {
    fontFamily: THEME.fonts.body,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  timerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  timerText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.primaryGlow,
    marginLeft: 6,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 14,
  },
  podiumCol: {
    alignItems: 'center',
    width: '30%',
  },
  podiumAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: THEME.colors.border,
  },
  podiumAvatarGold: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderColor: THEME.colors.gold,
    borderWidth: 2.5,
  },
  podiumYouRing: {
    borderColor: THEME.colors.primaryGlow,
  },
  podiumInitials: {
    fontFamily: THEME.fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  podiumInitialsGold: {
    fontFamily: THEME.fonts.extraBold,
    fontSize: 20,
    color: THEME.colors.gold,
  },
  podiumBadge: {
    position: 'absolute',
    bottom: -6,
    width: 19,
    height: 19,
    borderRadius: 9.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumRankText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10.5,
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
    fontSize: 13.5,
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
    color: THEME.colors.primaryGlow,
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
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  rankItemCurrent: {
    backgroundColor: 'rgba(127, 67, 254, 0.14)',
    borderColor: THEME.colors.primary,
  },
  rankCutoffBorder: {
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(167, 139, 250, 0.45)',
  },
  rankNumber: {
    fontFamily: THEME.fonts.bold,
    fontSize: 13.5,
    color: THEME.colors.textMuted,
    width: 24,
  },
  rankNumberCurrent: {
    color: THEME.colors.primaryGlow,
  },
  rankAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  rankInitials: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11.5,
  },
  rankName: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 13.5,
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
    fontSize: 11.5,
    color: THEME.colors.secondary,
    marginLeft: 4,
  },
});
