import { Timestamp } from 'firebase-admin/firestore';
import { beforeEach, describe, expect, it } from 'vitest';
import { createGroup, joinGroup } from '../../src/handlers/groups';
import { cleanDisplayName, setDisplayName } from '../../src/handlers/profile';
import type { GroupDoc, QuestionDoc } from '../../src/shared/types';
import { clearFirestore, ctxFor, db, expectReason, seedGroup } from './helpers';

beforeEach(clearFirestore);

async function seedQuestion(groupId: string, id: string, over: Partial<QuestionDoc> = {}) {
  const now = Timestamp.now();
  const q: QuestionDoc = {
    text: 'Who?',
    askerUid: 'alice',
    createdAt: now,
    people: { alice: { name: 'alice', photoURL: null }, bob: { name: 'bob', photoURL: null } },
    eligibleUids: ['alice', 'bob'],
    votedUids: [],
    status: 'open',
    closedAt: null,
    results: null,
    ...over,
  };
  await db().doc(`groups/${groupId}/questions/${id}`).set(q);
}

const group = async (id: string) => (await db().doc(`groups/${id}`).get()).data() as GroupDoc;
const question = async (g: string, id: string) =>
  (await db().doc(`groups/${g}/questions/${id}`).get()).data() as QuestionDoc;

describe('cleanDisplayName', () => {
  it('trims and collapses whitespace', () => expect(cleanDisplayName('  Omar   El  ')).toBe('Omar El'));
  it('rejects empty, too long and non-strings', () => {
    expect(cleanDisplayName('   ')).toBeNull();
    expect(cleanDisplayName('x'.repeat(31))).toBeNull();
    expect(cleanDisplayName(5)).toBeNull();
  });
  it('accepts the maximum length', () => expect(cleanDisplayName('x'.repeat(30))).toHaveLength(30));
});

describe('setDisplayName', () => {
  it('renames the caller in every group and leaves others alone', async () => {
    await seedGroup({ groupId: 'g1', code: 'AAAAAA', memberUids: ['alice', 'bob'] });
    await seedGroup({ groupId: 'g2', code: 'BBBBBB', adminUid: 'bob', memberUids: ['bob', 'alice'] });
    await seedGroup({ groupId: 'g3', code: 'CCCCCC', adminUid: 'bob', memberUids: ['bob'] });

    const res = await setDisplayName(ctxFor('alice', 'Alice'), { name: '  Lulu ' });

    expect(res).toEqual({ name: 'Lulu' });
    expect((await group('g1')).members.alice.name).toBe('Lulu');
    expect((await group('g1')).members.bob.name).toBe('bob');
    expect((await group('g2')).members.alice.name).toBe('Lulu');
    expect((await group('g3')).members.alice).toBeUndefined();
    expect((await db().doc('users/alice').get()).data()).toMatchObject({ displayName: 'Lulu' });
  });

  it('renames the caller on open and recent closed questions', async () => {
    await seedGroup({ groupId: 'g1', memberUids: ['alice', 'bob'] });
    await seedQuestion('g1', 'open');
    await seedQuestion('g1', 'done', {
      status: 'revealed',
      closedAt: Timestamp.now(),
      results: { mode: 'winners', winnerUids: ['alice'] },
    });
    await seedQuestion('g1', 'without', { people: { bob: { name: 'bob', photoURL: null } } });

    await setDisplayName(ctxFor('alice', 'Alice'), { name: 'Lulu' });

    expect((await question('g1', 'open')).people.alice.name).toBe('Lulu');
    expect((await question('g1', 'open')).people.bob.name).toBe('bob');
    expect((await question('g1', 'done')).people.alice.name).toBe('Lulu');
    expect((await question('g1', 'without')).people.alice).toBeUndefined();
  });

  it('keeps the chosen name when creating or joining a group later', async () => {
    await setDisplayName(ctxFor('alice', 'Alice Google'), { name: 'Lulu' });
    const { groupId } = await createGroup(ctxFor('alice', 'Alice Google'), { name: 'Crew' });
    expect((await group(groupId)).members.alice.name).toBe('Lulu');

    const { code } = await seedGroup({ groupId: 'g9', code: 'ZZZZZZ', adminUid: 'bob' });
    await joinGroup(ctxFor('alice', 'Alice Google'), { code });
    expect((await group('g9')).members.alice.name).toBe('Lulu');
  });

  it('works for someone in no groups', async () => {
    await expect(setDisplayName(ctxFor('zed', 'Zed'), { name: 'Z' })).resolves.toEqual({ name: 'Z' });
  });

  it('rejects bad names and unauthenticated callers', async () => {
    await expectReason(setDisplayName(ctxFor('alice'), { name: ' ' }), 'invalid-input');
    await expectReason(setDisplayName(ctxFor('alice'), { name: 'x'.repeat(31) }), 'invalid-input');
    await expectReason(setDisplayName(ctxFor(null), { name: 'A' }), 'unauthenticated');
  });
});
