import { beforeEach, describe, expect, it } from 'vitest';
import { joinGroup } from '../../src/handlers/groups';
import {
  kickMember,
  leaveGroup,
  regenerateCode,
  setCodeActive,
  transferAdmin,
  unbanMember,
} from '../../src/handlers/membership';
import { askQuestion, castVote, revealQuestion } from '../../src/handlers/questions';
import type { QuestionDoc } from '../../src/shared/types';
import { clearFirestore, ctxFor, db, expectReason, seedGroup } from './helpers';

beforeEach(clearFirestore);

const FIVE = ['a', 'b', 'c', 'd', 'e'];

async function getQ(qid: string) {
  return (await db().doc(`groups/g1/questions/${qid}`).get()).data() as QuestionDoc;
}

async function openQuestion(members = FIVE) {
  const { groupId, code } = await seedGroup({ adminUid: members[0], memberUids: members });
  const { questionId } = await askQuestion(ctxFor(members[0], 'A'), { groupId, text: 'Who?' });
  return { groupId, code, questionId };
}

describe('leaveGroup', () => {
  it('admin must transfer first, then can leave', async () => {
    const { groupId } = await seedGroup({ adminUid: 'a', memberUids: ['a', 'b'] });
    await expectReason(leaveGroup(ctxFor('a'), { groupId }), 'admin-must-transfer');
    await transferAdmin(ctxFor('a'), { groupId, uid: 'b' });
    expect(await leaveGroup(ctxFor('a'), { groupId })).toEqual({ groupDeleted: false });
    const g = (await db().doc(`groups/${groupId}`).get()).data()!;
    expect(g.memberUids).toEqual(['b']);
    expect(g.adminUid).toBe('b');
    expect(g.members.a).toBeUndefined();
    expect((await db().doc(`groups/${groupId}/banned/a`).get()).exists).toBe(false);
  });

  it('non-members cannot leave', async () => {
    const { groupId } = await seedGroup({ adminUid: 'a', memberUids: ['a', 'b'] });
    await expectReason(leaveGroup(ctxFor('zed'), { groupId }), 'not-member');
    await expectReason(leaveGroup(ctxFor(null), { groupId }), 'unauthenticated');
  });

  it('sole member leaving deletes everything', async () => {
    const { groupId, code } = await seedGroup({ adminUid: 'a', memberUids: ['a'] });
    await db().doc(`groups/${groupId}/questions/q1`).set({ text: 'x' });
    await db().doc(`groups/${groupId}/banned/z`).set({ name: 'z' });
    await db().doc('votes/q1_a').set({ groupId, questionId: 'q1', voterUid: 'a', targetUid: 'b' });
    expect(await leaveGroup(ctxFor('a'), { groupId })).toEqual({ groupDeleted: true });
    expect((await db().doc(`groups/${groupId}`).get()).exists).toBe(false);
    expect((await db().doc(`codes/${code}`).get()).exists).toBe(false);
    expect((await db().collection(`groups/${groupId}/questions`).get()).size).toBe(0);
    expect((await db().collection(`groups/${groupId}/banned`).get()).size).toBe(0);
    expect((await db().collection('votes').get()).size).toBe(0);
  });
});

describe('kick / unban / ban enforcement', () => {
  it('only admin can kick; cannot kick self or non-member', async () => {
    const { groupId } = await seedGroup({ adminUid: 'a', memberUids: ['a', 'b', 'c'] });
    await expectReason(kickMember(ctxFor('b'), { groupId, uid: 'c' }), 'not-admin');
    await expectReason(kickMember(ctxFor('a'), { groupId, uid: 'a' }), 'invalid-input');
    await expectReason(kickMember(ctxFor('a'), { groupId, uid: 'zed' }), 'not-member');
  });

  it('kicked member is banned until unbanned, even after code regeneration', async () => {
    const { groupId, code } = await seedGroup({ adminUid: 'a', memberUids: ['a', 'b', 'c'] });
    await kickMember(ctxFor('a'), { groupId, uid: 'c' });
    const g = (await db().doc(`groups/${groupId}`).get()).data()!;
    expect(g.memberUids).not.toContain('c');
    expect(g.members.c).toBeUndefined();
    const banned = (await db().doc(`groups/${groupId}/banned/c`).get()).data()!;
    expect(banned.name).toBe('c');
    expect(banned.bannedAt).toBeDefined();
    await expectReason(joinGroup(ctxFor('c', 'C'), { code }), 'banned');
    const { code: newCode } = await regenerateCode(ctxFor('a'), { groupId });
    await expectReason(joinGroup(ctxFor('c', 'C'), { code: newCode }), 'banned');
    await expectReason(unbanMember(ctxFor('b'), { groupId, uid: 'c' }), 'not-admin');
    await unbanMember(ctxFor('a'), { groupId, uid: 'c' });
    expect((await db().doc(`groups/${groupId}/banned/c`).get()).exists).toBe(false);
    expect(await joinGroup(ctxFor('c', 'C'), { code: newCode })).toEqual({ groupId });
  });
});

describe('open question cleanup', () => {
  it('removes departing member vote and votes for them', async () => {
    const { groupId, questionId } = await openQuestion();
    await castVote(ctxFor('a'), { groupId, questionId, targetUid: 'd' });
    await castVote(ctxFor('b'), { groupId, questionId, targetUid: 'c' });
    await castVote(ctxFor('c'), { groupId, questionId, targetUid: 'a' });
    await kickMember(ctxFor('a'), { groupId, uid: 'd' });
    const q = await getQ(questionId);
    expect(q.eligibleUids).not.toContain('d');
    expect(q.people.d).toBeUndefined();
    expect([...q.votedUids].sort()).toEqual(['a', 'b', 'c']);
    expect(q.status).toBe('open');
    expect((await db().doc(`votes/${questionId}_a`).get()).exists).toBe(true);
    expect((await db().doc(`votes/${questionId}_b`).get()).exists).toBe(true);
  });

  it('deletes the vote of a voter who leaves and drops them from votedUids', async () => {
    const { groupId, questionId } = await openQuestion();
    await castVote(ctxFor('b'), { groupId, questionId, targetUid: 'c' });
    await leaveGroup(ctxFor('b'), { groupId });
    const q = await getQ(questionId);
    expect(q.votedUids).not.toContain('b');
    expect((await db().doc(`votes/${questionId}_b`).get()).exists).toBe(false);
  });

  it('stays open when valid votes are below the minimum, then reveals after re-votes', async () => {
    const { groupId, questionId } = await openQuestion();
    await castVote(ctxFor('a'), { groupId, questionId, targetUid: 'e' });
    await castVote(ctxFor('b'), { groupId, questionId, targetUid: 'e' });
    await castVote(ctxFor('c'), { groupId, questionId, targetUid: 'a' });
    await castVote(ctxFor('d'), { groupId, questionId, targetUid: 'a' });
    await kickMember(ctxFor('a'), { groupId, uid: 'e' });
    const q = await getQ(questionId);
    expect(q.status).toBe('open');
    expect(q.results).toBeNull();
    expect(q.votedUids).toHaveLength(4);
    const r = await castVote(ctxFor('a'), { groupId, questionId, targetUid: 'b' });
    expect(r.revealed).toBe(true);
    expect((await getQ(questionId)).status).toBe('revealed');
  });

  it('castVote does not reveal when all voted but valid votes < 3', async () => {
    const { groupId, questionId } = await openQuestion();
    for (const v of ['a', 'b', 'c']) {
      await castVote(ctxFor(v), { groupId, questionId, targetUid: 'e' });
    }
    await castVote(ctxFor('d'), { groupId, questionId, targetUid: 'a' });
    await kickMember(ctxFor('a'), { groupId, uid: 'e' });
    const r = await castVote(ctxFor('d'), { groupId, questionId, targetUid: 'b' });
    expect(r.revealed).toBe(false);
    expect((await getQ(questionId)).status).toBe('open');
  });

  it('manual reveal needs 3 valid votes', async () => {
    const { groupId, questionId } = await openQuestion();
    await castVote(ctxFor('a'), { groupId, questionId, targetUid: 'e' });
    await castVote(ctxFor('b'), { groupId, questionId, targetUid: 'c' });
    await castVote(ctxFor('c'), { groupId, questionId, targetUid: 'b' });
    await kickMember(ctxFor('a'), { groupId, uid: 'e' });
    await expectReason(revealQuestion(ctxFor('a'), { groupId, questionId }), 'too-few-votes');
    expect((await getQ(questionId)).status).toBe('open');
  });

  it('triggers reveal when remaining members have all voted', async () => {
    const { groupId, questionId } = await openQuestion();
    for (const v of ['a', 'b', 'c', 'd']) {
      await castVote(ctxFor(v), { groupId, questionId, targetUid: v === 'a' ? 'b' : 'a' });
    }
    await kickMember(ctxFor('a'), { groupId, uid: 'e' });
    const q = await getQ(questionId);
    expect(q.status).toBe('revealed');
    expect(q.results?.mode).toBe('winners');
    expect(q.eligibleUids).toHaveLength(4);
  });

  it('expires when too few eligible remain', async () => {
    const { groupId, questionId } = await openQuestion(['a', 'b', 'c']);
    await leaveGroup(ctxFor('c'), { groupId });
    const q = await getQ(questionId);
    expect(q.status).toBe('expired');
    expect(q.results).toBeNull();
  });

  it('leaves revealed questions unchanged', async () => {
    const { groupId, questionId } = await openQuestion();
    for (const v of FIVE) {
      await castVote(ctxFor(v), { groupId, questionId, targetUid: v === 'a' ? 'b' : 'a' });
    }
    const before = await getQ(questionId);
    expect(before.status).toBe('revealed');
    await kickMember(ctxFor('a'), { groupId, uid: 'd' });
    const after = await getQ(questionId);
    expect(after.results).toEqual(before.results);
    expect(after.eligibleUids).toEqual(before.eligibleUids);
  });
});

describe('code management', () => {
  it('setCodeActive toggles joining; regenerate replaces code', async () => {
    const { groupId, code } = await seedGroup({ adminUid: 'a', memberUids: ['a', 'b'] });
    await expectReason(setCodeActive(ctxFor('b'), { groupId, active: false }), 'not-admin');
    await expectReason(
      setCodeActive(ctxFor('a'), { groupId, active: 'no' as unknown as boolean }),
      'invalid-input',
    );
    await setCodeActive(ctxFor('a'), { groupId, active: false });
    await expectReason(joinGroup(ctxFor('x', 'X'), { code }), 'code-inactive');
    const { code: newCode } = await regenerateCode(ctxFor('a'), { groupId });
    expect(newCode).not.toBe(code);
    await expectReason(joinGroup(ctxFor('x', 'X'), { code }), 'not-found');
    expect(await joinGroup(ctxFor('x', 'X'), { code: newCode })).toEqual({ groupId });
    const g = (await db().doc(`groups/${groupId}`).get()).data()!;
    expect(g.code).toBe(newCode);
    expect(g.codeActive).toBe(true);
  });

  it('transferAdmin requires admin and a member target', async () => {
    const { groupId } = await seedGroup({ adminUid: 'a', memberUids: ['a', 'b'] });
    await expectReason(transferAdmin(ctxFor('b'), { groupId, uid: 'b' }), 'not-admin');
    await expectReason(transferAdmin(ctxFor('a'), { groupId, uid: 'a' }), 'invalid-input');
    await expectReason(transferAdmin(ctxFor('a'), { groupId, uid: 'zed' }), 'not-member');
    await transferAdmin(ctxFor('a'), { groupId, uid: 'b' });
    expect((await db().doc(`groups/${groupId}`).get()).data()!.adminUid).toBe('b');
  });
});
