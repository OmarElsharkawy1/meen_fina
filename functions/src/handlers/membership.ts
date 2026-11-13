import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import type { DocumentReference, Firestore, Timestamp, Transaction } from 'firebase-admin/firestore';
import { generateCode } from '../core/codes';
import { removeMemberFromQuestion, revealDecision } from '../core/lifecycle';
import type {
  BannedDoc,
  CodeDoc,
  KickMemberInput,
  LeaveGroupInput,
  LeaveGroupOutput,
  QuestionDoc,
  RegenerateCodeInput,
  RegenerateCodeOutput,
  SetCodeActiveInput,
  TransferAdminInput,
  UnbanMemberInput,
  VoteDoc,
} from '../shared/types';
import {
  fail,
  getGroupOrFail,
  requireAdmin,
  requireAuth,
  requireMember,
  type Ctx,
} from './ctx';
import { finalizeQuestion, requireId } from './questions';

const MAX_CODE_ATTEMPTS = 5;
const BATCH_SIZE = 400;

export type LoadedOpenQuestion = {
  ref: DocumentReference;
  data: QuestionDoc;
  votes: Array<{ ref: DocumentReference; data: VoteDoc }>;
};

/** Read phase: open questions the user is eligible for, with their votes. */
export async function loadOpenQuestionsFor(
  db: Firestore,
  tx: Transaction,
  groupId: string,
  uid: string,
): Promise<LoadedOpenQuestion[]> {
  const qSnap = await tx.get(
    db.collection(`groups/${groupId}/questions`).where('status', '==', 'open'),
  );
  const open = qSnap.docs.filter((d) => (d.data() as QuestionDoc).eligibleUids.includes(uid));
  return Promise.all(
    open.map(async (d) => {
      const vSnap = await tx.get(db.collection('votes').where('questionId', '==', d.id));
      return {
        ref: d.ref,
        data: d.data() as QuestionDoc,
        votes: vSnap.docs.map((v) => ({ ref: v.ref, data: v.data() as VoteDoc })),
      };
    }),
  );
}

/** Write phase: remove the user from each loaded question, finalizing where needed. */
export function applyMemberRemoval(
  tx: Transaction,
  loaded: LoadedOpenQuestion[],
  uid: string,
  now: Timestamp,
): void {
  for (const { ref, data, votes } of loaded) {
    const removal = removeMemberFromQuestion(
      data,
      uid,
      votes.map((v) => v.data),
    );
    const doomed = new Set(removal.voterUidsToDelete);
    for (const v of votes) if (doomed.has(v.data.voterUid)) tx.delete(v.ref);
    const remaining = votes.filter((v) => !doomed.has(v.data.voterUid)).map((v) => v.data);
    const updated: QuestionDoc = {
      ...data,
      eligibleUids: removal.eligibleUids,
      votedUids: removal.votedUids,
      people: removal.people,
    };
    tx.update(ref, {
      eligibleUids: updated.eligibleUids,
      votedUids: updated.votedUids,
      people: updated.people,
    });
    const decision = revealDecision(updated.eligibleUids.length, updated.votedUids.length);
    if (decision !== 'wait') finalizeQuestion(tx, ref, updated, decision, remaining, now);
  }
}

async function deleteGroupLeftovers(db: Firestore, groupId: string): Promise<void> {
  await db.recursiveDelete(db.doc(`groups/${groupId}`));
  for (;;) {
    const snap = await db.collection('votes').where('groupId', '==', groupId).limit(BATCH_SIZE).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

export async function leaveGroup(ctx: Ctx, input: LeaveGroupInput): Promise<LeaveGroupOutput> {
  const uid = requireAuth(ctx);
  const groupId = requireId(input?.groupId);

  const groupDeleted = await ctx.db.runTransaction(async (tx) => {
    const group = await getGroupOrFail(ctx.db, tx, groupId);
    requireMember(group, uid);
    if (group.data.memberUids.length === 1) {
      tx.delete(group.ref);
      tx.delete(ctx.db.doc(`codes/${group.data.code}`));
      return true;
    }
    if (group.data.adminUid === uid) return fail('admin-must-transfer');
    const loaded = await loadOpenQuestionsFor(ctx.db, tx, groupId, uid);
    tx.update(group.ref, {
      memberUids: FieldValue.arrayRemove(uid),
      [`members.${uid}`]: FieldValue.delete(),
    });
    applyMemberRemoval(tx, loaded, uid, ctx.now());
    return false;
  });

  if (groupDeleted) await deleteGroupLeftovers(ctx.db, groupId);
  return { groupDeleted };
}

export async function kickMember(ctx: Ctx, input: KickMemberInput): Promise<void> {
  const uid = requireAuth(ctx);
  const groupId = requireId(input?.groupId);
  const target = requireId(input?.uid);

  await ctx.db.runTransaction(async (tx) => {
    const group = await getGroupOrFail(ctx.db, tx, groupId);
    requireAdmin(group, uid);
    if (target === uid) return fail('invalid-input', 'invalid-argument');
    if (!group.data.memberUids.includes(target)) return fail('not-member', 'permission-denied');
    const loaded = await loadOpenQuestionsFor(ctx.db, tx, groupId, target);
    const m = group.data.members[target];
    const banned: BannedDoc = {
      name: m?.name ?? '?',
      photoURL: m?.photoURL ?? null,
      bannedAt: ctx.now(),
    };
    tx.update(group.ref, {
      memberUids: FieldValue.arrayRemove(target),
      [`members.${target}`]: FieldValue.delete(),
    });
    tx.set(ctx.db.doc(`groups/${groupId}/banned/${target}`), banned);
    applyMemberRemoval(tx, loaded, target, ctx.now());
  });
}

export async function unbanMember(ctx: Ctx, input: UnbanMemberInput): Promise<void> {
  const uid = requireAuth(ctx);
  const groupId = requireId(input?.groupId);
  const target = requireId(input?.uid);

  await ctx.db.runTransaction(async (tx) => {
    const group = await getGroupOrFail(ctx.db, tx, groupId);
    requireAdmin(group, uid);
    tx.delete(ctx.db.doc(`groups/${groupId}/banned/${target}`));
  });
}

export async function setCodeActive(ctx: Ctx, input: SetCodeActiveInput): Promise<void> {
  const uid = requireAuth(ctx);
  const groupId = requireId(input?.groupId);
  const active: unknown = input?.active;
  if (typeof active !== 'boolean') return fail('invalid-input', 'invalid-argument');

  await ctx.db.runTransaction(async (tx) => {
    const group = await getGroupOrFail(ctx.db, tx, groupId);
    requireAdmin(group, uid);
    tx.update(group.ref, { codeActive: active });
  });
}

export async function regenerateCode(
  ctx: Ctx,
  input: RegenerateCodeInput,
): Promise<RegenerateCodeOutput> {
  const uid = requireAuth(ctx);
  const groupId = requireId(input?.groupId);

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateCode();
    const newRef = ctx.db.doc(`codes/${code}`);
    const result = await ctx.db.runTransaction(async (tx) => {
      const group = await getGroupOrFail(ctx.db, tx, groupId);
      requireAdmin(group, uid);
      if ((await tx.get(newRef)).exists) return null;
      const codeDoc: CodeDoc = { groupId };
      tx.delete(ctx.db.doc(`codes/${group.data.code}`));
      tx.set(newRef, codeDoc);
      tx.update(group.ref, { code, codeActive: true });
      return code;
    });
    if (result) return { code: result };
  }
  throw new HttpsError('internal', 'code-generation-exhausted');
}

export async function transferAdmin(ctx: Ctx, input: TransferAdminInput): Promise<void> {
  const uid = requireAuth(ctx);
  const groupId = requireId(input?.groupId);
  const target = requireId(input?.uid);

  await ctx.db.runTransaction(async (tx) => {
    const group = await getGroupOrFail(ctx.db, tx, groupId);
    requireAdmin(group, uid);
    if (!group.data.memberUids.includes(target)) return fail('not-member', 'permission-denied');
    tx.update(group.ref, { adminUid: target });
  });
}
