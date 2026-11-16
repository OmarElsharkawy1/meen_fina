const KEY = 'mf.installDismissed';

export function isInstallDismissed(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissInstall(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* storage unavailable */
  }
}
