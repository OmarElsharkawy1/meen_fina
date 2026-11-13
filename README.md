# Meen Fina (مين فينا؟)

A bilingual (English/Arabic) installable web app for friend groups: someone asks "who in the group...?", everyone votes anonymously, and the results are revealed once everyone has voted or the question expires. React (Vite, TypeScript) PWA on Firebase (Auth, Firestore, Cloud Functions, Hosting, Web Push).

## Layout

- `web/`: the React PWA (Vite, i18next, service worker for push).
- `functions/`: Cloud Functions (callable API, notifications, expiry, budget kill switch); `functions/src/shared` holds the types and constants the web app imports as `@shared/*`.
- `firestore.rules`, `firestore.indexes.json`, `firebase.json`: Firebase config.
- `docs/`: ops runbook, design spec and implementation plan.

## Prerequisites

- Node 22+
- Java 21 (Firestore emulator)
- firebase-tools 14 or newer: `npm i -g firebase-tools@latest`

## Commands

```
npm install
npm test            # functions core + web + emulator tests
npm run build
npm run typecheck
```

## Local development with emulators

1. Create `functions/.env.local`:
   ```
   KILLSWITCH_SA=killswitch@demo-meen-fina.iam.gserviceaccount.com
   ```
2. Start the emulators:
   ```
   firebase emulators:start --only auth,firestore,functions --project demo-meen-fina
   ```
3. In another terminal start the web app against them:
   ```
   VITE_USE_EMULATORS=1 npm -w web run dev
   ```
4. Open **http://127.0.0.1:5173** (not `localhost`). The auth emulator's redirect sign-in fails cross-site when the app is served from `localhost`.

## Docs

- Production setup and deploy: [docs/ops/firebase-setup.md](docs/ops/firebase-setup.md)
- Design spec: [docs/plans/2026-11-13-friends-vote-design.md](docs/plans/2026-11-13-friends-vote-design.md)
- Implementation plan: [docs/superpowers/plans/2026-11-13-meen-fina.md](docs/superpowers/plans/2026-11-13-meen-fina.md)
