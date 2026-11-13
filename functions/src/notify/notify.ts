import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { GroupDoc, QuestionDoc } from '../shared/types';
import { notificationFor, type NotifyKind } from './messages';

/** Structural subset of firebase-admin's MulticastMessage used here. */
export type MulticastLike = {
  tokens: string[];
  webpush: {
    notification: { title: string; body: string; icon: string };
    fcmOptions: { link: string };
  };
  data: { groupId: string; questionId: string; link: string };
};

/** Structural subset of firebase-admin's BatchResponse; responses[i] matches tokens[i]. */
export type SendResult = {
  responses: Array<{ success: boolean; error?: { code?: string } }>;
};

export type NotifyDeps = {
  db: Firestore;
  /** Called once per recipient user, with all of that user's tokens (one multicast per user). */
  send: (msg: MulticastLike) => Promise<SendResult>;
  /** Absolute https origin of the web app, no trailing slash. */
  appOrigin: string;
};

const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

/** Only the most recent tokens are used; keeps multicast well under FCM's 500 limit. */
const MAX_TOKENS_PER_USER = 10;

export async function pushForQuestionChange(
  deps: NotifyDeps,
  groupId: string,
  questionId: string,
  before: QuestionDoc | null,
  after: QuestionDoc | null,
): Promise<{ sentTo: string[] }> {
  const none = { sentTo: [] as string[] };
  if (!after) return none;

  let kind: NotifyKind;
  let recipients: string[];
  if (!before) {
    kind = 'new';
    recipients = after.eligibleUids.filter((u) => u !== after.askerUid);
  } else if (before.status === 'open' && after.status === 'revealed') {
    kind = 'revealed';
    recipients = after.eligibleUids;
  } else {
    return none;
  }

  const groupSnap = await deps.db.doc(`groups/${groupId}`).get();
  if (!groupSnap.exists) return none;
  const groupName = (groupSnap.data() as GroupDoc).name;
  const link = `${deps.appOrigin}/g/${groupId}/q/${questionId}`;

  const sentTo: string[] = [];
  await Promise.all(
    recipients.map(async (uid) => {
      try {
        const userRef = deps.db.doc(`users/${uid}`);
        const snap = await userRef.get();
        if (!snap.exists) return;
        // User docs are client-writable: validate shapes.
        const u = snap.data() as Record<string, unknown>;
        const all = u.fcmTokens;
        if (!Array.isArray(all) || all.length === 0 || !all.every((t) => typeof t === 'string')) return;
        const muted = Array.isArray(u.mutedGroupIds) ? u.mutedGroupIds : [];
        if (muted.includes(groupId)) return;
        const tokens = (all as string[]).slice(-MAX_TOKENS_PER_USER);
        const lang = u.lang === 'ar' ? 'ar' : 'en';
        const { title, body } = notificationFor(kind, lang, groupName, after.text);

        const result = await deps.send({
          tokens,
          webpush: {
            notification: { title, body, icon: '/icons/icon-192.png' },
            fcmOptions: { link },
          },
          data: { groupId, questionId, link },
        });
        sentTo.push(uid);

        try {
          const dead = tokens.filter((_, i) => {
            const code = result.responses[i]?.error?.code;
            return !result.responses[i]?.success && code !== undefined && DEAD_TOKEN_CODES.has(code);
          });
          if (dead.length > 0) await userRef.update({ fcmTokens: FieldValue.arrayRemove(...dead) });
        } catch (err) {
          console.error(`push token cleanup failed for ${uid}`, err);
        }
      } catch (err) {
        console.error(`push failed for ${uid}`, err);
      }
    }),
  );
  return { sentTo: sentTo.sort() };
}
