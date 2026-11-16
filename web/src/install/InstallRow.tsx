import { useTranslation } from 'react-i18next';
import { InstallButton } from './InstallButton';
import { useInstallMode } from './useInstall';

/** Settings section: always offers installing, or says it's installed. */
export function InstallRow() {
  const { t } = useTranslation();
  const mode = useInstallMode();
  if (mode === 'none') return null;
  return (
    <section className="stack">
      <h2>{t('install.settingsTitle')}</h2>
      {mode === 'installed' ? <p>{t('install.installed')}</p> : <InstallButton />}
    </section>
  );
}
