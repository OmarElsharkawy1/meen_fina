# Meen Fina (مين فينا؟) — design

*Name **[decided]**: "Meen Fina" in English and "مين فينا؟" in Arabic, meaning "which one of us?". Each UI language shows its own form.*
*Date: 2026-11-13. Status: approved 2026-11-13 (review fixes applied: real spend cap, small-group winners-only results, 48h auto-reveal, share-link rewrite).*

Each item is marked **[decided]** if the user chose it, or **[my call]** if Claude proposed it and the user hasn't objected (reviewable).

---

## 1. Intent: what this is and why

The idea came from a trip. Friends kept asking each other things like "who was your favourite person on the trip?" This app turns that into a game. A friend group lives in one place, anyone can ask a "who…?" question, everyone answers by picking someone from the group, and the payoff is a **leaderboard** that is revealed to everyone at once.

It's used in two ways **[decided]**:
- **Together:** everyone is in the same room. Votes come in within seconds and the reveal happens live on every phone.
- **Apart:** a question stays open over hours or days. Notifications pull people back in.

**Success looks like this:**
- A friend taps a link in WhatsApp and is inside the group, signed in, within about 15 seconds.
- Voting takes two taps.
- The reveal is a fun shared moment.
- The bill stays at $0.

## 2. Goals, non-goals, anti-goals

**Goals (v1)**
- Create a group, join it with a code or link, and manage members as admin.
- Post a question, vote for one member, and see a leaderboard revealed when everyone has voted.
- Live updates while together, push notifications while apart.
- Arabic and English, including right-to-left layout.
- Installable PWA that works in mobile browsers on Android and iPhone.

**Non-goals (not in v1)** **[my call]**
- Comments or reactions on questions.
- All-time or cross-question stats ("most voted overall").
- Question types other than "pick one person from the group".
- Native Android/iOS apps.
- Profile editing or photo uploads. The Google name and photo are used as-is.
- Public groups, search or discovery.
- Reminder notifications to people who haven't voted.

**Anti-goals (any of these makes it a failure, even if it "works")**
- **Leaked votes.** Nobody may ever be able to find out who voted for whom, including by inspecting network traffic or the database from a browser. This has to be enforced on the server, not just hidden in the UI.
- **Peeking.** Nobody may see any tally before the reveal.
- **Slow first open.** A heavy first load when a friend taps the WhatsApp link on mobile data.
- **Surprise bills.**

## 3. Constraints

- **Platform:** a PWA, mobile-first, used mainly in mobile Safari and Chrome and as a home-screen app.
- **iPhone notifications:** web push on iOS only works after the user adds the app to the home screen (iOS 16.4+). The app has to guide iPhone users through this.
- **iPhone storage:** Safari and the home-screen app keep separate storage on iOS. This is one reason identity is tied to Google sign-in rather than the device.
- **Languages:** Arabic and English UI **[decided]**. The whole layout mirrors for Arabic.
- **Backend budget:** Firebase on the pay-as-you-go (Blaze) plan **[decided]**.
  - A **$1/month spend cap** **[decided]**. Google Cloud has no built-in hard cap per service and budgets only alert, so the cap is built from two parts **[decided: both]**:
    - **Kill switch:** a $1 billing budget publishes to a Pub/Sub topic; a small function disables billing on the project when actual cost goes over $1. This takes the backend offline until billing is re-enabled by hand, which is the intended trade.
    - **Instance limits:** every function sets a low `maxInstances` (2), so a bug or abuse can't fan out.
  - Stay inside the free quotas: Firestore 50K reads and 20K writes per day, Functions 2M invocations per month, FCM free.
  - Do **not** use Cloud Storage.
  - Set an Artifact Registry cleanup policy so old function images don't accumulate storage charges.
- **Build:** built by Claude Code. The user is a Flutter developer, but React was chosen (see below).

## 4. Approaches considered

| # | Approach | Trade-offs | Outcome |
|---|---|---|---|
| 1 | **React (Vite) PWA + Firebase** | Light first load; mature PWA tooling (install, service worker, push); browser-native RTL. Firebase covers Google auth, realtime and push in one place. Needs the Blaze plan with a card (stays $0 at this scale). Not the user's Flutter stack. | **Chosen** **[decided]** |
| 2 | Flutter web + Firebase | The user's own language, and could become native apps later. But the first load is heavy (CanvasKit alone is ~1.5 MB), and Flutter no longer generates a service worker, so install, push and caching would be hand-built. | Rejected: first open via a link matters most. |
| 3 | React PWA + Supabase | No card needed, and database rules suit anonymous votes. But free projects pause after about a week of low activity, so the app would go offline between trips. | Rejected |
| 3b | Firebase free (Spark) plan, no server code | No card. Notifications are dropped and replaced by a "Share to WhatsApp" button. | Rejected by the user in favour of real notifications with a $1 cap. |

## 5. How it works

### 5.1 Identity
- **Google sign-in** is the only way in **[decided]**. Each person's Google display name and photo are their identity in every group **[my call]**.
- One account can belong to **several groups**, for example one per trip or friend circle **[my call]**.

### 5.2 Groups and joining
- **Create a group [decided].** A signed-in user creates a group with a name. They become its **admin**, and a **join code** is generated.
- **Code format [my call].** 6 characters, uppercase letters and digits, leaving out the easily confused 0/O and 1/I. Example: `K7P2QX`.
- **Share link [my call].** The link has the code built in (e.g. `https://<host>/j/K7P2QX`), so friends tap it instead of typing. There is also a "Join with code" screen.
- **Join flow [decided + my call].**
  1. Open the link or enter the code.
  2. See the group name and member count.
  3. Sign in with Google, or skip this step if already signed in.
  4. You're in.
  - If you're already a member, the link takes you straight to the group.
- **Admin powers.**
  - **Kick a member** **[decided]**. A kicked person loses access and can't rejoin with any code. An admin-only "Removed members" list has an "Allow back" action **[my call]**.
  - **Turn the code off** **[decided]**. Anyone trying to join then sees "This code is no longer active".
  - **Regenerate the code** **[my call]**. The old code stops working immediately.
  - **Hand over admin** to another member **[my call]**.
- **Leaving [my call].** Any member can leave. The admin must hand over admin first, unless they're the last member, in which case the group is deleted.
- **Limits [my call].** At most 50 members per group. A question can only be posted when the group has **at least 3 members**, because with 2 people anonymity is meaningless.

### 5.3 Questions
- **Anyone** in the group can post a question **[decided]**. It's plain text, max 150 characters, in any language. Each question shows in the direction it was written, so mixed Arabic and English text renders correctly **[my call]**.
- **The asker's name is shown** on the question **[my call]**.
- **Questions can't be edited** once posted, since that would invalidate votes. The asker can delete their own question, and the admin can delete any question **[my call]**.
- **Several questions can be open at once [my call].**

### 5.4 Voting
- **Who votes.** Everyone who was a member when the question was posted, **including the asker** **[my call]**.
- **Who can be picked.** The same set of members. **You can't pick yourself** **[my call]**.
- **One vote per person per question.** You can change it until results are revealed **[my call]**.
- **Late joiners [my call].** Someone who joins after a question was posted sees it, but can't vote and doesn't appear on its leaderboard. Eligibility is fixed when the question is posted.
- **Members who are kicked or leave while a question is open [my call].** Their vote is removed, they're removed from that question's candidates, and the "x of y" count drops. Votes other people cast *for* them become void but those voters still count as "voted" — moving them back to "pending" would reveal who picked the person who left. If void votes leave fewer than 3 valid votes at reveal time, the question expires instead of revealing. A stranger who got in through a leaked code therefore leaves no trace. Questions that were already revealed keep their results unchanged.
- **Before the reveal, everyone sees:**
  - a counter, e.g. "5/7 voted";
  - **whose vote is still missing**, shown as avatars, so friends can chase stragglers. This shows only *who* hasn't voted, never *for whom* anyone voted **[my call]**.
  - No tallies of any kind.

### 5.5 Reveal and results
- **Automatic reveal.** Results are revealed to everyone at once as soon as the last eligible voter votes **[my call]**.
- **Early reveal [my call].**
  - The asker or the admin can reveal before everyone has voted.
  - This is only allowed once **at least 3 votes** are in, to protect anonymity.
  - Late voters can't vote after the reveal.
- **The leaderboard [decided].**
  - **All** eligible members are listed, sorted by votes, highest first. Members with 0 votes are at the bottom.
  - It shows vote counts only. **Who voted for whom is never shown** **[my call]**.
  - Members with the same count share a rank, and tied leaders all get the top marker **[my call]**.
- **Small questions show only the winner [decided].** When a question has **fewer than 5 eligible voters** at reveal time, the result shows only the winner (or tied winners), **with no vote counts and no ranking of the others** **[my call: no counts]**. With so few voters, full counts let members work out who voted for whom. The server stores only the winner list for these questions, so the full tally never exists anywhere a client can read. Some deduction is still possible in a 3-person group; this is accepted.
- **48-hour auto-reveal [decided].** A question still open 48 hours after it was posted is closed automatically (checked hourly, so within ~1 hour of the 48h mark):
  - if it has **at least 3 votes**, it is revealed as normal;
  - otherwise it is marked **expired** and shows "Not enough votes" with no results **[my call]**.
- **Too few voters left [my call].** If members leave or are kicked so a question has fewer than 3 eligible voters, it can never reach 3 votes, so it expires immediately. Auto-reveal also requires at least 3 votes.
- **Once revealed, results are final** and stay in the group's history **[my call]**.

### 5.6 Group screen (sketch) [my call]

```
Dahab trip                  ⚙
─────────────────────────────
OPEN
Who'd survive alone on an island?
  asked by Karim · 5/7 voted   [Vote]
─────────────────────────────
REVEALED
Who was your fav person?
  🥇 Karim · 4 votes
Who snored the most?
  🥇 Omar · 3 votes
─────────────────────────────
           [ + Ask ]
```

- Open questions are on top, newest first. Revealed questions are below as history.
- Tapping an open question shows the vote picker: a member grid with photos, minus yourself, plus the counter and pending avatars.
- Tapping a revealed question shows the full leaderboard.
- The ⚙ screen (members, code, leave) has extra controls for the admin.
- A home screen lists the user's groups, with buttons to create and join.

### 5.7 Notifications [decided: real push; details my call]
- **Events:**
  - A new question is posted. This goes to all eligible members except the asker.
  - Results are revealed. This goes to all eligible members.
- **Language:** each notification is written in the recipient's chosen app language.
- **Muting:** a **per-group mute** toggle for the user's own notifications.
- **When to ask for permission:** in context, after joining a group or casting a first vote. Never on first page load.
- **iPhone:** if the app is running in Safari rather than from the home screen, show a short "Add to Home Screen to get notifications" guide instead of the permission prompt.
- Tapping a notification opens that question.

### 5.8 Languages [decided: Arabic + English; details my call]
- The app starts in the phone's language: Arabic if the phone is in Arabic, otherwise English. There's a manual switch in settings.
- In Arabic the whole layout mirrors right-to-left.
- The chosen language is stored on the user's profile so notifications use it too.

## 6. Technical shape

Parts already decided are marked; the rest is the builder's call.

- **Frontend:** React + Vite + TypeScript, as an installable PWA **[decided: React PWA]**.
  - Use a single service worker that handles both caching and FCM push. There can only be one per scope.
- **Firebase services [decided]:**
  - Authentication with the Google provider.
  - Cloud Firestore.
  - Cloud Functions (2nd gen).
  - Cloud Messaging (web push).
  - Hosting.
  - Use the default `*.web.app` domain for v1.
  - Hosting rewrites every path (including `/j/<code>` share links) to the single-page app.
- **Vote secrecy, the key requirement:**
  - Individual votes are stored where **no client can read or write them**: Firestore rules deny all client access.
  - Voting, changing a vote, revealing, joining, kicking, code changes and leaving all go through **server functions** that check membership and permissions.
  - The question document holds only public state: text, asker, eligible members, vote count, which members have voted, status, and, after the reveal, the final per-member totals.
  - Running tallies are never readable by clients before the reveal.
- **Google sign-in in an installed iPhone PWA is known to be fragile.** Serve the app from the same domain as the Firebase auth domain (Firebase Hosting does this), and test sign-in specifically in iOS home-screen mode.
- **Region:** choose a European region for Firestore and Functions, the closest practical option to Egypt. Exact region is the builder's call.
- **Cost guardrails:** set these up as part of the build, not as an afterthought.
  - The $1 billing budget wired to the kill-switch function, and `maxInstances: 2` on every function.
  - An Artifact Registry cleanup policy.
  - Realtime listeners scoped to the current group only, to keep reads low.

## 7. Left to the builder

- Visual design, component library, colours and typography. Keep it fun, light and fast.
- Exact Firestore data model and function boundaries, within the secrecy rules above.
- Testing approach. The vote-secrecy security rules and the functions' permission checks must have tests.
- App icon and logo. The name is decided; the icon should read well small and in both languages.
- Exact Firebase region.
