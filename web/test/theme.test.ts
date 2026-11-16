import { describe, expect, it } from 'vitest';
import { otherTheme, resolveTheme } from '../src/lib/theme';

describe('resolveTheme', () => {
  it('follows the system when nothing is stored', () => {
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme(null, false)).toBe('light');
  });
  it('a stored choice beats the system', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});

describe('otherTheme', () => {
  it('flips', () => {
    expect(otherTheme('dark')).toBe('light');
    expect(otherTheme('light')).toBe('dark');
  });
});
