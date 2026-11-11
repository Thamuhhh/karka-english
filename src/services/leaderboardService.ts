import { AuthUser, LeaderboardEntry, UserStats } from '../types';

export const PEER_LEADERBOARD_ROSTER: Omit<LeaderboardEntry, 'rank'>[] = [
  { name: 'Kavitha R.', initials: 'KR', color: '#F59E0B', xp: 2450, streak: 18, avatarId: 'owl' },
  { name: 'Siddharth M.', initials: 'SM', color: '#06B6D4', xp: 2180, streak: 14, avatarId: 'husky' },
  { name: 'Ananya S.', initials: 'AS', color: '#EC4899', xp: 1950, streak: 12, avatarId: 'kitten' },
  { name: 'Dinesh Kumar', initials: 'DK', color: '#10B981', xp: 1420, streak: 9, avatarId: 'panda' },
  { name: 'Pooja V.', initials: 'PV', color: '#8B5CF6', xp: 1280, streak: 5, avatarId: 'redpanda' },
  { name: 'Vijay Anand', initials: 'VA', color: '#3B82F6', xp: 1150, streak: 6, avatarId: 'lion' },
  { name: 'Meera N.', initials: 'MN', color: '#F43F5E', xp: 980, streak: 4, avatarId: 'penguin' },
  { name: 'Rahul Dev', initials: 'RD', color: '#14B8A6', xp: 840, streak: 3, avatarId: 'shiba' },
  { name: 'Swetha K.', initials: 'SK', color: '#6366F1', xp: 720, streak: 2, avatarId: 'kitten' },
];

export const PROMOTION_CUTOFF_RANK = 5;

export function computeLeagueRankName(xp: number): string {
  if (xp >= 1500) return 'Diamond League';
  if (xp >= 800) return 'Gold League';
  if (xp >= 350) return 'Silver League';
  return 'Bronze League';
}

export function getRankedLeaderboard(
  stats: UserStats,
  authUser?: AuthUser | null
): LeaderboardEntry[] {
  const combined: Omit<LeaderboardEntry, 'rank'>[] = [
    ...PEER_LEADERBOARD_ROSTER,
    {
      name: authUser?.name ? `${authUser.name} (You)` : 'You',
      initials: 'ME',
      color: '#7F43FE',
      avatarId: authUser?.avatarId || 'lion',
      xp: stats.stardustXp,
      streak: stats.streakDays,
      isCurrentUser: true,
    },
  ];

  combined.sort((a, b) => {
    if (b.xp !== a.xp) return b.xp - a.xp;
    return a.isCurrentUser ? -1 : b.isCurrentUser ? 1 : 0;
  });

  return combined.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));
}

export function getUserLeaderboardRank(
  stats: UserStats,
  authUser?: AuthUser | null
): number {
  const ranked = getRankedLeaderboard(stats, authUser);
  const me = ranked.find((u) => u.isCurrentUser);
  return me?.rank || ranked.length;
}

