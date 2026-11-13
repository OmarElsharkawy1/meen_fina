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
      const userRef = deps.db.doc(`users/${uid}`);
      const snap = await userRef.get();
      if (!snap.exists) return;
      // User docs are client-writable: validate shapes.
      const u = snap.data() as Record<string, unknown>;
      const tokens = u.fcmTokens;
      if (!Array.isArray(tokens) || tokens.length === 0 || !tokens.every((t) => typeof t === 'string')) return;
      const muted = Array.isArray(u.mutedGroupIds) ? u.mutedGroupIds : [];
      if (muted.includes(groupId)) return;
      const lang = u.lang === 'ar' ? 'ar' : 'en';
      const { title, body } = notificationFor(kind, lang, groupName, after.text);

      const result = await deps.send({
        tokens: tokens as string[],
        webpush: {
          notification: { title, body, icon: '/icons/icon-192.png' },
          fcmOptions: { link },
        },
        data: { groupId, questionId, link },
      });
      sentTo.push(uid);

      const dead = (tokens as string[]).filter((_, i) => {
        const code = result.responses[i]?.error?.code;
        return !result.responses[i]?.success && code !== undefined && DEAD_TOKEN_CODES.has(code);
      });
      if (dead.length > 0) await userRef.update({ fcmTokens: FieldValue.arrayRemove(...dead) });
    }),
  );
  return { sentTo: sentTo.sort() };
}
