# Plan & progress

_Last updated: 2026-11-10 · Branch: `uat` · Full roadmap & audit: [`VYBE_AUDIT_AND_ROADMAP.md`](VYBE_AUDIT_AND_ROADMAP.md)_

---

## ▶ Resume here (next session)

**Where we stopped:** Phase 3 backend + app are built and running on UAT. Tested on a real iPhone and Android phone via Expo Go (two accounts: friends, I'm free, join, chat). Last work: tab badges, unread chats, app-icon badge, custom notification sounds.

**Do first next session**
1. **Re-test on both phones** (reload in Expo Go) — check: Android Add friend / Friend / I'm free screens open; chat keyboard on Android; live friend-request updates; tab badges (Home / Chats / Friends); unread pill per chat.
2. ~~Deploy Edge Functions to UAT~~ ✅ done 2026-11-11 (`delete-account`, `push`; push secret in Vault). Verified by smoke test + pg_net responses.
3. **Pick the next track** (Claude's suggestion in order):
   - a. **Android dev build** (EAS) → real push notifications + custom sounds on Android. Needs a free **Firebase** project (`google-services.json`) and `eas init` (links an Expo project → `projectId`).
   - b. **Sentry** crash reporting.
   - c. **Premium paywall UI** (RevenueCat SDK wired, no real purchases until store accounts exist).
   - d. Tidy: Android shows the screen name twice on the full-screen "sheets" (header + in-page title).

**Waiting on you (no rush, but long lead times)**
| Item | Unblocks | Note |
|---|---|---|
| **D-U-N-S number** → Apple Developer (org, US$99/yr) + Google Play Console (org, US$25) | iPhone push, test builds, App Store / Play, payments | D-U-N-S takes 1–3 weeks — start this first |
| Twilio **Account SID** (`AC…`) + **Auth Token** + **Verify Service SID** (`VA…`) | Phone OTP login | API key `SK…` already in `.env` but Supabase needs the above |
| Email provider (e.g. **Resend**) + **domain** (e.g. vybe.app) | Real users receiving login codes | Free-plan Supabase mailer: links only, team only, 2/hour |
| Trademark / store-name check for "VYBE" | Final bundle ID `app.vybe.mobile`, brand work | |
| Firebase project (free) | Android push | Only if we do track 3a |

---

## How to run & test (UAT)

**Testers without your Mac (Android):** install the VYBE test app (APK) from the EAS build link
(Expo dashboard → project `@vishal675/vybe` → Builds). The installed app pulls new JS from the `uat` update channel on launch:

```bash
cd mobile && npm run update:uat -- --message "what changed"   # ship JS/UI changes to installed test apps (no reinstall)
cd mobile && npm run build:android:uat                         # new APK — only needed after native changes (new native module, app.json plugins/permissions)
```
iPhone testers: Expo Go via `npm start` until the Apple Developer account exists (then an iOS internal build).


```bash
cd mobile && npm start                               # scan QR: iPhone camera / Android inside Expo Go
supabase/scripts/dev-login-code.sh you@email.com     # 6-digit login code (UAT only; use "I have a test code" in the app)
supabase/scripts/test-db.sh                          # SQL security tests on UAT (rolled back)
supabase/scripts/test-db.sh --with-pending           # dry-run unpushed migrations + tests (rolled back)
node supabase/scripts/smoke.mjs                      # end-to-end API test, 2 throwaway users (~31 checks)
cd mobile && npm run typecheck && npm run lint && npm test   # app checks (50 unit tests)
cd mobile && npm run gen:types                       # regenerate DB types after a migration (run from mobile/)
```

**Database changes:** add a file in `supabase/migrations/`, run `test-db.sh --with-pending`, then
`set -a && source .env && set +a && npx -y supabase@latest db push --remote --yes -p "$SUPABASE_DB_PASSWORD"`,
then `npm run gen:types`. New tables must `revoke all … from anon, authenticated` and grant explicitly (Supabase's defaults grant everything).

**Secrets:** root `.env` (Supabase DB password, access token, Twilio key) and `mobile/.env.local` (public URL + publishable key) — both git-ignored. Rotate the DB password + access token before production (they were shared in chat).

---

## Decisions

| Topic | Decision |
|---|---|
| Market | India first, then global 1–2 weeks later |
| Mobile | Expo SDK 58, React Native 0.88, TypeScript, Expo Router (native tabs), TanStack Query |
| Backend | Supabase — Postgres + RLS, Auth, Realtime, Storage, Edge Functions, pg_net + Vault |
| Login | Apple, Google, email OTP, phone OTP — all before launch. Today: email OTP only |
| Age | 18+ (checked server-side; date of birth not stored) |
| Contact discovery | Deferred until phone numbers are verified by OTP |
| Chat | Meetup chats (open when a friend joins, read-only after the plan ends, 24 h history) |
| Push | DB trigger → pg_net → `push` Edge Function → Expo Push → APNs / FCM |
| Expiry | Server clock (`now()`) + user's timezone; app syncs clock offset |
| Name | **VYBE** (pending trademark check); app ID `app.vybe.mobile` set in `app.json` (can still change before the first store upload) |
| EAS | Project `@vishal675/vybe` (ID `f2a9bdf9-…`); profiles `preview` (Android APK, channel `uat`) and `production`; runtime version = fingerprint |
| Payments | RevenueCat + Apple IAP + Google Play Billing; 7-day trial on annual |
| Free vs Premium | Free: everything social + 2 groups. Premium: unlimited groups (+ more later). Enforced server-side |
| Branches | All work + testing on `uat` (UAT DB) → when UAT passes, merge to `prod` and apply migrations to prod DB |
| Supabase UAT | ref `qwbqzasmyatjnmnuwrun` (labelled "production" by Supabase — rename to "VYBE UAT"). Prod project: create later |

---

## Status

### ✅ Done
**Backend (UAT)** — migrations in `supabase/migrations/`
- `20261110120000_core_schema` — profiles, settings, friendships, blocks, circles, availabilities, recipients, joins, meetup chat, push tokens, reports, entitlements, subscription events, avatars bucket; RLS everywhere; RPCs (onboarding, friends, block, go_free, free_now, join, my_status, push tokens)
- `20261111090000_meetups_push_account` — my_meetups / meetup_thread / meetup_participants, chat rate limit (30/min), push dispatch triggers (free / join / message), reports survive account deletion
- `20261112090000_friendships_realtime` — live friend requests/accepts (INSERT/UPDATE only; never subscribe to DELETE)
- `20261113090000_unread_badges` — meetup_reads + mark_meetup_read, unread_count, badge_count_for (service role), friend-request push
- Edge Functions (code ready, **not deployed**): `delete-account` (JWT), `push` (shared secret; sounds, Android channels, badge, quiet hours, dead-token pruning)
- UAT auth: email OTP 6 digits / 10 min, site URL `vybe://`

**App** (`mobile/`)
- Sign-in (email code), onboarding (name, username, DOB 18+), session in SecureStore (chunked)
- Home: I'm Free / I'm Busy / hold-to-reuse, free-now list, I'm in / Leave, Open chat
- Friends: add by exact username, invite (share), requests accept/decline/cancel, remove, block, report; groups (2 free, 🔒 beyond)
- Chats: list with unread pills, chat screen (realtime, optimistic send, pagination, report message, read-only when ended)
- Profile: edit name/username/photo, log out, delete account
- Badges: Home (new free friends), Chats (unread), Friends (requests); app-icon badge
- Push client: token registration (skipped in Expo Go), tap routing, Android channels with custom sounds (`assets/sounds/`), no ping for the chat you're reading
- Android fixes: sheets → full screens, keyboard (edge-to-edge) on chat / sign-in / onboarding / edit profile
- iOS fixes: content behind header on Edit profile / Group / Chat

**Quality**
- SQL tests T1–T16 · smoke test (incl. live chat delivery + storage permissions) · 50 unit tests · CI (typecheck, lint, tests, secret scan) · Prettier config (`mobile/.prettierrc`)

### ⏳ Not done yet
- Deploy Edge Functions to UAT (see Resume here)
- EAS project + dev builds (Android first), real push on devices
- Sentry crash reporting, analytics (PostHog)
- Apple / Google / phone login; custom SMTP
- Privacy, notifications, blocked-users settings screens (rows show "Coming soon"); QR add
- Premium: RevenueCat, paywall, webhook → `entitlements`
- VYBE brand (icon, wordmark, colours) after trademark check; bundle ID change
- Legal pages (privacy, terms), store listings, prod Supabase project, `prod` branch

### Known issues / notes
- Android: full-screen "sheets" show the title twice (header + page heading)
- Unfriend / decline don't update live on the other phone (by design — DELETE events can't be private); Friends tab refreshes on open and every 60 s
- Expo Go can't receive VYBE pushes or play custom sounds — needs a dev build
- `supabase gen types` must run from the repo root (use `npm run gen:types`)

---

## Roadmap (remaining phases)
3. Production fixes — remaining: dev builds, Sentry, analytics, settings screens, social logins, SMTP
4. Subscriptions — RevenueCat + store products + webhook + paywall + sandbox test matrix (roadmap §9)
5. VYBE branding — after trademark check
6. Test, security review, store prep, staged release (nothing published without approval)
