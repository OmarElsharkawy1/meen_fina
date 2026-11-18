import { describe, expect, it } from 'vitest';
import { shouldReloadOnControllerChange } from '../src/lib/autoUpdate';
import { backAction, previousPath, recordPath } from '../src/lib/navStack';

describe('backAction', () => {
  it('pops when the previous entry is the target', () => expect(backAction('/g/1', '/g/1')).toBe('pop'));
  it('replaces when the previous entry is something else', () =>
    expect(backAction('/', '/join')).toBe('replace'));
  it('replaces when history before this entry is unknown', () =>
    expect(backAction('/', undefined)).toBe('replace'));
});

describe('recordPath', () => {
  it('tracks the previous path and forgets discarded forward entries', () => {
    recordPath(0, '/');
    recordPath(1, '/g/1');
    recordPath(2, '/g/1/q/a');
    expect(previousPath(2)).toBe('/g/1');
    recordPath(1, '/settings');
    expect(previousPath(2)).toBe('/settings');
    expect(previousPath(3)).toBeUndefined();
  });
});

describe('shouldReloadOnControllerChange', () => {
  it('reloads on an update', () => expect(shouldReloadOnControllerChange(true, false)).toBe(true));
  it('skips the first install', () => expect(shouldReloadOnControllerChange(false, false)).toBe(false));
  it('reloads only once', () => expect(shouldReloadOnControllerChange(true, true)).toBe(false));
});
