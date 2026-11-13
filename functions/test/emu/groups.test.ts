import { beforeEach, describe, expect, it } from 'vitest';
import { createGroup, joinGroup, previewGroup } from '../../src/handlers/groups';
import type { GroupDoc } from '../../src/shared/types';
import { clearFirestore, ctxFor, db, expectReason, seedGroup } from './helpers';

beforeEach(clearFirestore);

describe('createGroup', () => {
  it('creates group with caller as admin and sole member, plus code doc', async () => {
    const { groupId, code } = await createGroup(ctxFor('alice', 'Alice'), { name: '  Dahab trip ' });
    const g = (await db().doc(`groups/${groupId}`).get()).data() as GroupDoc;
    expect(g.name).toBe('Dahab trip');
    expect(g.adminUid).toBe('alice');
    expect(g.memberUids).toEqual(['alice']);
    expect(g.members.alice.name).toBe('Alice');
    expect(g.codeActive).toBe(true);
    expect(g.code).toBe(code);
    expect((await db().doc(`codes/${code}`).get()).data()).toEqual({ groupId });
  });

  it('uses "?" when person is unknown', async () => {
    const { groupId } = await createGroup(ctxFor('alice'), { name: 'X' });
    const g = (await db().doc(`groups/${groupId}`).get()).data() as GroupDoc;
    expect(g.members.alice).toMatchObject({ name: '?', photoURL: null });
  });

  it('rejects empty, too long and non-string names', async () => {
    await expectReason(createGroup(ctxFor('alice'), { name: '' }), 'invalid-input');
    await expectReason(createGroup(ctxFor('alice'), { name: 'x'.repeat(41) }), 'invalid-input');
    await expectReason(createGroup(ctxFor('alice'), { name: 5 as unknown as string }), 'invalid-input');
  });

  it('rejects unauthenticated', async () => {
    await expectReason(createGroup(ctxFor(null), { name: 'X' }), 'unauthenticated');
  });
});

describe('previewGroup', () => {
  it('works without auth and normalizes the code', async () => {
    const { code, groupId } = await createGroup(ctxFor('alice', 'Alice'), { name: 'Crew' });
    const res = await previewGroup(ctxFor(null), { code: ` ${code.toLowerCase()} ` });
    expect(res).toEqual({ groupId, name: 'Crew', memberCount: 1, alreadyMember: false });
  });

  it('reports alreadyMember', async () => {
    const { code } = await createGroup(ctxFor('alice', 'Alice'), { name: 'Crew' });
    expect((await previewGroup(ctxFor('alice'), { code })).alreadyMember).toBe(true);
  });

  it('fails not-found, invalid and code-inactive', async () => {
    await expectReason(previewGroup(ctxFor(null), { code: 'NOPE22' }), 'not-found');
    await expectReason(previewGroup(ctxFor(null), { code: 7 as unknown as string }), 'invalid-input');
    const { code } = await seedGroup({ codeActive: false });
    await expectReason(previewGroup(ctxFor(null), { code }), 'code-inactive');
  });
});

describe('joinGroup', () => {
  it('adds member and is idempotent', async () => {
    const { code, groupId } = await seedGroup();
    expect(await joinGroup(ctxFor('bob', 'Bob'), { code: code.toLowerCase() })).toEqual({ groupId });
    expect(await joinGroup(ctxFor('bob', 'Bob'), { code })).toEqual({ groupId });
    const g = (await db().doc(`groups/${groupId}`).get()).data() as GroupDoc;
    expect(g.memberUids).toEqual(['alice', 'bob']);
    expect(g.members.bob.name).toBe('Bob');
  });

  it('requires auth', async () => {
    const { code } = await seedGroup();
    await expectReason(joinGroup(ctxFor(null), { code }), 'unauthenticated');
  });

  it('fails code-inactive, not-found, group-full, banned', async () => {
    const off = await seedGroup({ groupId: 'g1', code: 'OFF222', codeActive: false });
    await expectReason(joinGroup(ctxFor('bob'), { code: off.code }), 'code-inactive');
    await expectReason(joinGroup(ctxFor('bob'), { code: 'NOPE22' }), 'not-found');

    const full = await seedGroup({
      groupId: 'g2',
      code: 'FULL22',
      memberUids: Array.from({ length: 50 }, (_, i) => `u${i}`),
    });
    await expectReason(joinGroup(ctxFor('bob'), { code: full.code }), 'group-full');

    const ban = await seedGroup({ groupId: 'g3', code: 'BAN222' });
    await db().doc('groups/g3/banned/bob').set({ name: 'Bob', photoURL: null });
    await expectReason(joinGroup(ctxFor('bob'), { code: ban.code }), 'banned');
  });

  it('lets an existing member through an inactive code', async () => {
    const { code, groupId } = await seedGroup({ codeActive: false });
    expect(await joinGroup(ctxFor('alice'), { code })).toEqual({ groupId });
  });
});
