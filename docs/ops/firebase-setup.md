# Meen Fina: Firebase setup runbook

Manual, one-time setup. Replace `<id>` with your Firebase project id and `<project-number>` with its numeric project number (Firebase console, Project settings, General).

1. **Create the project.** In the Firebase console create a project named `meen-fina` (use the suggested id if `meen-fina` is taken). Note the id as `<id>`.
2. **Upgrade to Blaze.** Cloud Functions 2nd gen requires the pay-as-you-go plan. Attach a billing account. Expected cost for friend-group use is near zero; the kill switch in steps 8-10 and 13 caps it.
3. **Authentication.** Build, Authentication, Get started, Sign-in method, enable **Google**. Then Settings, Authorized domains, add `<id>.web.app` (and `<id>.firebaseapp.com` is there by default).
   Also allow the redirect sign-in: Google Cloud console, APIs & Services, Credentials, open **Web client (auto created by Google Service)**. Under **Authorized JavaScript origins** add `https://<id>.web.app`, and under **Authorized redirect URIs** add `https://<id>.web.app/__/auth/handler`. Save (it can take a few minutes to apply). Without this, sign-in fails with `redirect_uri_mismatch`.
4. **Firestore.** Build, Firestore Database, Create database. Location `europe-west1`, start in **production mode**. Rules are deployed from the repo later.
5. **Register the web app.** Project settings, Your apps, Add app, Web. Copy the config into `web/.env.local`:
   ```
   VITE_FB_API_KEY=...
   VITE_FB_AUTH_DOMAIN=<id>.web.app
   VITE_FB_PROJECT_ID=<id>
   VITE_FB_APP_ID=...
   VITE_FB_MESSAGING_SENDER_ID=...
   VITE_FB_VAPID_KEY=...      # from step 6
   ```
6. **Web Push key.** Project settings, Cloud Messaging, Web configuration, **Generate key pair**. Paste the public key as `VITE_FB_VAPID_KEY`.
7. **Custom domain only:** if the app is served from a domain other than `<id>.web.app`, add `APP_ORIGIN=https://your.domain` to `functions/.env.<id>` so notification links point to it. Skip otherwise.
8. **Enable the Cloud Billing API.** Google Cloud console for the project, APIs & Services, Library, search "Cloud Billing API", Enable. The kill switch uses it.
9. **Create the budget.** Google Cloud console, Billing, Budgets & alerts, Create budget. Scope: this project. Amount: **$1 (or the equivalent in your billing account's currency)**. On the last page tick **Connect a Pub/Sub topic to this budget** and create/select the topic `billing-budget` (same project). The budget publishes messages with `costAmount` and `budgetAmount`.
10. **Dedicated kill-switch service account.**
    1. Google Cloud console, IAM & Admin, Service accounts, Create: id `billing-killswitch` (email `billing-killswitch@<id>.iam.gserviceaccount.com`). No project roles needed.
    2. Billing, Account management (select the billing account), Permissions, Add principal: that service account, role **Billing Account Administrator**. Without this the kill switch cannot disable billing.
    3. The service account may also need `roles/logging.logWriter` (project IAM) so the function's log lines appear. If the trigger fails with permission errors in the logs, also grant it `roles/eventarc.eventReceiver` and `roles/run.invoker`.
    4. Create `functions/.env.<id>` containing `KILLSWITCH_SA=billing-killswitch@<id>.iam.gserviceaccount.com`. This file is gitignored and lives only on the machine you deploy from; keep it there.
11. **Deploy.** Requires firebase-tools 14 or newer (`npm i -g firebase-tools@latest`, check with `firebase --version`). From the repo root:
    1. Make sure `web/.env.local` is fully filled (step 5); Vite bakes these values into the build.
    2. `firebase login`, then `firebase use --add <id>` and give it the alias `default`.
    3. `npm run build` (builds functions and web).
    4. `firebase deploy --only firestore,functions,hosting`.
12. **Cleanup policy for build images.** After the first deploy, run:
    ```
    firebase functions:artifacts:setpolicy --days 1
    ```
    This stops old container images from accruing storage cost.
13. **Test the kill switch safely (0.5 message only).** Pub/Sub, Topics, `billing-budget`, Messages, Publish message, body:
    ```
    {"costAmount": 0.5, "budgetAmount": 1}
    ```
    Check the `budgetKillSwitch` logs: it must show the `under-budget` log line and change nothing. If the line is missing, revisit the roles in step 10. **Do NOT publish `costAmount: 1.5`** unless you intend to: that really disables billing on the project (see below to undo).

## Warning

When the kill switch fires, billing is **detached from the project**. All backend services (functions, Firestore writes beyond free limits, messaging) stop until you re-enable billing. This is intentional; it is the spend cap.

## Re-enabling billing after the kill switch fires

1. Firebase console, project, **Usage and billing**, **Modify plan**, choose Blaze and select your billing account. (Alternative: Google Cloud console, Billing, **My projects**, project menu, **Change billing**, pick the account, **Set account**.)
2. Check the cause of the spend (Billing reports) before re-enabling. Budget notifications repeat during the month, so cost above the budget will trigger the switch again; raise the budget amount first if you accept the higher spend.
3. Some functions may need a redeploy after a long outage: `firebase deploy --only functions`.
