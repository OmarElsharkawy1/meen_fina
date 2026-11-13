import { describe, expect, it } from 'vitest';
import ar from '../src/i18n/ar.json';
import en from '../src/i18n/en.json';
import { detectLang } from '../src/lib/lang';

function keyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj)
    .flatMap(([k, v]) =>
      v && typeof v === 'object'
        ? keyPaths(v as Record<string, unknown>, `${prefix}${k}.`)
        : [`${prefix}${k}`],
    )
    .sort();
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
