import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { InstallGuide } from '../install/InstallGuide';
import { promptInstall } from '../install/installPrompt';
import { useInstallMode } from '../install/useInstall';
import { DownloadIcon } from './icons';
import { ThemeToggle } from './ThemeToggle';

type Props = { title?: string; back?: string; children: ReactNode };

/**
 * Shared screen layout: optional back link, app name, header actions, title, content.
 * The Install button stays in the header on every screen until the app is installed.
 */
export function Screen({ title, back, children }: Props) {
  const { t } = useTranslation();
  const mode = useInstallMode();
  const [guide, setGuide] = useState(false);
  const canInstall = mode === 'prompt' || mode === 'ios' || mode === 'android';

  async function install() {
    if (mode === 'prompt') {
      try {
        await promptInstall();
      } catch (err) {
        console.error('install prompt failed', err);
      }
      return;
    }
    setGuide((open) => !open);
  }

  return (
    <main className="screen">
      <header className="screen-header">
        {back ? (
          <Link to={back} className="back-link">
            {t('common.back')}
          </Link>
        ) : null}
        <span className="app-name">{t('appName')}</span>
        <div className="header-actions">
          {canInstall ? (
            <button
              type="button"
              className="btn btn-primary btn-small"
              aria-expanded={mode === 'prompt' ? undefined : guide}
              onClick={() => void install()}
            >
              <DownloadIcon />
              {t('install.short')}
            </button>
          ) : null}
          <ThemeToggle />
        </div>
      </header>
      {guide && (mode === 'ios' || mode === 'android') ? (
        <InstallGuide mode={mode} onClose={() => setGuide(false)} />
      ) : null}
      {title ? <h1>{title}</h1> : null}
      {children}
    </main>
  );
}
