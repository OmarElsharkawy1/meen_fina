import { getApps, initializeApp } from 'firebase-admin/app';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { expect } from 'vitest';
import type { Ctx } from '../../src/handlers/ctx';
import type { GroupDoc } from '../../src/shared/types';

const PROJECT_ID = 'demo-meen-fina';

export function db() {
  if (getApps().length === 0) initializeApp({ projectId: PROJECT_ID });
  return getFirestore();
}

export function ctxFor(uid: string | null, name?: string): Ctx {
  return {
    db: db(),
    uid,
    person: uid && name ? { name, photoURL: null } : null,
    now: () => Timestamp.now(),
  };
}

export async function clearFirestore(): Promise<void> {
  const res = await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error(`clearFirestore failed: ${res.status}`);
}

export async function seedGroup(
  opts: {
    groupId?: string;
    code?: string;
    name?: string;
    adminUid?: string;
    memberUids?: string[];
    codeActive?: boolean;
  } = {},
): Promise<{ groupId: string; code: string }> {
  const groupId = opts.groupId ?? 'g1';
  const code = opts.code ?? 'K7P2QX';
  const adminUid = opts.adminUid ?? 'alice';
  const memberUids = opts.memberUids ?? [adminUid];
  const now = Timestamp.now();
  const group: GroupDoc = {
    name: opts.name ?? 'Friends',
    adminUid,
    memberUids,
    members: Object.fromEntries(
      memberUids.map((u) => [u, { name: u, photoURL: null, joinedAt: now }]),
    ),
    code,
    codeActive: opts.codeActive ?? true,
    createdAt: now,
  };
  await db().doc(`groups/${groupId}`).set(group);
  await db().doc(`codes/${code}`).set({ groupId });
  return { groupId, code };
}

export async function expectReason(promise: Promise<unknown>, reason: string): Promise<void> {
  try {
    await promise;
  } catch (err) {
    expect((err as { details?: { reason?: string } }).details?.reason).toBe(reason);
    return;
  }
  throw new Error(`expected rejection with reason "${reason}" but promise resolved`);
}
