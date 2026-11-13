import { beforeEach, describe, expect, it } from 'vitest';
import {
  askQuestion,
  castVote,
  deleteQuestion,
  revealQuestion,
} from '../../src/handlers/questions';
import type { QuestionDoc } from '../../src/shared/types';
import { clearFirestore, ctxFor, db, expectReason, seedGroup } from './helpers';

beforeEach(clearFirestore);

const FIVE = ['a', 'b', 'c', 'd', 'e'];

async function setup(members = FIVE) {
  const { groupId } = await seedGroup({ adminUid: members[0], memberUids: members });
  const { questionId } = await askQuestion(ctxFor('a', 'A'), { groupId, text: 'Who is late?' });
  return { groupId, questionId };
}

async function getQ(qid: string) {
  return (await db().doc(`groups/g1/questions/${qid}`).get()).data() as QuestionDoc;
}

describe('askQuestion', () => {
  it('rejects groups with fewer than 3 members', async () => {
    const { groupId } = await seedGroup({ adminUid: 'a', memberUids: ['a', 'b'] });
    await expectReason(askQuestion(ctxFor('a'), { groupId, text: 'Who?' }), 'too-few-members');
  });

  it('rejects bad text and non-members', async () => {
    const { groupId } = await seedGroup({ adminUid: 'a', memberUids: FIVE });
    await expectReason(askQuestion(ctxFor('a'), { groupId, text: 'x'.repeat(151) }), 'invalid-input');
    await expectReason(askQuestion(ctxFor('a'), { groupId, text: '   ' }), 'invalid-input');
    await expectReason(askQuestion(ctxFor('a'), { groupId, text: 5 as unknown as string }), 'invalid-input');
    await expectReason(askQuestion(ctxFor('a'), { groupId: 'a/b', text: 'Who?' }), 'invalid-input');
    await expectReason(askQuestion(ctxFor('zed'), { groupId, text: 'Who?' }), 'not-member');
    await expectReason(askQuestion(ctxFor(null), { groupId, text: 'Who?' }), 'unauthenticated');
  });

  it('creates an open question snapshotting members', async () => {
    const { questionId } = await setup();
    const q = await getQ(questionId);
    expect(q.eligibleUids).toEqual(FIVE);
    expect(q.status).toBe('open');
    expect(q.results).toBeNull();
    expect(q.votedUids).toEqual([]);
    expect(q.askerUid).toBe('a');
    expect(q.people.b.name).toBe('b');
  });
});

describe('castVote', () => {
  it('rejects self votes and ineligible voters', async () => {
    const { groupId, questionId } = await setup();
    await expectReason(castVote(ctxFor('a'), { groupId, questionId, targetUid: 'a' }), 'cannot-vote-self');
    await db().doc(`groups/${groupId}`).update({ memberUids: [...FIVE, 'f'] });
    await expectReason(castVote(ctxFor('f'), { groupId, questionId, targetUid: 'a' }), 'not-eligible');
    await expectReason(castVote(ctxFor('a'), { groupId, questionId, targetUid: 'f' }), 'invalid-input');
  });

  it('changing a vote keeps one doc', async () => {
    const { groupId, questionId } = await setup();
    await castVote(ctxFor('a'), { groupId, questionId, targetUid: 'b' });
    await castVote(ctxFor('a'), { groupId, questionId, targetUid: 'c' });
    const votes = await db().collection('votes').where('questionId', '==', questionId).get();
    expect(votes.size).toBe(1);
    expect(votes.docs[0].data().targetUid).toBe('c');
    expect((await getQ(questionId)).votedUids).toEqual(['a']);
  });

  it('reveals on last vote with full totals', async () => {
    const { groupId, questionId } = await setup();
    for (const v of ['a', 'b', 'c', 'd']) {
      const r = await castVote(ctxFor(v), { groupId, questionId, targetUid: v === 'a' ? 'b' : 'a' });
      expect(r.revealed).toBe(false);
    }
    expect((await getQ(questionId)).status).toBe('open');
    const r = await castVote(ctxFor('e'), { groupId, questionId, targetUid: 'a' });
    expect(r.revealed).toBe(true);
    const q = await getQ(questionId);
    expect(q.status).toBe('revealed');
    expect(q.closedAt).not.toBeNull();
    expect(q.results?.mode).toBe('full');
    if (q.results?.mode === 'full') {
      expect(Object.values(q.results.totals).reduce((x, y) => x + y, 0)).toBe(5);
    }
    await expectReason(castVote(ctxFor('a'), { groupId, questionId, targetUid: 'c' }), 'question-closed');
  });

  it('small groups reveal winners only', async () => {
    const { groupId, questionId } = await setup(['a', 'b', 'c', 'd']);
    for (const v of ['a', 'b', 'c', 'd']) {
      await castVote(ctxFor(v), { groupId, questionId, targetUid: v === 'a' ? 'b' : 'a' });
    }
    const q = await getQ(questionId);
    expect(q.results?.mode).toBe('winners');
    expect(q.results).not.toHaveProperty('totals');
  });

  it('two concurrent last votes both count and reveal', async () => {
    const { groupId, questionId } = await setup();
    for (const v of ['a', 'b', 'c']) {
      await castVote(ctxFor(v), { groupId, questionId, targetUid: v === 'a' ? 'b' : 'a' });
    }
    const [r1, r2] = await Promise.all([
      castVote(ctxFor('d'), { groupId, questionId, targetUid: 'a' }),
      castVote(ctxFor('e'), { groupId, questionId, targetUid: 'a' }),
    ]);
    expect([r1.revealed, r2.revealed].some(Boolean)).toBe(true);
    const q = await getQ(questionId);
    expect(q.status).toBe('revealed');
    expect(q.votedUids.length).toBe(5);
    if (q.results?.mode === 'full') {
      expect(Object.values(q.results.totals).reduce((x, y) => x + y, 0)).toBe(5);
    } else throw new Error('expected full results');
  }, 20_000);
});

describe('revealQuestion', () => {
  it('enforces permission and minimum votes, then closes', async () => {
    const { groupId, questionId } = await setup();
    await expectReason(revealQuestion(ctxFor('b'), { groupId, questionId }), 'not-allowed');
    await castVote(ctxFor('a'), { groupId, questionId, targetUid: 'b' });
    await castVote(ctxFor('b'), { groupId, questionId, targetUid: 'a' });
    await expectReason(revealQuestion(ctxFor('a'), { groupId, questionId }), 'too-few-votes');
    await castVote(ctxFor('c'), { groupId, questionId, targetUid: 'a' });
    await revealQuestion(ctxFor('a'), { groupId, questionId });
    const q = await getQ(questionId);
    expect(q.status).toBe('revealed');
    expect(q.results).not.toBeNull();
    await expectReason(castVote(ctxFor('d'), { groupId, questionId, targetUid: 'a' }), 'question-closed');
    await expectReason(revealQuestion(ctxFor('a'), { groupId, questionId }), 'question-closed');
  });
});

describe('deleteQuestion', () => {
  it('only asker or admin; removes votes', async () => {
    const { groupId } = await seedGroup({ adminUid: 'e', memberUids: FIVE });
    const { questionId } = await askQuestion(ctxFor('a'), { groupId, text: 'Who?' });
    await castVote(ctxFor('c'), { groupId, questionId, targetUid: 'a' });
    await expectReason(deleteQuestion(ctxFor('b'), { groupId, questionId }), 'not-allowed');
    await deleteQuestion(ctxFor('e'), { groupId, questionId });
    expect((await db().doc(`groups/${groupId}/questions/${questionId}`).get()).exists).toBe(false);
    expect((await db().collection('votes').where('questionId', '==', questionId).get()).size).toBe(0);
  });
});
