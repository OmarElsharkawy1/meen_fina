import { Timestamp } from 'firebase-admin/firestore';
import { beforeEach, describe, expect, it } from 'vitest';
import { expireOldQuestions, expireQuestionIfOpen } from '../../src/handlers/expiry';
import { AUTO_REVEAL_MS } from '../../src/shared/constants';
import type { QuestionDoc } from '../../src/shared/types';
import { clearFirestore, db, seedGroup } from './helpers';

beforeEach(clearFirestore);

const FIVE = ['a', 'b', 'c', 'd', 'e'];
const HOUR = 3600 * 1000;

async function seedQuestion(
  qid: string,
  ageHours: number,
  votes: Array<[string, string]>,
  opts: { status?: QuestionDoc['status']; eligibleUids?: string[] } = {},
) {
  const eligibleUids = opts.eligibleUids ?? FIVE;
  const q: QuestionDoc = {
    text: 'Who?',
    askerUid: 'a',
    createdAt: Timestamp.fromMillis(Date.now() - ageHours * HOUR),
    people: Object.fromEntries(eligibleUids.map((u) => [u, { name: u, photoURL: null }])),
    eligibleUids,
    votedUids: votes.map(([v]) => v),
    status: opts.status ?? 'open',
    closedAt: null,
    results: null,
  };
  await db().doc(`groups/g1/questions/${qid}`).set(q);
  for (const [voterUid, targetUid] of votes) {
    await db()
      .doc(`votes/${qid}_${voterUid}`)
      .set({ groupId: 'g1', questionId: qid, voterUid, targetUid });
  }
}

async function getQ(qid: string) {
  return (await db().doc(`groups/g1/questions/${qid}`).get()).data() as QuestionDoc;
}

describe('expireOldQuestions', () => {
  it('reveals with 3 valid votes, expires with 2, leaves young ones alone', async () => {
    await seedGroup({ adminUid: 'a', memberUids: FIVE });
    await seedQuestion('rev', 49, [['a', 'b'], ['b', 'c'], ['c', 'a']]);
    await seedQuestion('exp', 49, [['a', 'b'], ['b', 'c']]);
    await seedQuestion('young', 47, [['a', 'b'], ['b', 'c'], ['c', 'a']]);

    const res = await expireOldQuestions(db(), Timestamp.now());

    expect(res).toEqual({ revealed: 1, expired: 1, failed: 0 });
    const rev = await getQ('rev');
    expect(rev.status).toBe('revealed');
    expect(rev.results).not.toBeNull();
    expect(rev.closedAt).not.toBeNull();
    const exp = await getQ('exp');
    expect(exp.status).toBe('expired');
    expect(exp.results).toBeNull();
    expect((await getQ('young')).status).toBe('open');
  });

  it('decides by valid votes: 3 voters but only 2 valid -> expired', async () => {
    await seedGroup({ adminUid: 'a', memberUids: FIVE });
    // 'x' was removed from eligibleUids; its vote is void.
    await seedQuestion('q', 49, [['a', 'b'], ['b', 'c'], ['x', 'a']]);
    const res = await expireOldQuestions(db(), Timestamp.now());
    expect(res).toEqual({ revealed: 0, expired: 1, failed: 0 });
    expect((await getQ('q')).status).toBe('expired');
  });

  it('leaves already-closed old questions untouched', async () => {
    await seedGroup({ adminUid: 'a', memberUids: FIVE });
    await seedQuestion('old', 60, [['a', 'b'], ['b', 'c'], ['c', 'a']], { status: 'revealed' });
    const before = await getQ('old');
    const res = await expireOldQuestions(db(), Timestamp.now());
    expect(res).toEqual({ revealed: 0, expired: 0, failed: 0 });
    expect(await getQ('old')).toEqual(before);
  });

  it('does not throw when a question vanishes before its transaction', async () => {
    const ref = db().doc('groups/g1/questions/gone');
    await expect(expireQuestionIfOpen(db(), ref, Timestamp.now())).resolves.toBeNull();
  });

  it('skips a question that is no longer open when its transaction runs', async () => {
    await seedGroup({ adminUid: 'a', memberUids: FIVE });
    await seedQuestion('q', 49, [['a', 'b'], ['b', 'c'], ['c', 'a']], { status: 'expired' });
    const ref = db().doc('groups/g1/questions/q');
    await expect(expireQuestionIfOpen(db(), ref, Timestamp.now())).resolves.toBeNull();
    expect((await getQ('q')).status).toBe('expired');
  });

  it('processes a question created exactly 48h before now', async () => {
    await seedGroup({ adminUid: 'a', memberUids: FIVE });
    const now = Timestamp.fromMillis(Date.now());
    await seedQuestion('edge', 0, [['a', 'b'], ['b', 'c'], ['c', 'a']]);
    await db()
      .doc('groups/g1/questions/edge')
      .update({ createdAt: Timestamp.fromMillis(now.toMillis() - AUTO_REVEAL_MS) });
    const res = await expireOldQuestions(db(), now);
    expect(res).toEqual({ revealed: 1, expired: 0, failed: 0 });
    expect((await getQ('edge')).status).toBe('revealed');
  });

  it('isolates a malformed question: the valid one is still processed', async () => {
    await seedGroup({ adminUid: 'a', memberUids: FIVE });
    await seedQuestion('good', 49, [['a', 'b'], ['b', 'c'], ['c', 'a']]);
    await seedQuestion('bad', 49, []);
    // Non-iterable eligibleUids makes countValidVotes throw.
    await db().doc('groups/g1/questions/bad').update({ eligibleUids: 5 });
    const res = await expireOldQuestions(db(), Timestamp.now());
    expect(res).toEqual({ revealed: 1, expired: 0, failed: 1 });
    expect((await getQ('good')).status).toBe('revealed');
    expect((await getQ('bad')).status).toBe('open');
  });
});
