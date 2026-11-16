import { useEffect, useState } from 'react';
import { installMode, isStandalone, type InstallMode } from '../lib/platform';
import { canPrompt, justInstalled, subscribeInstall } from './installPrompt';

function current(): InstallMode {
  if (typeof window === 'undefined') return 'none';
  if (justInstalled()) return 'installed';
  return installMode({
    ua: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    standalone: isStandalone(
      (q) => window.matchMedia(q),
      (navigator as Navigator & { standalone?: boolean }).standalone,
    ),
    canPrompt: canPrompt(),
  });
}

export function useInstallMode(): InstallMode {
  const [mode, setMode] = useState(current);
  useEffect(() => subscribeInstall(() => setMode(current())), []);
  return mode;
}
