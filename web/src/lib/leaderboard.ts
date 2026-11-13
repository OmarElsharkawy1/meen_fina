export type LeaderboardEntry = { uid: string; votes: number; rank: number; isTop: boolean };

/** Sorts by votes desc then uid asc; competition ranking (1,1,3). */
export function rankLeaderboard(totals: Record<string, number>): LeaderboardEntry[] {
  const sorted = Object.entries(totals).sort(([ua, a], [ub, b]) => b - a || (ua < ub ? -1 : 1));
  return sorted.map(([uid, votes]) => {
    const first = sorted.findIndex(([, v]) => v === votes);
    const rank = first + 1;
    return { uid, votes, rank, isTop: rank === 1 && votes > 0 };
  });
}
