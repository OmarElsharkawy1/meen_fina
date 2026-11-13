import { Timestamp, type DocumentReference, type Firestore } from 'firebase-admin/firestore';
import { countValidVotes, expiryDecision } from '../core/lifecycle';
import { AUTO_REVEAL_MS } from '../shared/constants';
import type { QuestionDoc, VoteDoc } from '../shared/types';
import { finalizeQuestion } from './questions';

/**
 * Finalizes one question in its own transaction. Re-reads the question and its
 * votes, and skips (null) if it vanished or is no longer open.
 */
export async function expireQuestionIfOpen(
  db: Firestore,
  qRef: DocumentReference,
  now: Timestamp,
): Promise<'reveal' | 'expire' | null> {
  return db.runTransaction(async (tx) => {
    const qSnap = await tx.get(qRef);
    if (!qSnap.exists) return null;
    const q = qSnap.data() as QuestionDoc;
    if (q.status !== 'open') return null;
    const votesSnap = await tx.get(db.collection('votes').where('questionId', '==', qRef.id));
    const votes = votesSnap.docs.map((d) => d.data() as VoteDoc);
    const outcome = expiryDecision(countValidVotes(q.eligibleUids, votes));
    finalizeQuestion(tx, qRef, q, outcome, votes, now);
    return outcome;
  });
}

export async function expireOldQuestions(
  db: Firestore,
  now: Timestamp,
): Promise<{ revealed: number; expired: number; failed: number }> {
  const cutoff = Timestamp.fromMillis(now.toMillis() - AUTO_REVEAL_MS);
  const snap = await db
    .collectionGroup('questions')
    .where('status', '==', 'open')
    .where('createdAt', '<=', cutoff)
    .get();
  let revealed = 0;
  let expired = 0;
  let failed = 0;
  for (const doc of snap.docs) {
    try {
      const outcome = await expireQuestionIfOpen(db, doc.ref, now);
      if (outcome === 'reveal') revealed++;
      else if (outcome === 'expire') expired++;
    } catch (err) {
      failed++;
      console.error(
        `expireOldQuestions: failed group=${doc.ref.parent.parent?.id ?? '?'} question=${doc.id}`,
        err,
      );
    }
  }
  return { revealed, expired, failed };
}
