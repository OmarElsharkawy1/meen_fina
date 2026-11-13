import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { currentPushSupport } from '../lib/platform';
import { enablePush } from './enablePush';
import { IosInstallGuide } from './IosInstallGuide';
import { clearPushDismissed } from './pushFlag';

type State = 'default' | 'granted' | 'denied';

function permission(): State {
  return typeof Notification === 'undefined' ? 'default' : Notification.permission;
}

/** Settings row to (re)enable notifications, since the in-context prompt is one-shot. */
export function NotificationsRow({ uid }: { uid: string }) {
  const { t } = useTranslation();
  const [support] = useState(currentPushSupport);
  const [state, setState] = useState<State>(permission);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);

  if (support === 'unsupported') return null;

  async function turnOn() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    clearPushDismissed();
    try {
      await enablePush(uid);
    } catch (err) {
      console.error('enablePush failed', err);
      setFailed(true);
    }
    setState(permission());
    setBusy(false);
  }

  return (
    <section className="stack">
      <h2>{t('push.settingsTitle')}</h2>
      {support === 'needs-install' ? (
        guideOpen ? <IosInstallGuide onClose={() => setGuideOpen(false)} /> : null
      ) : state === 'granted' ? (
        <p>{t('push.on')}</p>
      ) : state === 'denied' ? (
        <p className="muted">{t('push.blocked')}</p>
      ) : (
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void turnOn()}>
          {t('push.turnOn')}
        </button>
      )}
      {failed ? (
        <p role="alert" className="error">
          {t('push.failed')}
        </p>
      ) : null}
    </section>
  );
}
