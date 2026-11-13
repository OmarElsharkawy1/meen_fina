import type { DocumentReference, Timestamp, Transaction } from 'firebase-admin/firestore';
import { computeResults } from '../core/results';
import { countValidVotes, revealDecision } from '../core/lifecycle';
import {
  MIN_MEMBERS_TO_ASK,
  MIN_VOTES_TO_REVEAL,
  QUESTION_MAX_LEN,
} from '../shared/constants';
import type {
  AskQuestionInput,
  AskQuestionOutput,
  CastVoteInput,
  CastVoteOutput,
  DeleteQuestionInput,
  QuestionDoc,
  RevealQuestionInput,
  VoteDoc,
} from '../shared/types';
import { fail, getGroupOrFail, requireAuth, requireMember, type Ctx } from './ctx';

export function requireId(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.includes('/')) {
    return fail('invalid-input', 'invalid-argument');
  }
  return value;
}

export function finalizeQuestion(
  tx: Transaction,
  qRef: DocumentReference,
  q: QuestionDoc,
  outcome: 'reveal' | 'expire',
  votes: VoteDoc[],
  now: Timestamp,
): void {
  // Safety net: never reveal on fewer than the minimum valid votes.
  const effective =
    outcome === 'reveal' && countValidVotes(q.eligibleUids, votes) < MIN_VOTES_TO_REVEAL
      ? 'expire'
      : outcome;
  const update: Partial<QuestionDoc> =
    effective === 'reveal'
      ? { status: 'revealed', closedAt: now, results: computeResults(q.eligibleUids, votes) }
      : { status: 'expired', closedAt: now, results: null };
  tx.update(qRef, update);
}

export async function askQuestion(ctx: Ctx, input: AskQuestionInput): Promise<AskQuestionOutput> {
  const uid = requireAuth(ctx);
  const groupId = requireId(input?.groupId);
  const rawText: unknown = input?.text;
  if (typeof rawText !== 'string') return fail('invalid-input', 'invalid-argument');
  const text = rawText.trim();
  if (text.length === 0 || text.length > QUESTION_MAX_LEN) {
    return fail('invalid-input', 'invalid-argument');
  }
  const qRef = ctx.db.collection(`groups/${groupId}/questions`).doc();

  return ctx.db.runTransaction(async (tx) => {
    const group = await getGroupOrFail(ctx.db, tx, groupId);
    requireMember(group, uid);
    if (group.data.memberUids.length < MIN_MEMBERS_TO_ASK) return fail('too-few-members');
    const eligibleUids = [...group.data.memberUids];
    const people = Object.fromEntries(
      eligibleUids.map((u) => {
        const m = group.data.members[u];
        return [u, { name: m?.name ?? '?', photoURL: m?.photoURL ?? null }];
      }),
    );
    const question: QuestionDoc = {
      text,
      askerUid: uid,
      createdAt: ctx.now(),
      people,
      eligibleUids,
      votedUids: [],
      status: 'open',
      closedAt: null,
      results: null,
    };
    tx.set(qRef, question);
    return { questionId: qRef.id };
  });
}

export async function deleteQuestion(ctx: Ctx, input: DeleteQuestionInput): Promise<void> {
  const uid = requireAuth(ctx);
  const groupId = requireId(input?.groupId);
  const questionId = requireId(input?.questionId);
  const qRef = ctx.db.doc(`groups/${groupId}/questions/${questionId}`);

  await ctx.db.runTransaction(async (tx) => {
    const group = await getGroupOrFail(ctx.db, tx, groupId);
    requireMember(group, uid);
    const qSnap = await tx.get(qRef);
    if (!qSnap.exists) return fail('not-found', 'not-found');
    const q = qSnap.data() as QuestionDoc;
    if (q.askerUid !== uid && group.data.adminUid !== uid) {
      return fail('not-allowed', 'permission-denied');
    }
    const votesSnap = await tx.get(
      ctx.db.collection('votes').where('questionId', '==', questionId),
    );
    votesSnap.docs.forEach((d) => tx.delete(d.ref));
    tx.delete(qRef);
  });
}

export async function castVote(ctx: Ctx, input: CastVoteInput): Promise<CastVoteOutput> {
  const uid = requireAuth(ctx);
  const groupId = requireId(input?.groupId);
  const questionId = requireId(input?.questionId);
  const targetUid = requireId(input?.targetUid);
  const qRef = ctx.db.doc(`groups/${groupId}/questions/${questionId}`);

  return ctx.db.runTransaction(async (tx) => {
    const group = await getGroupOrFail(ctx.db, tx, groupId);
    requireMember(group, uid);
    const qSnap = await tx.get(qRef);
    if (!qSnap.exists) return fail('not-found', 'not-found');
    const q = qSnap.data() as QuestionDoc;
    if (q.status !== 'open') return fail('question-closed');
    if (!q.eligibleUids.includes(uid)) return fail('not-eligible');
    if (targetUid === uid) return fail('cannot-vote-self', 'invalid-argument');
    if (!q.eligibleUids.includes(targetUid)) return fail('invalid-input', 'invalid-argument');

    const votesSnap = await tx.get(
      ctx.db.collection('votes').where('questionId', '==', questionId),
    );
    const vote: VoteDoc = { groupId, questionId, voterUid: uid, targetUid };
    const votes = votesSnap.docs
      .map((d) => d.data() as VoteDoc)
      .filter((v) => v.voterUid !== uid);
    votes.push(vote);

    const votedUids = q.votedUids.includes(uid) ? q.votedUids : [...q.votedUids, uid];
    tx.set(ctx.db.doc(`votes/${questionId}_${uid}`), vote);

    if (
      revealDecision(q.eligibleUids.length, votedUids.length) === 'reveal' &&
      countValidVotes(q.eligibleUids, votes) >= MIN_VOTES_TO_REVEAL
    ) {
      finalizeQuestion(tx, qRef, { ...q, votedUids }, 'reveal', votes, ctx.now());
      tx.update(qRef, { votedUids });
      return { revealed: true };
    }
    tx.update(qRef, { votedUids });
    return { revealed: false };
  });
}

export async function revealQuestion(ctx: Ctx, input: RevealQuestionInput): Promise<void> {
  const uid = requireAuth(ctx);
  const groupId = requireId(input?.groupId);
  const questionId = requireId(input?.questionId);
  const qRef = ctx.db.doc(`groups/${groupId}/questions/${questionId}`);

  await ctx.db.runTransaction(async (tx) => {
    const group = await getGroupOrFail(ctx.db, tx, groupId);
    requireMember(group, uid);
    const qSnap = await tx.get(qRef);
    if (!qSnap.exists) return fail('not-found', 'not-found');
    const q = qSnap.data() as QuestionDoc;
    if (q.askerUid !== uid && group.data.adminUid !== uid) {
      return fail('not-allowed', 'permission-denied');
    }
    if (q.status !== 'open') return fail('question-closed');
    if (q.votedUids.length < MIN_VOTES_TO_REVEAL) return fail('too-few-votes');
    const votesSnap = await tx.get(
      ctx.db.collection('votes').where('questionId', '==', questionId),
    );
    const votes = votesSnap.docs.map((d) => d.data() as VoteDoc);
    if (countValidVotes(q.eligibleUids, votes) < MIN_VOTES_TO_REVEAL) return fail('too-few-votes');
    finalizeQuestion(tx, qRef, q, 'reveal', votes, ctx.now());
  });
}
