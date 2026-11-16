export type Theme = 'light' | 'dark';

const KEY = 'mf.theme';
const THEME_COLOR: Record<Theme, string> = { light: '#fff8f1', dark: '#17120e' };

/** The user's explicit choice, or null to follow the system. */
export function storedTheme(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

export function resolveTheme(stored: Theme | null, systemDark: boolean): Theme {
  return stored ?? (systemDark ? 'dark' : 'light');
}

export function otherTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark';
}

function systemDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function currentTheme(): Theme {
  return resolveTheme(storedTheme(), systemDark());
}

/** Applies a stored choice to <html>; with no choice the CSS follows the system. */
export function applyTheme(stored: Theme | null): void {
  const root = document.documentElement;
  if (stored) root.dataset.theme = stored;
  else delete root.dataset.theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLOR[resolveTheme(stored, systemDark())]);
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* storage unavailable: still applies for this visit */
  }
  applyTheme(theme);
}
