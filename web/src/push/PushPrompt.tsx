import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { currentPushSupport } from '../lib/platform';
import { enablePush } from './enablePush';
import { IosInstallGuide } from './IosInstallGuide';
import { dismissPush, isPushDismissed } from './pushFlag';

type Props = { uid: string; onDone?: () => void };

/** Friendly in-context ask. Renders nothing when push is unsupported, decided or dismissed. */
export function PushPrompt({ uid, onDone }: Props) {
  const { t } = useTranslation();
  const [support] = useState(currentPushSupport);
  const [hidden, setHidden] = useState(
    () =>
      isPushDismissed() ||
      (typeof Notification !== 'undefined' && Notification.permission !== 'default'),
  );
  const [busy, setBusy] = useState(false);

  if (hidden || support === 'unsupported') return null;

  function close(remember: boolean) {
    if (remember) dismissPush();
    setHidden(true);
    onDone?.();
  }

  if (support === 'needs-install') return <IosInstallGuide onClose={() => close(true)} />;

  async function turnOn() {
    if (busy) return;
    setBusy(true);
    try {
      await enablePush(uid);
    } catch (err) {
      console.error('enablePush failed', err);
    }
    // Granted or denied, the browser owns the decision now; don't ask again.
    close(true);
  }

  return (
    <section className="card stack" role="region" aria-label={t('push.prompt')}>
      <p>{t('push.prompt')}</p>
      <div className="toggle-row">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void turnOn()}>
          {t('push.turnOn')}
        </button>
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => close(true)}>
          {t('push.notNow')}
        </button>
      </div>
    </section>
  );
}
