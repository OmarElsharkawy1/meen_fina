import {
  getFirestore,
  type DocumentReference,
  type Firestore,
  type Timestamp,
  type Transaction,
} from 'firebase-admin/firestore';
import { HttpsError, type FunctionsErrorCode } from 'firebase-functions/v2/https';
import type { ErrorReason } from '../shared/errors';
import type { GroupDoc, Person } from '../shared/types';

export type Ctx = {
  db: Firestore;
  uid: string | null;
  person: Person | null;
  now: () => Timestamp;
};

export function fail(reason: ErrorReason, code?: FunctionsErrorCode): never {
  throw new HttpsError(code ?? 'failed-precondition', reason, { reason });
}

export function requireAuth(ctx: Ctx): string {
  if (!ctx.uid) return fail('unauthenticated', 'unauthenticated');
  return ctx.uid;
}

export type LoadedGroup = { ref: DocumentReference; data: GroupDoc };

export async function getGroupOrFail(tx: Transaction, groupId: string): Promise<LoadedGroup> {
  const ref = getFirestore().doc(`groups/${groupId}`);
  const snap = await tx.get(ref);
  if (!snap.exists) return fail('not-found', 'not-found');
  return { ref, data: snap.data() as GroupDoc };
}

export function requireMember(group: LoadedGroup, uid: string): void {
  if (!group.data.memberUids.includes(uid)) fail('not-member', 'permission-denied');
}

export function requireAdmin(group: LoadedGroup, uid: string): void {
  if (group.data.adminUid !== uid) fail('not-admin', 'permission-denied');
}
