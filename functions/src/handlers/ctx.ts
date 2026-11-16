import {
  getFirestore,
  Timestamp,
  type DocumentReference,
  type Firestore,
  type Transaction,
} from 'firebase-admin/firestore';
import { HttpsError, type CallableRequest, type FunctionsErrorCode } from 'firebase-functions/v2/https';
import type { ErrorReason } from '../shared/errors';
import type { GroupDoc, Person, ProfileDoc } from '../shared/types';

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

/**
 * The caller as shown to others: the name they chose (profiles/{uid}) if any,
 * otherwise their sign-in name.
 */
export async function personFor(ctx: Ctx, uid: string): Promise<Person> {
  const base = ctx.person ?? { name: '?', photoURL: null };
  const snap = await ctx.db.doc(`profiles/${uid}`).get();
  const chosen = snap.exists ? (snap.data() as Partial<ProfileDoc>).name : undefined;
  return typeof chosen === 'string' && chosen.length > 0 ? { ...base, name: chosen } : base;
}

export type LoadedGroup = { ref: DocumentReference; data: GroupDoc };

export async function getGroupOrFail(
  db: Firestore,
  tx: Transaction,
  groupId: string,
): Promise<LoadedGroup> {
  const ref = db.doc(`groups/${groupId}`);
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

export function ctxFromRequest(req: CallableRequest<unknown>): Ctx {
  return {
    db: getFirestore(),
    uid: req.auth?.uid ?? null,
    person: req.auth
      ? {
          name: (req.auth.token.name as string | undefined) ?? '?',
          photoURL: (req.auth.token.picture as string | undefined) ?? null,
        }
      : null,
    now: () => Timestamp.now(),
  };
}
