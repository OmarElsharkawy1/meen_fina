/**
 * Reload once when a new version's service worker takes over, so a deploy shows on the
 * next open instead of the one after. Skipped on first install (no previous worker).
 */
export function shouldReloadOnControllerChange(hadController: boolean, alreadyReloading: boolean): boolean {
  return hadController && !alreadyReloading;
}

export function startAutoUpdate(): void {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;
  const hadController = sw.controller !== null;
  let reloading = false;

  sw.addEventListener('controllerchange', () => {
    if (!shouldReloadOnControllerChange(hadController, reloading)) return;
    reloading = true;
    window.location.reload();
  });

  // Installed apps are often resumed rather than relaunched; check for a new version then.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    void sw
      .getRegistration()
      .then((reg) => reg?.update())
      .catch(() => {
        /* offline: try again next time */
      });
  });
}
