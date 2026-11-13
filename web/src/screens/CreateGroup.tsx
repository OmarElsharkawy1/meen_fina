import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { GROUP_NAME_MAX_LEN } from '@shared/constants';
import { api, reasonOf } from '../api';
import { SignInButton } from '../auth/SignInButton';
import { useAuth } from '../auth/AuthProvider';
import { Screen } from '../components/Screen';
import { errorKey } from '../lib/errors';

export function CreateGroup() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { groupId } = await api.createGroup({ name: trimmed });
      navigate(`/g/${groupId}`, { replace: true });
    } catch (err) {
      setError(t(errorKey(reasonOf(err))));
      setBusy(false);
    }
  }

  return (
    <Screen title={t('screens.createGroup')} back="/">
      {loading ? (
        <span className="skeleton" style={{ blockSize: 96 }} />
      ) : !user ? (
        <div className="stack">
          <p className="muted">{t('auth.signInRequired')}</p>
          <SignInButton />
        </div>
      ) : (
        <form className="stack" onSubmit={(e) => void onSubmit(e)}>
          <label className="field">
            <span>{t('create.nameLabel')}</span>
            <input
              className="input"
              value={name}
              maxLength={GROUP_NAME_MAX_LEN}
              placeholder={t('create.namePlaceholder')}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>
          {error ? (
            <p role="alert" className="error">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
            {t('create.submit')}
          </button>
        </form>
      )}
    </Screen>
  );
}
