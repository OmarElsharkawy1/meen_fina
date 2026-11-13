import { describe, expect, it } from 'vitest';
import { computeResults } from '../../src/core/results';

const v = (voterUid: string, targetUid: string) => ({ voterUid, targetUid });

describe('computeResults', () => {
  it('full mode with 5 eligible', () => {
    const r = computeResults(
      ['a', 'b', 'c', 'd', 'e'],
      [v('a', 'b'), v('b', 'c'), v('c', 'b'), v('d', 'b'), v('e', 'c')],
    );
    expect(r).toEqual({ mode: 'full', totals: { a: 0, b: 3, c: 2, d: 0, e: 0 } });
  });
  it('winners mode with ties, sorted, no totals', () => {
    const r = computeResults(['a', 'b', 'c', 'd'], [v('a', 'b'), v('c', 'b'), v('d', 'a'), v('b', 'a')]);
    expect(r).toEqual({ mode: 'winners', winnerUids: ['a', 'b'] });
    expect('totals' in r).toBe(false);
  });
  it('winners mode single winner', () => {
    expect(computeResults(['a', 'b', 'c'], [v('a', 'b'), v('b', 'c'), v('c', 'b')])).toEqual({
      mode: 'winners',
      winnerUids: ['b'],
    });
  });
  it('ignores non-eligible voters and targets', () => {
    const r = computeResults(['a', 'b', 'c'], [v('x', 'b'), v('a', 'z'), v('a', 'b')]);
    expect(r).toEqual({ mode: 'winners', winnerUids: ['b'] });
  });
});
