import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { DISPLAY_NAME_MAX_LEN } from '@shared/constants';
import { api, reasonOf } from '../api';
import { useProfile } from '../data/useProfile';
import { errorKey } from '../lib/errors';

/** Settings section to change the name other members see. */
export function NameRow({ fallbackName }: { fallbackName: string }) {
  const { t } = useTranslation();
  const profile = useProfile();
  const saved = profile?.displayName || fallbackName;
  const [name, setName] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Follow the saved name when it loads or changes elsewhere.
  useEffect(() => setName(saved), [saved]);

  const trimmed = name.replace(/\s+/g, ' ').trim();
  const canSave = !busy && trimmed.length > 0 && trimmed !== saved;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setBusy(true);
    setDone(false);
    setError(null);
    try {
      await api.setDisplayName({ name: trimmed });
      setDone(true);
    } catch (err) {
      setError(t(errorKey(reasonOf(err))));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={(e) => void save(e)}>
      <h2 id="your-name-title">{t('settings.yourName')}</h2>
      <input
        className="input"
        aria-labelledby="your-name-title"
        dir="auto"
        autoComplete="nickname"
        maxLength={DISPLAY_NAME_MAX_LEN}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setDone(false);
        }}
      />
      <p className="muted">{t('settings.yourNameHint')}</p>
      <button type="submit" className="btn btn-secondary" disabled={!canSave}>
        {t('settings.saveName')}
      </button>
      {done ? (
        <p role="status" className="success">
          {t('settings.nameSaved')}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
