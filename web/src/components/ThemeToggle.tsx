import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { currentTheme, otherTheme, setTheme } from '../lib/theme';
import { MoonIcon, SunIcon } from './icons';

/** Header button that flips between light and dark, overriding the system setting. */
export function ThemeToggle() {
  const { t } = useTranslation();
  const [theme, setLocal] = useState(currentTheme);
  const next = otherTheme(theme);

  function flip() {
    setTheme(next);
    setLocal(next);
  }

  return (
    <button
      type="button"
      className="icon-link icon-button"
      aria-label={t(next === 'dark' ? 'theme.toDark' : 'theme.toLight')}
      onClick={flip}
    >
      {next === 'dark' ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
