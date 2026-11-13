import { arrayRemove, arrayUnion, doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { api, reasonOf } from '../api';
import { useAuth } from '../auth/AuthProvider';
import { Avatar } from '../components/Avatar';
import { Screen } from '../components/Screen';
import { useBanned } from '../data/useBanned';
import { useGroup } from '../data/useGroup';
import { useProfile } from '../data/useProfile';
import { db } from '../firebase';
import { errorKey } from '../lib/errors';
import { shareLink, whatsappShareUrl } from '../lib/share';

type Confirm = { kind: 'kick' | 'admin'; uid: string } | { kind: 'regen' } | null;

export function GroupSettings() {
  const { t } = useTranslation();
  const { groupId = '' } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const uid = user?.uid;
  const { group, loading } = useGroup(uid ? groupId : undefined);
  const profile = useProfile();
  const isAdmin = !!uid && group?.adminUid === uid;
  const banned = useBanned(isAdmin ? groupId : undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [copied, setCopied] = useState(false);
  const back = `/g/${groupId}`;

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      setConfirm(null);
    } catch (err) {
      setError(t(errorKey(reasonOf(err))));
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || (uid && loading)) {
    return (
      <Screen back={back}>
        <div className="stack" aria-busy="true">
          <span className="skeleton" style={{ blockSize: 40 }} />
          <span className="skeleton" style={{ blockSize: 120 }} />
          <span className="skeleton" style={{ blockSize: 160 }} />
        </div>
      </Screen>
    );
  }
  if (!user || !group) {
    return (
      <Screen back="/">
        <p role="alert" className="error">
          {t(user ? 'errors.not-member' : 'auth.signInRequired')}
        </p>
      </Screen>
    );
  }

  const muted = profile?.mutedGroupIds?.includes(groupId) ?? false;
  const link = shareLink(window.location.origin, group.code);
  const shareText = t('settings.shareText', { name: group.name, link });
  const memberIds = Object.keys(group.members).sort((a, b) =>
    a === group.adminUid ? -1 : b === group.adminUid ? 1 : a.localeCompare(b),
  );
  const showShare = group.codeActive || isAdmin;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t('errors.unknown'));
    }
  }

  async function share() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: t('appName'), text: shareText, url: link });
      } catch {
        // user dismissed the share sheet
      }
    } else {
      window.open(whatsappShareUrl(shareText), '_blank', 'noopener');
    }
  }

  function confirmBlock(question: string, label: string, onYes: () => void) {
    return (
      <div className="stack">
        <p>{question}</p>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={onYes}>
          {label}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setConfirm(null)}>
          {t('common.cancel')}
        </button>
      </div>
    );
  }

  return (
    <Screen back={back} title={t('screens.groupSettings')}>
      <h2 dir="auto">{group.name}</h2>

      <section className="stack">
        <h3>{t('settings.code')}</h3>
        <div className="card stack">
          <span className={group.codeActive ? 'code' : 'code code-off'} dir="ltr">
            {group.code}
          </span>
          {!group.codeActive ? <p className="muted">{t('settings.codeOff')}</p> : null}
          <span className="muted code-link" dir="ltr">
            {link}
          </span>
          {showShare ? (
            <div className="toggle-row">
              <button type="button" className="btn btn-secondary" onClick={() => void copyLink()}>
                {t(copied ? 'settings.copied' : 'settings.copyLink')}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void share()}>
                {t('common.share')}
              </button>
            </div>
          ) : null}
        </div>
        {isAdmin ? (
          <>
            <button
              type="button"
              className="btn btn-secondary"
              aria-pressed={group.codeActive}
              disabled={busy}
              onClick={() => void run(() => api.setCodeActive({ groupId, active: !group.codeActive }))}
            >
              {t(group.codeActive ? 'settings.turnOff' : 'settings.turnOn')}
            </button>
            {confirm?.kind === 'regen' ? (
              confirmBlock(t('settings.regenerateConfirm'), t('settings.regenerate'), () =>
                void run(async () => {
                  await api.regenerateCode({ groupId });
                }),
              )
            ) : (
              <button type="button" className="btn btn-secondary" onClick={() => setConfirm({ kind: 'regen' })}>
                {t('settings.regenerate')}
              </button>
            )}
          </>
        ) : null}
      </section>

      <section className="stack">
        <h3>{t('settings.members')}</h3>
        <ul className="stack list">
          {memberIds.map((m) => {
            const person = group.members[m];
            const self = m === uid;
            const pending = confirm && 'uid' in confirm && confirm.uid === m ? confirm : null;
            return (
              <li key={m} className="card stack">
                <div className="member-row">
                  <Avatar uid={m} person={person} size={40} />
                  <span dir="auto" className="member-name">
                    {person.name}
                  </span>
                  {m === group.adminUid ? <span className="badge">{t('settings.admin')}</span> : null}
                </div>
                {isAdmin && !self ? (
                  pending?.kind === 'kick' ? (
                    confirmBlock(t('settings.kickConfirm', { name: person.name }), t('settings.kick'), () =>
                      void run(() => api.kickMember({ groupId, uid: m })),
                    )
                  ) : pending?.kind === 'admin' ? (
                    confirmBlock(t('settings.makeAdminConfirm', { name: person.name }), t('settings.makeAdmin'), () =>
                      void run(() => api.transferAdmin({ groupId, uid: m })),
                    )
                  ) : (
                    <div className="toggle-row">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setConfirm({ kind: 'admin', uid: m })}
                      >
                        {t('settings.makeAdmin')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setConfirm({ kind: 'kick', uid: m })}
                      >
                        {t('settings.kick')}
                      </button>
                    </div>
                  )
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {isAdmin && banned.length > 0 ? (
        <section className="stack">
          <h3>{t('settings.removed')}</h3>
          <ul className="stack list">
            {banned.map((b) => (
              <li key={b.id} className="card member-row">
                <Avatar uid={b.id} person={b} size={40} />
                <span dir="auto" className="member-name">
                  {b.name}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => void run(() => api.unbanMember({ groupId, uid: b.id }))}
                >
                  {t('settings.allowBack')}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <button
        type="button"
        className="btn btn-secondary"
        aria-pressed={muted}
        disabled={busy}
        onClick={() =>
          void run(() =>
            setDoc(
              doc(db, 'users', user.uid),
              { mutedGroupIds: muted ? arrayRemove(groupId) : arrayUnion(groupId) },
              { merge: true },
            ),
          )
        }
      >
        {t(muted ? 'settings.unmute' : 'settings.mute')}
      </button>

      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}

      {confirmLeave ? (
        <div className="stack">
          <p>{t('settings.leaveConfirm')}</p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await api.leaveGroup({ groupId });
                navigate('/', { replace: true });
              })
            }
          >
            {t('settings.leave')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setConfirmLeave(false)}>
            {t('common.cancel')}
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-secondary" onClick={() => setConfirmLeave(true)}>
          {t('settings.leave')}
        </button>
      )}
    </Screen>
  );
}
