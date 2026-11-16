import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dismissInstall, isInstallDismissed } from './dismiss';
import { InstallButton } from './InstallButton';
import { useInstallMode } from './useInstall';

/** Dismissible Home card inviting the user to install. Settings keeps a permanent button. */
export function InstallCard() {
  const { t } = useTranslation();
  const mode = useInstallMode();
  const [hidden, setHidden] = useState(isInstallDismissed);

  if (hidden || mode === 'installed' || mode === 'none') return null;

  function notNow() {
    dismissInstall();
    setHidden(true);
  }

  return (
    <section className="card stack" aria-labelledby="install-card-title">
      <strong id="install-card-title">{t('install.cardTitle')}</strong>
      <p className="muted">{t('install.cardBody')}</p>
      <InstallButton onDone={() => setHidden(true)} />
      <button type="button" className="btn btn-secondary" onClick={notNow}>
        {t('install.notNow')}
      </button>
    </section>
  );
}
