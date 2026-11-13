import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { MIN_VOTES_TO_REVEAL } from '@shared/constants';
import { api, reasonOf } from '../api';
import { useAuth } from '../auth/AuthProvider';
import { SignInButton } from '../auth/SignInButton';
import { Avatar } from '../components/Avatar';
import { Leaderboard } from '../components/Leaderboard';
import { MemberGrid } from '../components/MemberGrid';
import { Screen } from '../components/Screen';
import { WinnersCard } from '../components/WinnersCard';
import { useGroup } from '../data/useGroup';
import { useQuestion } from '../data/useQuestions';
import { errorKey } from '../lib/errors';
import { PushPrompt } from '../push/PushPrompt';

const CONFETTI = ['🎉', '✨', '🎊', '⭐', '🎉', '✨', '🎊', '⭐'];

export function Question() {
  const { t } = useTranslation();
  const { groupId = '', questionId = '' } = useParams();
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid;
  const navigate = useNavigate();
  const { group } = useGroup(uid ? groupId : undefined);
  const { question, loading } = useQuestion(uid ? groupId : undefined, questionId);
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [askPush, setAskPush] = useState(false);
  const prevStatus = useRef<{ id: string; status: string | null } | null>(null);
  const back = `/g/${groupId}`;
  const status = question?.status ?? null;

  // A different question starts with a clean local pick.
  useEffect(() => {
    setPick(null);
    setAskPush(false);
  }, [questionId]);

  // Celebrate when a question we were watching flips open -> revealed (<= 1s total).
  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = { id: questionId, status };
    if (prev?.id === questionId && prev.status === 'open' && status === 'revealed') {
      setCelebrate(true);
      const id = window.setTimeout(() => setCelebrate(false), 1000);
      return () => window.clearTimeout(id);
    }
  }, [questionId, status]);

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(t(errorKey(reasonOf(err))));
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || loading) {
    return (
      <Screen back={back}>
        <div className="stack" aria-busy="true">
          <span className="skeleton" style={{ blockSize: 72 }} />
          <span className="skeleton" style={{ blockSize: 160 }} />
        </div>
      </Screen>
    );
  }
  if (!user) {
    return (
      <Screen back={back}>
        <p className="muted">{t('auth.signInRequired')}</p>
        <SignInButton />
      </Screen>
    );
  }
  if (!question) {
    return (
      <Screen back={back}>
        <p role="alert" className="error">
          {t('errors.not-found')}
        </p>
      </Screen>
    );
  }

  const isEligible = question.eligibleUids.includes(user.uid);
  const hasVoted = question.votedUids.includes(user.uid);
  const canManage = question.askerUid === user.uid || group?.adminUid === user.uid;
  const votedCount = question.votedUids.length;
  const pending = question.eligibleUids.filter((u) => !question.votedUids.includes(u));
  const candidates = question.eligibleUids.filter((u) => u !== user.uid);
  const results = question.results;

  return (
    <Screen back={back}>
      <h1 dir="auto">{question.text}</h1>
      <p className="muted">
        {t('group.askedBy', { name: question.people[question.askerUid]?.name ?? '?' })}
      </p>

      {question.status === 'open' ? (
        <div className="stack">
          {isEligible ? (
            <>
              <p>{t(hasVoted || pick ? 'question.changeVote' : 'question.tapToVote')}</p>
              <MemberGrid
                uids={candidates}
                people={question.people}
                selected={pick}
                disabled={busy}
                onPick={(target) =>
                  void run(async () => {
                    await api.castVote({ groupId, questionId, targetUid: target });
                    setPick(target);
                    if (!hasVoted) setAskPush(true);
                  })
                }
              />
            </>
          ) : (
            <p className="card">{t('question.notEligible')}</p>
          )}
          <p className="muted" aria-live="polite">
            {t('group.voted', { voted: votedCount, total: question.eligibleUids.length })}
          </p>
          {pending.length > 0 ? (
            <div className="stack">
              <span className="muted">{t('question.waitingOn')}</span>
              <div className="avatar-row">
                {pending.map((u) => (
                  <Avatar key={u} uid={u} person={question.people[u] ?? { name: '?', photoURL: null }} size={32} />
                ))}
              </div>
            </div>
          ) : null}
          {canManage ? (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy || votedCount < MIN_VOTES_TO_REVEAL}
                onClick={() => void run(() => api.revealQuestion({ groupId, questionId }))}
              >
                {t('question.reveal')}
              </button>
              {votedCount < MIN_VOTES_TO_REVEAL ? (
                <p className="muted">{t('question.revealNeedsVotes', { min: MIN_VOTES_TO_REVEAL })}</p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : question.status === 'revealed' && results ? (
        <div className={celebrate ? 'results celebrate' : 'results'}>
          {celebrate ? (
            <div className="confetti" aria-hidden="true">
              {CONFETTI.map((c, i) => (
                <span key={i} style={{ '--i': i } as CSSProperties}>
                  {c}
                </span>
              ))}
            </div>
          ) : null}
          {results.mode === 'full' ? (
            <Leaderboard totals={results.totals} people={question.people} />
          ) : (
            <WinnersCard winnerUids={results.winnerUids} people={question.people} />
          )}
        </div>
      ) : (
        <p className="card">{t('question.expired')}</p>
      )}

      {askPush ? <PushPrompt uid={user.uid} onDone={() => setAskPush(false)} /> : null}

      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}

      {canManage ? (
        confirmDelete ? (
          <div className="stack">
            <p>{t('question.deleteConfirm')}</p>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await api.deleteQuestion({ groupId, questionId });
                  navigate(back, { replace: true });
                })
              }
            >
              {t('question.delete')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>
              {t('common.cancel')}
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete(true)}>
            {t('question.delete')}
          </button>
        )
      ) : null}
    </Screen>
  );
}
