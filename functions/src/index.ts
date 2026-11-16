import * as logger from 'firebase-functions/logger';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { auth, cloudbilling } from '@googleapis/cloudbilling';
import { defineString } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { handleBudgetMessage, parseBudgetPayload } from './billing/killSwitch';
import { ctxFromRequest } from './handlers/ctx';
import * as expiry from './handlers/expiry';
import * as groupsHandlers from './handlers/groups';
import * as membership from './handlers/membership';
import * as profile from './handlers/profile';
import * as questionsHandlers from './handlers/questions';
import { pushForQuestionChange } from './notify/notify';
import { REGION } from './shared/constants';
import type { QuestionDoc } from './shared/types';

initializeApp();
setGlobalOptions({ region: REGION, maxInstances: 2 });

export const createGroup = onCall(async (req) => groupsHandlers.createGroup(ctxFromRequest(req), req.data));
export const previewGroup = onCall(async (req) => groupsHandlers.previewGroup(ctxFromRequest(req), req.data));
export const joinGroup = onCall(async (req) => groupsHandlers.joinGroup(ctxFromRequest(req), req.data));
export const askQuestion = onCall(async (req) => questionsHandlers.askQuestion(ctxFromRequest(req), req.data));
export const deleteQuestion = onCall(async (req) => questionsHandlers.deleteQuestion(ctxFromRequest(req), req.data));
export const castVote = onCall(async (req) => questionsHandlers.castVote(ctxFromRequest(req), req.data));
export const revealQuestion = onCall(async (req) => questionsHandlers.revealQuestion(ctxFromRequest(req), req.data));
export const leaveGroup = onCall(async (req) => membership.leaveGroup(ctxFromRequest(req), req.data));
export const kickMember = onCall(async (req) => membership.kickMember(ctxFromRequest(req), req.data));
export const unbanMember = onCall(async (req) => membership.unbanMember(ctxFromRequest(req), req.data));
export const setCodeActive = onCall(async (req) => membership.setCodeActive(ctxFromRequest(req), req.data));
export const regenerateCode = onCall(async (req) => membership.regenerateCode(ctxFromRequest(req), req.data));
export const setDisplayName = onCall(async (req) => profile.setDisplayName(ctxFromRequest(req), req.data));
export const transferAdmin = onCall(async (req) => membership.transferAdmin(ctxFromRequest(req), req.data));

export const expireQuestions = onSchedule(
  { schedule: 'every 60 minutes', timeZone: 'Etc/UTC' },
  async () => {
    const res = await expiry.expireOldQuestions(getFirestore(), Timestamp.now());
    logger.info('expireQuestions done', res);
  },
);

export const notifyQuestions = onDocumentWritten(
  'groups/{groupId}/questions/{questionId}',
  async (event) => {
    const before = (event.data?.before.exists ? event.data.before.data() : null) as QuestionDoc | null;
    const after = (event.data?.after.exists ? event.data.after.data() : null) as QuestionDoc | null;
    await pushForQuestionChange(
      {
        db: getFirestore(),
        send: (m) => getMessaging().sendEachForMulticast(m),
        appOrigin: process.env.APP_ORIGIN ?? `https://${process.env.GCLOUD_PROJECT}.web.app`,
      },
      event.params.groupId,
      event.params.questionId,
      before,
      after,
    );
  },
);

const killswitchSa = defineString('KILLSWITCH_SA');

export const budgetKillSwitch = onMessagePublished(
  { topic: 'billing-budget', serviceAccount: killswitchSa },
  async (event) => {
  const payload = parseBudgetPayload(event.data.message.data);
  if (!payload) {
    logger.error('budgetKillSwitch: unparseable payload');
    return;
  }
  const projectId = process.env.GCLOUD_PROJECT;
  if (!projectId) {
    logger.error('budgetKillSwitch: GCLOUD_PROJECT not set');
    return;
  }
  const name = `projects/${projectId}`;
  const billing = cloudbilling({
    version: 'v1',
    auth: new auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-billing'] }),
  });
  const result = await handleBudgetMessage(payload, {
    projectId,
    getBillingEnabled: async () =>
      Boolean((await billing.projects.getBillingInfo({ name })).data.billingEnabled),
    disableBilling: async () => {
      await billing.projects.updateBillingInfo({ name, requestBody: { billingAccountName: '' } });
    },
  });
  logger.warn('budgetKillSwitch result', { result, ...payload });
});
