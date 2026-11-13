import { describe, expect, it } from 'vitest';
import { rankLeaderboard } from '../src/lib/leaderboard';

describe('rankLeaderboard', () => {
  it('uses competition ranking with stable ordering', () => {
    const r = rankLeaderboard({ d: 0, c: 1, b: 3, a: 3 });
    expect(r.map((e) => e.uid)).toEqual(['a', 'b', 'c', 'd']);
    expect(r.map((e) => e.rank)).toEqual([1, 1, 3, 4]);
    expect(r.map((e) => e.isTop)).toEqual([true, true, false, false]);
  });
  it('does not mark zero-vote leaders as top', () => {
    const r = rankLeaderboard({ a: 0, b: 0 });
    expect(r.map((e) => e.rank)).toEqual([1, 1]);
    expect(r.every((e) => !e.isTop)).toBe(true);
  });
});
