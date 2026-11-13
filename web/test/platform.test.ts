import { describe, expect, it } from 'vitest';
import { isIos, isStandalone, pushSupport, type PushEnv } from '../src/lib/platform';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
const mm = (matches: boolean) => () => ({ matches });

const env = (over: Partial<PushEnv> = {}): PushEnv => ({
  ua: IPHONE,
  maxTouchPoints: 5,
  matchMedia: mm(false),
  hasNotification: true,
  hasServiceWorker: true,
  hasPushManager: true,
  ...over,
});

describe('isIos', () => {
  it('detects iPhone UA', () => expect(isIos(IPHONE, 5)).toBe(true));
  it('detects iPad desktop UA with touch', () => expect(isIos(MAC, 5)).toBe(true));
  it('rejects a real Mac', () => expect(isIos(MAC, 0)).toBe(false));
});

describe('isStandalone', () => {
  it('uses display-mode media query', () => expect(isStandalone(mm(true))).toBe(true));
  it('uses navigator.standalone', () => expect(isStandalone(mm(false), true)).toBe(true));
  it('false in a browser tab', () => expect(isStandalone(mm(false), false)).toBe(false));
});

describe('pushSupport', () => {
  it('needs install on iOS outside standalone', () =>
    expect(pushSupport(env())).toBe('needs-install'));
  it('supported on iOS standalone with APIs', () =>
    expect(pushSupport(env({ matchMedia: mm(true) }))).toBe('supported'));
  it('unsupported without PushManager', () =>
    expect(pushSupport(env({ ua: MAC, maxTouchPoints: 0, hasPushManager: false }))).toBe(
      'unsupported',
    ));
  it('supported on desktop with APIs', () =>
    expect(pushSupport(env({ ua: MAC, maxTouchPoints: 0 }))).toBe('supported'));
});
