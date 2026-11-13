import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Screen } from '../components/Screen';
import { setLang } from '../data/useProfile';
import type { Lang } from '../lib/lang';
import { NotificationsRow } from '../push/NotificationsRow';

export function Settings() {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const current: Lang = i18n.language.startsWith('ar') ? 'ar' : 'en';

  async function pick(lang: Lang) {
    if (lang === current) return;
    setError(false);
    try {
      await setLang(lang);
    } catch (err) {
      console.error('setLang failed', err);
      setError(true);
    }
  }

  async function out() {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (err) {
      console.error('signOut failed', err);
      setError(true);
      setBusy(false);
    }
  }

  return (
    <Screen back="/" title={t('screens.settings')}>
      <section className="stack">
        <h2>{t('settings.language')}</h2>
        <div className="toggle-row">
          {(['en', 'ar'] as const).map((l) => (
            <button
              key={l}
              type="button"
              className={current === l ? 'btn btn-primary' : 'btn btn-secondary'}
              aria-pressed={current === l}
              onClick={() => void pick(l)}
            >
              {t(l === 'en' ? 'settings.english' : 'settings.arabic')}
            </button>
          ))}
        </div>
      </section>
      {user ? <NotificationsRow uid={user.uid} /> : null}
      {error ? (
        <p role="alert" className="error">
          {t('errors.unknown')}
        </p>
      ) : null}
      {user ? (
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void out()}>
          {t('auth.signOut')}
        </button>
      ) : null}
    </Screen>
  );
}
