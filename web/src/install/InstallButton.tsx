import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { promptInstall } from './installPrompt';
import { useInstallMode } from './useInstall';

/**
 * "Install app" button. Uses the native dialog where the browser offers one (Android
 * Chrome, desktop Chrome/Edge); otherwise shows the manual steps for iOS or Android.
 * Renders nothing when installed or when the device can't install.
 */
export function InstallButton({ onDone }: { onDone?: () => void }) {
  const { t } = useTranslation();
  const mode = useInstallMode();
  const [guide, setGuide] = useState(false);

  if (mode === 'installed' || mode === 'none') return null;

  async function install() {
    if (mode === 'prompt') {
      try {
        if (await promptInstall()) onDone?.();
      } catch (err) {
        console.error('install prompt failed', err);
      }
      return;
    }
    setGuide(true);
  }

  if (guide && (mode === 'ios' || mode === 'android')) {
    return (
      <section className="card stack" aria-labelledby="install-guide-title">
        <strong id="install-guide-title">{t('install.guideTitle')}</strong>
        <ol className="steps">
          <li>{t(`install.${mode}.step1`)}</li>
          <li>{t(`install.${mode}.step2`)}</li>
          <li>{t(`install.${mode}.step3`)}</li>
        </ol>
        <button type="button" className="btn btn-secondary" onClick={() => setGuide(false)}>
          {t('install.gotIt')}
        </button>
      </section>
    );
  }

  return (
    <button type="button" className="btn btn-primary" onClick={() => void install()}>
      {t('install.button')}
    </button>
  );
}
