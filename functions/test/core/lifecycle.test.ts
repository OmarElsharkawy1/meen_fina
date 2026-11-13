import { describe, expect, it } from 'vitest';
import { countValidVotes, expiryDecision, removeMemberFromQuestion, revealDecision } from '../../src/core/lifecycle';

const v = (voterUid: string, targetUid: string) => ({ voterUid, targetUid });
const p = (name: string) => ({ name, photoURL: null });
const q = () => ({
  eligibleUids: ['a', 'b', 'c', 'd'],
  votedUids: ['a', 'b', 'c'],
  people: { a: p('A'), b: p('B'), c: p('C'), d: p('D') },
});
const votes = [v('a', 'd'), v('b', 'c'), v('c', 'a')];

describe('revealDecision', () => {
  it('decides', () => {
    expect(revealDecision(2, 0)).toBe('expire');
    expect(revealDecision(3, 3)).toBe('reveal');
    expect(revealDecision(5, 4)).toBe('wait');
    expect(revealDecision(5, 5)).toBe('reveal');
  });
});

describe('expiryDecision', () => {
  it('decides', () => {
    expect(expiryDecision(2)).toBe('expire');
    expect(expiryDecision(3)).toBe('reveal');
  });
});

describe('removeMemberFromQuestion', () => {
  it('removes a non-voter; votes for them stay and voters stay voted', () => {
    const r = removeMemberFromQuestion(q(), 'd', votes);
    expect(r.eligibleUids).toEqual(['a', 'b', 'c']);
    expect(r.votedUids).toEqual(['a', 'b', 'c']);
    expect(r.voterUidsToDelete).toEqual([]);
    expect(r.people).not.toHaveProperty('d');
  });
  it('removes a voter and deletes only their own vote', () => {
    const r = removeMemberFromQuestion(q(), 'c', votes);
    expect(r.votedUids).toEqual(['a', 'b']);
    expect(r.votedUids).toContain('b');
    expect(r.voterUidsToDelete).toEqual(['c']);
    expect(r.eligibleUids).toEqual(['a', 'b', 'd']);
  });
});

describe('countValidVotes', () => {
  it('ignores votes by or for non-eligible users', () => {
    expect(countValidVotes(['a', 'b', 'c'], [v('a', 'b'), v('b', 'd'), v('d', 'a'), v('c', 'a')])).toBe(2);
  });
});
