import { describe, expect, it } from 'vitest';
import { pickTab } from '../src/lib/groupTabs';

const counts = (turn: number, waiting: number, results: number) => ({ turn, waiting, results });

describe('pickTab', () => {
  it('keeps a valid tab from the URL, even if empty', () =>
    expect(pickTab('results', counts(2, 1, 0))).toBe('results'));
  it('defaults to Your turn when you have votes to cast', () =>
    expect(pickTab(null, counts(2, 1, 3))).toBe('turn'));
  it('falls through to the first tab with questions', () => {
    expect(pickTab(null, counts(0, 1, 3))).toBe('waiting');
    expect(pickTab(null, counts(0, 0, 3))).toBe('results');
  });
  it('ignores an unknown tab value', () => expect(pickTab('bogus', counts(0, 2, 0))).toBe('waiting'));
  it('shows Your turn when everything is empty', () => expect(pickTab(null, counts(0, 0, 0))).toBe('turn'));
});
