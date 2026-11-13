import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import type { PreviewGroupOutput } from '@shared/types';
import { api, reasonOf } from '../api';
import { useAuth } from '../auth/AuthProvider';
import { Screen } from '../components/Screen';
import { errorKey } from '../lib/errors';
import { clearPendingJoin, setPendingJoin } from '../lib/pendingJoin';
import { markAskPush } from '../push/pushFlag';

export function JoinLink() {
  const { t } = useTranslation();
  const { code = '' } = useParams();
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<PreviewGroupOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const actionRef = useRef<HTMLButtonElement>(null);
  const uid = user?.uid;

  // Wait for auth to settle so `alreadyMember` reflects the signed-in user.
  useEffect(() => {
    if (loading) return;
    if (uid) clearPendingJoin();
    let active = true;
    setPreview(null);
    setError(null);
    api
      .previewGroup({ code })
      .then((p) => {
        if (!active) return;
        if (p.alreadyMember) {
          clearPendingJoin();
          navigate(`/g/${p.groupId}`, { replace: true });
        } else {
          setPreview(p);
        }
      })
      .catch((err) => {
        if (!active) return;
        clearPendingJoin();
        setError(t(errorKey(reasonOf(err))));
      });
    return () => {
      active = false;
    };
  }, [code, loading, uid, navigate]);

  useEffect(() => {
    if (preview) actionRef.current?.focus();
  }, [preview, user]);

  async function onSignIn() {
    setPendingJoin(code);
    await signIn();
  }

  async function onJoin() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { groupId } = await api.joinGroup({ code });
      clearPendingJoin();
      markAskPush(); // Group screen shows the push prompt once
      navigate(`/g/${groupId}`, { replace: true });
    } catch (err) {
      setError(t(errorKey(reasonOf(err))));
      setBusy(false);
    }
  }

  return (
    <Screen title={t('screens.joinLink')} back="/">
      {error && !preview ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : !preview ? (
        <div className="stack" aria-busy="true">
          <span className="skeleton" style={{ blockSize: 72 }} />
          <span className="skeleton" style={{ blockSize: 44 }} />
        </div>
      ) : (
        <div className="stack">
          <div className="card">
            <strong>{preview.name}</strong>
            <div className="muted">{t('home.members', { count: preview.memberCount })}</div>
          </div>
          {error ? (
            <p role="alert" className="error">
              {error}
            </p>
          ) : null}
          {user ? (
            <button
              ref={actionRef}
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void onJoin()}
            >
              {t('join.join')}
            </button>
          ) : (
            <button
              ref={actionRef}
              type="button"
              className="btn btn-primary"
              onClick={() => void onSignIn()}
            >
              {t('auth.signIn')}
            </button>
          )}
        </div>
      )}
    </Screen>
  );
}
