export type PushSupport = 'supported' | 'needs-install' | 'unsupported';

export type PushEnv = {
  ua: string;
  maxTouchPoints: number;
  matchMedia: (q: string) => { matches: boolean };
  navigatorStandalone?: boolean;
  hasNotification: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
};

/** iPhone/iPad/iPod, including iPadOS which reports a Macintosh UA but has touch. */
export function isIos(ua: string, maxTouchPoints: number): boolean {
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
}

/** True when launched from the home screen (installed PWA). */
export function isStandalone(
  matchMedia: (q: string) => { matches: boolean },
  navigatorStandalone?: boolean,
): boolean {
  return matchMedia('(display-mode: standalone)').matches || navigatorStandalone === true;
}

export function pushSupport(env: PushEnv): PushSupport {
  // iOS only exposes web push to installed (home screen) apps.
  if (isIos(env.ua, env.maxTouchPoints) && !isStandalone(env.matchMedia, env.navigatorStandalone)) {
    return 'needs-install';
  }
  if (!env.hasNotification || !env.hasServiceWorker || !env.hasPushManager) return 'unsupported';
  return 'supported';
}

/** Support for the current browser. Disabled in emulator mode or without a VAPID key. */
export function currentPushSupport(): PushSupport {
  const e = import.meta.env;
  if (e.VITE_USE_EMULATORS === '1' || !e.VITE_FB_VAPID_KEY) return 'unsupported';
  if (typeof window === 'undefined') return 'unsupported';
  return pushSupport({
    ua: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    matchMedia: (q) => window.matchMedia(q),
    navigatorStandalone: (navigator as Navigator & { standalone?: boolean }).standalone,
    hasNotification: 'Notification' in window,
    hasServiceWorker: 'serviceWorker' in navigator,
    hasPushManager: 'PushManager' in window,
  });
}
