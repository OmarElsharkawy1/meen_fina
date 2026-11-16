import type { DocumentReference } from 'firebase-admin/firestore';
import { DISPLAY_NAME_MAX_LEN, RENAME_CLOSED_LIMIT } from '../shared/constants';
import type { QuestionDoc, SetDisplayNameInput, SetDisplayNameOutput } from '../shared/types';
import { fail, requireAuth, type Ctx } from './ctx';

const BATCH_SIZE = 400;

/** Trims and collapses whitespace; null when the result is empty or too long. */
export function cleanDisplayName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.replace(/\s+/g, ' ').trim();
  if (name.length === 0 || name.length > DISPLAY_NAME_MAX_LEN) return null;
  return name;
}

/**
 * Sets the caller's display name and rewrites it wherever others see it:
 * their member entry in every group, each group's open questions, and its
 * most recent closed questions. Older closed questions keep the old name.
 */
export async function setDisplayName(
  ctx: Ctx,
  input: SetDisplayNameInput,
): Promise<SetDisplayNameOutput> {
  const uid = requireAuth(ctx);
  const name = cleanDisplayName(input?.name);
  if (name === null) return fail('invalid-input', 'invalid-argument');

  // Saved first, so groups joined from now on use it even if a later write fails.
  await ctx.db.doc(`profiles/${uid}`).set({ name });
  await ctx.db.doc(`users/${uid}`).set({ displayName: name }, { merge: true });

  const updates: { ref: DocumentReference; path: string }[] = [];
  const groups = await ctx.db.collection('groups').where('memberUids', 'array-contains', uid).get();
  for (const group of groups.docs) {
    updates.push({ ref: group.ref, path: `members.${uid}.name` });
    const questions = group.ref.collection('questions');
    const [open, closed] = await Promise.all([
      questions.where('status', '==', 'open').get(),
      questions
        .where('status', 'in', ['revealed', 'expired'])
        .orderBy('closedAt', 'desc')
        .limit(RENAME_CLOSED_LIMIT)
        .get(),
    ]);
    for (const q of [...open.docs, ...closed.docs]) {
      if ((q.data() as QuestionDoc).people?.[uid]) {
        updates.push({ ref: q.ref, path: `people.${uid}.name` });
      }
    }
  }

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = ctx.db.batch();
    for (const u of updates.slice(i, i + BATCH_SIZE)) batch.update(u.ref, { [u.path]: name });
    await batch.commit();
  }
  return { name };
}
