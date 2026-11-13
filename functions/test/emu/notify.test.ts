import { Timestamp } from 'firebase-admin/firestore';
import { beforeEach, describe, expect, it } from 'vitest';
import { pushForQuestionChange, type MulticastLike, type SendResult } from '../../src/notify/notify';
import type { QuestionDoc } from '../../src/shared/types';
import { clearFirestore, db, seedGroup } from './helpers';

beforeEach(clearFirestore);

const ORIGIN = 'https://meenfina.example';

function q(status: QuestionDoc['status'], eligible = ['a', 'b', 'c']): QuestionDoc {
  return {
    text: 'Who snores?',
    askerUid: 'a',
    createdAt: Timestamp.now(),
    people: {},
    eligibleUids: eligible,
    votedUids: [],
    status,
    closedAt: null,
    results: null,
  };
}

async function seedUser(uid: string, data: Record<string, unknown> = {}) {
  await db()
    .doc(`users/${uid}`)
    .set({
      displayName: uid,
      photoURL: null,
      lang: 'en',
      fcmTokens: [`tok-${uid}`],
      mutedGroupIds: [],
      ...data,
    });
}

function fake(failFor: Record<string, string> = {}) {
  const sent: MulticastLike[] = [];
  const send = async (msg: MulticastLike): Promise<SendResult> => {
    sent.push(msg);
    return {
      responses: msg.tokens.map((t) =>
        failFor[t] ? { success: false, error: { code: failFor[t] } } : { success: true },
      ),
    };
  };
  return { sent, deps: { db: db(), send, appOrigin: ORIGIN } };
}

describe('pushForQuestionChange', () => {
  beforeEach(async () => {
    await seedGroup({ groupId: 'g1', name: 'Dahab', memberUids: ['a', 'b', 'c'] });
    for (const u of ['a', 'b', 'c']) await seedUser(u);
  });

  it('new question skips asker and muted users', async () => {
    await seedUser('b', { mutedGroupIds: ['g1'] });
    const { sent, deps } = fake();
    const r = await pushForQuestionChange(deps, 'g1', 'q1', null, q('open'));
    expect(r.sentTo).toEqual(['c']);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toEqual({
      tokens: ['tok-c'],
      webpush: {
        notification: { title: 'Dahab: new question', body: 'Who snores?', icon: '/icons/icon-192.png' },
        fcmOptions: { link: `${ORIGIN}/g/g1/q/q1` },
      },
      data: { groupId: 'g1', questionId: 'q1', link: `${ORIGIN}/g/g1/q/q1` },
    });
  });

  it('reveal notifies all eligible including asker', async () => {
    const { deps } = fake();
    const r = await pushForQuestionChange(deps, 'g1', 'q1', q('open'), q('revealed'));
    expect(r.sentTo).toContain('a');
    expect([...r.sentTo].sort()).toEqual(['a', 'b', 'c']);
  });

  it('open to expired sends nothing', async () => {
    const { sent, deps } = fake();
    expect((await pushForQuestionChange(deps, 'g1', 'q1', q('open'), q('expired'))).sentTo).toEqual([]);
    expect((await pushForQuestionChange(deps, 'g1', 'q1', q('open'), null)).sentTo).toEqual([]);
    expect(sent).toHaveLength(0);
  });

  it('removes unregistered tokens only', async () => {
    await seedUser('c', { fcmTokens: ['good', 'dead', 'bad'] });
    const { deps } = fake({
      dead: 'messaging/registration-token-not-registered',
      bad: 'messaging/invalid-registration-token',
    });
    await pushForQuestionChange(deps, 'g1', 'q1', null, q('open'));
    expect((await db().doc('users/c').get()).data()?.fcmTokens).toEqual(['good']);
  });

  it('keeps tokens on other errors', async () => {
    const { deps } = fake({ 'tok-c': 'messaging/internal-error' });
    await pushForQuestionChange(deps, 'g1', 'q1', null, q('open'));
    expect((await db().doc('users/c').get()).data()?.fcmTokens).toEqual(['tok-c']);
  });

  it('uses Arabic for lang ar, English for unknown lang', async () => {
    await seedUser('b', { lang: 'ar' });
    await seedUser('c', { lang: 'fr' });
    const { sent, deps } = fake();
    await pushForQuestionChange(deps, 'g1', 'q1', null, q('open'));
    const byTok = Object.fromEntries(sent.map((m) => [m.tokens[0], m.webpush.notification.title]));
    expect(byTok['tok-b']).toBe('Dahab: سؤال جديد');
    expect(byTok['tok-c']).toBe('Dahab: new question');
  });

  it('ignores malformed, tokenless and missing user docs', async () => {
    await seedUser('b', { fcmTokens: 'oops' });
    await db().doc('users/c').delete();
    const { sent, deps } = fake();
    expect((await pushForQuestionChange(deps, 'g1', 'q1', null, q('open'))).sentTo).toEqual([]);
    await seedUser('b', { fcmTokens: [] });
    expect((await pushForQuestionChange(deps, 'g1', 'q1', null, q('open'))).sentTo).toEqual([]);
    expect(sent).toHaveLength(0);
  });

  it('non-array mutedGroupIds is treated as empty', async () => {
    await seedUser('b', { mutedGroupIds: 'g1' });
    const { deps } = fake();
    const r = await pushForQuestionChange(deps, 'g1', 'q1', null, q('open'));
    expect(r.sentTo).toContain('b');
  });

  it('missing group sends nothing', async () => {
    const { sent, deps } = fake();
    const r = await pushForQuestionChange(deps, 'gone', 'q1', null, q('open'));
    expect(r.sentTo).toEqual([]);
    expect(sent).toHaveLength(0);
  });
});
