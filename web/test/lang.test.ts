import { describe, expect, it } from 'vitest';
import ar from '../src/i18n/ar.json';
import en from '../src/i18n/en.json';
import i18n from '../src/i18n';
import { detectLang } from '../src/lib/lang';

function keyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj)
    .flatMap(([k, v]) =>
      v && typeof v === 'object'
        ? keyPaths(v as Record<string, unknown>, `${prefix}${k}.`)
        : [`${prefix}${k}`.replace(/_(zero|one|two|few|many|other)$/, '')],
    )
    .sort()
    .filter((k, i, a) => a.indexOf(k) === i);
}

describe('detectLang', () => {
  it('picks ar when first ar-prefixed entry exists first', () => {
    expect(detectLang(['ar-EG', 'en'])).toBe('ar');
  });
  it('picks en when en comes first', () => {
    expect(detectLang(['en-US', 'ar'])).toBe('en');
  });
  it('defaults to en when empty', () => {
    expect(detectLang([])).toBe('en');
  });
});

describe('i18n catalogs', () => {
  it('en and ar have identical key sets', () => {
    expect(keyPaths(ar)).toEqual(keyPaths(en));
  });
  it('appName values', () => {
    expect(en.appName).toBe('Meen Fina');
    expect(ar.appName).toBe('مين فينا؟');
  });
});

describe('arabic plurals', () => {
  it.each([0, 1, 2, 3, 11, 100])('member count %i resolves without English fallback', (count) => {
    const arText = i18n.getFixedT('ar')('home.members', { count });
    const enText = i18n.getFixedT('en')('home.members', { count });
    expect(arText).not.toBe(enText);
    expect(arText).not.toMatch(/[A-Za-z]/);
  });
});
