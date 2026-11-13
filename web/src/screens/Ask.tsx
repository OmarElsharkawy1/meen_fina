import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { MIN_MEMBERS_TO_ASK, QUESTION_MAX_LEN } from '@shared/constants';
import { api, reasonOf } from '../api';
import { useAuth } from '../auth/AuthProvider';
import { Screen } from '../components/Screen';
import { useGroup } from '../data/useGroup';
import { errorKey } from '../lib/errors';

export function Ask() {
  const { t } = useTranslation();
  const { groupId = '' } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { group, loading } = useGroup(user ? groupId : undefined);
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const back = `/g/${groupId}`;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { questionId } = await api.askQuestion({ groupId, text: trimmed });
      navigate(`/g/${groupId}/q/${questionId}`, { replace: true });
    } catch (err) {
      setError(t(errorKey(reasonOf(err))));
      setBusy(false);
    }
  }

  if (authLoading || loading) {
    return (
      <Screen title={t('screens.ask')} back={back}>
        <span className="skeleton" style={{ blockSize: 120 }} />
      </Screen>
    );
  }
  const tooFew = group ? group.memberUids.length < MIN_MEMBERS_TO_ASK : false;

  return (
    <Screen title={t('screens.ask')} back={back}>
      {!group ? (
        <p role="alert" className="error">
          {t('errors.not-member')}
        </p>
      ) : tooFew ? (
        <p className="muted">{t('group.askNeedsMembers', { min: MIN_MEMBERS_TO_ASK })}</p>
      ) : (
        <form className="stack" onSubmit={(e) => void onSubmit(e)}>
          <label className="field">
            <span>{t('ask.label')}</span>
            <textarea
              className="input textarea"
              dir="auto"
              rows={4}
              value={text}
              maxLength={QUESTION_MAX_LEN}
              placeholder={t('ask.placeholder')}
              onChange={(e) => setText(e.target.value)}
              autoFocus
            />
          </label>
          <span className="muted counter">{t('ask.counter', { n: text.length, max: QUESTION_MAX_LEN })}</span>
          {error ? (
            <p role="alert" className="error">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary" disabled={busy || !text.trim()}>
            {t('ask.submit')}
          </button>
        </form>
      )}
    </Screen>
  );
}
