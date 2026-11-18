import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { MIN_MEMBERS_TO_ASK } from '@shared/constants';
import { SignInButton } from '../auth/SignInButton';
import { useAuth } from '../auth/AuthProvider';
import { CheckIcon, DotIcon, SettingsIcon } from '../components/icons';
import { Screen } from '../components/Screen';
import { useGroup } from '../data/useGroup';
import { useQuestions, type QuestionWithId } from '../data/useQuestions';
import { isolate } from '../lib/bidi';
import { rankLeaderboard } from '../lib/leaderboard';
import { PushPrompt } from '../push/PushPrompt';
import { clearAskPush, peekAskPush } from '../push/pushFlag';

function closedAtMs(q: QuestionWithId): number {
  return (q.closedAt ?? q.createdAt)?.toMillis() ?? 0;
}

function TopLine({ q }: { q: QuestionWithId }) {
  const { t } = useTranslation();
  const nameOf = (uid: string) => q.people[uid]?.name ?? '?';
  if (q.status === 'expired') return <span className="muted">{t('question.expired')}</span>;
  if (q.results?.mode === 'winners') {
    return (
      <span dir="auto">
        {t('group.winnerLine', { name: q.results.winnerUids.map((u) => isolate(nameOf(u))).join(', ') })}
      </span>
    );
  }
  if (q.results?.mode === 'full') {
    const top = rankLeaderboard(q.results.totals).filter((r) => r.isTop);
    if (top.length > 0) {
      return (
        <span dir="auto">
          {t('group.topLine', {
            name: top.map((r) => nameOf(r.uid)).join(', '),
            votes: t('question.votes', { count: top[0].votes }),
          })}
        </span>
      );
    }
  }
  return null;
}

/** An open question: who asked, progress, your vote status and the matching action. */
function OpenCard({ q, groupId, uid, askerName }: { q: QuestionWithId; groupId: string; uid: string; askerName: string }) {
  const { t } = useTranslation();
  const eligible = q.eligibleUids.includes(uid);
  const voted = q.votedUids.includes(uid);
  return (
    <li className="card stack">
      <strong dir="auto">{q.text}</strong>
      <span className="muted">
        {t('group.askedBy', { name: isolate(askerName) })}
        {' · '}
        {t('group.voted', { voted: q.votedUids.length, total: q.eligibleUids.length })}
      </span>
      {eligible ? (
        <span className={voted ? 'vote-status vote-status-done' : 'vote-status vote-status-todo'}>
          {voted ? <CheckIcon /> : <DotIcon />}
          {t(voted ? 'group.youVoted' : 'group.notVotedYet')}
        </span>
      ) : (
        <span className="muted">{t('question.notEligible')}</span>
      )}
      <Link to={`/g/${groupId}/q/${q.id}`} className={eligible && !voted ? 'btn btn-primary' : 'btn btn-secondary'}>
        {t(!eligible ? 'group.view' : voted ? 'group.changeVote' : 'group.vote')}
      </Link>
    </li>
  );
}

export function Group() {
  const { t } = useTranslation();
  const { groupId = '' } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { group, loading: groupLoading } = useGroup(user ? groupId : undefined);
  const { questions, loading: qLoading } = useQuestions(group ? groupId : undefined);
  const [askPush, setAskPush] = useState(peekAskPush);
  // Consume the one-shot flag as soon as it has been read.
  useEffect(() => clearAskPush(), []);

  if (authLoading || (user && groupLoading)) {
    return (
      <Screen back="/">
        <div className="stack" aria-busy="true">
          <span className="skeleton" style={{ blockSize: 40 }} />
          <span className="skeleton" style={{ blockSize: 88 }} />
          <span className="skeleton" style={{ blockSize: 88 }} />
        </div>
      </Screen>
    );
  }
  if (!user) {
    return (
      <Screen back="/">
        <p className="muted">{t('auth.signInRequired')}</p>
        <SignInButton />
      </Screen>
    );
  }
  if (!group) {
    return (
      <Screen back="/">
        <p role="alert" className="error">
          {t('errors.not-member')}
        </p>
      </Screen>
    );
  }

  const open = questions.filter((q) => q.status === 'open');
  const yourTurn = open.filter((q) => q.eligibleUids.includes(user.uid) && !q.votedUids.includes(user.uid));
  const waiting = open.filter((q) => !yourTurn.includes(q));
  const closed = questions
    .filter((q) => q.status !== 'open')
    .sort((a, b) => closedAtMs(b) - closedAtMs(a));
  const canAsk = group.memberUids.length >= MIN_MEMBERS_TO_ASK;
  const askerName = (q: QuestionWithId) =>
    q.people[q.askerUid]?.name ?? group.members[q.askerUid]?.name ?? '?';

  return (
    <Screen back="/">
      <div className="title-row">
        <h1 dir="auto">{group.name}</h1>
        <Link to={`/g/${groupId}/settings`} className="icon-link" aria-label={t('screens.groupSettings')}>
          <SettingsIcon />
        </Link>
      </div>
      <p className="muted">{t('home.members', { count: group.memberUids.length })}</p>
      {askPush ? (
        <PushPrompt
          uid={user.uid}
          onDone={() => {
            clearAskPush();
            setAskPush(false);
          }}
        />
      ) : null}
      {canAsk ? (
        <Link to={`/g/${groupId}/ask`} className="btn btn-primary">
          {t('group.ask')}
        </Link>
      ) : (
        <div className="stack">
          <button type="button" className="btn btn-primary" disabled>
            {t('group.ask')}
          </button>
          <p className="muted">{t('group.askNeedsMembers', { min: MIN_MEMBERS_TO_ASK })}</p>
        </div>
      )}

      {qLoading ? (
        <div className="stack" aria-busy="true">
          <span className="skeleton" style={{ blockSize: 88 }} />
          <span className="skeleton" style={{ blockSize: 88 }} />
        </div>
      ) : questions.length === 0 ? (
        <p className="muted">{t('group.noQuestions')}</p>
      ) : (
        <>
          {yourTurn.length > 0 ? (
            <section className="stack" aria-labelledby="sec-your-turn">
              <h2 id="sec-your-turn">
                {t('group.yourTurn')} <span className="count">{yourTurn.length}</span>
              </h2>
              <ul className="stack list">
                {yourTurn.map((q) => (
                  <OpenCard key={q.id} q={q} groupId={groupId} uid={user.uid} askerName={askerName(q)} />
                ))}
              </ul>
            </section>
          ) : null}
          {waiting.length > 0 ? (
            <section className="stack" aria-labelledby="sec-waiting">
              <h2 id="sec-waiting">
                {t('group.waiting')} <span className="count">{waiting.length}</span>
              </h2>
              <ul className="stack list">
                {waiting.map((q) => (
                  <OpenCard key={q.id} q={q} groupId={groupId} uid={user.uid} askerName={askerName(q)} />
                ))}
              </ul>
            </section>
          ) : null}
          {closed.length > 0 ? (
            <section className="stack" aria-labelledby="sec-results">
              <h2 id="sec-results">
                {t('group.results')} <span className="count">{closed.length}</span>
              </h2>
              <ul className="stack list">
                {closed.map((q) => (
                  <li key={q.id}>
                    <Link to={`/g/${groupId}/q/${q.id}`} className="card group-row">
                      <strong dir="auto">{q.text}</strong>
                      <TopLine q={q} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </Screen>
  );
}
