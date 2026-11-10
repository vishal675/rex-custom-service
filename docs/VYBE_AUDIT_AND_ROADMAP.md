# VYBE — Repository audit & production roadmap

_Prepared 2026-11-10 · Phase 1 (audit) + Phase 2 (roadmap) · Status: **awaiting approval** — no code has been changed._

---

## 1. Executive summary

The repository is a **well-built clickable prototype**, not yet an MVP. The UI, design system and availability logic are good-quality and worth keeping. **There is no backend yet**: no auth, no database tables, no friends, no notifications. Every friend, circle, chat and "free" state is mock data held in memory.

**Recommendation:** keep the stack (Expo + Supabase). It is a sound, cost-effective choice for this product, and nothing here justifies a rewrite. Most of the work ahead is **building** the backend and production layers. Very little of it is fixing existing code.

| Area | State today | Verdict |
|---|---|---|
| Mobile app (Expo SDK 58, RN 0.88, Expo Router, TypeScript) | Screens, navigation, design system, animations | ✅ Keep |
| Availability logic (`model.ts`) | Pure functions, 14 unit tests pass | ✅ Keep, move expiry authority to the server |
| Backend (Supabase) | `config.toml` only. **No migrations, no tables, no RLS, no functions.** `supabase-js` installed but never imported | 🔴 Build |
| Auth | None (`MOCK_ME` hardcoded) | 🔴 Build |
| Friends / circles / requests | Mock data | 🔴 Build |
| Notifications | None | 🔴 Build |
| Meetup chat | Mock list, rows do nothing | 🔴 Build |
| Settings, block, report, account deletion | "Coming soon" alerts | 🔴 Build |
| Payments / Premium | None | 🔴 Build |
| Crash reporting, analytics, monitoring | None | 🔴 Build |
| Build/release (EAS, `eas.json`, OTA updates) | None | 🔴 Build |
| Branding | Working name "Pingo", lime/ink palette | 🟡 Rebrand to VYBE |
| Legal (privacy, terms, DPDP/GDPR) | None | 🔴 Build |

Checks run during the audit: `tsc --noEmit` ✅ · `expo lint` ✅ · `jest` ✅ 14/14.

---

## 2. Audit findings

### 2.1 What is good and must be preserved
- **Design system** (`mobile/src/theme/tokens.ts`): tokens for colour (light and dark), type, spacing and radii, with no hard-coded values in components. This can be rebranded by changing tokens, not screens.
- **UI kit** (`mobile/src/components/ui/`): Button, Chip, Avatar with "free" ring, Segmented, ListRow, Screen, PressableScale with haptics.
- **Core UX**: animated I'M FREE button with countdown ring, hold-to-reuse-last, "Go free" sheet (activity / duration / who sees it), "Free right now" list, I'M BUSY.
- **Availability model** (`features/availability/model.ts`): pure and tested. Expiry is derived from time, not from timers, so a user can't get stuck as "free".
- **Sound earlier decisions** in `docs/PLAN.md`: contact discovery deferred until phone numbers are verified, secrets kept out of git, publishable key only in the app.
- **Secrets hygiene**: `.env` and `.env.local` are git-ignored, and only placeholders are committed.

### 2.2 Issues found

| # | Severity | Finding | Fix |
|---|---|---|---|
| A1 | 🔴 Blocker | No backend: no schema, RLS, auth or server logic | Phases 3a–3d |
| A2 | 🔴 Blocker | **Expiry and "till tonight" are computed on the device** (`computeExpiry` uses the device clock and local timezone). A wrong or edited clock creates wrong expiries, and nothing is enforced server-side | Server computes `expires_at` from `now()` plus the user's IANA timezone. Client keeps its copy only for display |
| A3 | 🔴 Blocker | Bundle ID / package is `com.pingo.app`. **It can't be changed after the first store submission** | Choose the final VYBE identifiers (e.g. `app.vybe.mobile`) **before** any store upload |
| A4 | 🔴 Blocker | IAP, push and Sentry need native modules that **Expo Go doesn't include** | Move to EAS development builds (`eas.json`) |
| A5 | 🟠 High | Brand name **"VYBE" has trademark and App Store name-collision risk**. Several existing apps and companies use "Vybe" | Run trademark searches (USPTO, EUIPO, India IP office) and check store name and domain availability **before** any brand spend |
| A6 | 🟠 High | `docs/PLAN.md` says "India first, campus-by-campus"; the new brief says "global from launch" | Decision D1 below |
| A7 | 🟠 High | Circles are already shown in the **free** "Who sees it" picker, but the brief makes custom circles Premium | Decision D3. Choosing an audience is also a privacy control, so don't fully paywall it |
| A8 | 🟡 Medium | `AvailabilityProvider` updates `now` every second, which **re-renders every consumer** (the whole Home tree) | Isolate the 1 s ticker to the countdown components |
| A9 | 🟡 Medium | `MOCK_FRIENDS` timestamps are fixed at module load, so mock friends "expire" during a dev session | Goes away when real data replaces mocks |
| A10 | 🟡 Medium | `app.json`: no `runtimeVersion`/`updates` (OTA), no notification config, no iOS privacy manifest entries, `web.output: "server"` unused | Configure during Phase 3 |
| A11 | 🟡 Medium | Login plan is email + password only. A global consumer launch converts far better with **Sign in with Apple + Google** | Decision D2 |
| A12 | 🟢 Low | Git author is "Your Name". Repo folder is `rex-custom-service`, package is `pingo-mobile` | Housekeeping |
| A13 | 🟢 Low | Supabase project region unknown from the repo, which matters for GDPR and latency | Confirm in the dashboard |

---

## 3. Target architecture (minimal changes, no rewrite)

```
Expo app (iOS/Android, EAS builds + OTA updates)
 ├─ supabase-js ─────────► Supabase
 │                          ├─ Auth (Apple, Google, email OTP)
 │                          ├─ Postgres + RLS (all authorization lives here)
 │                          ├─ Realtime (free-now list, meetup chat)
 │                          ├─ Edge Functions (go-free, push fan-out, delete-account, RevenueCat webhook)
 │                          └─ Storage (avatars)
 ├─ RevenueCat SDK ──────► App Store / Google Play billing
 │                          └─ webhook ─► Edge Function ─► `entitlements` table (source of truth)
 ├─ Sentry ──────────────► crash + performance
 └─ PostHog ─────────────► product analytics (no message content, no precise PII)
Expo Push Service ───────► APNs / FCM
```

**Core tables:** `profiles`, `friendships` (pending/accepted, with block state), `circles` + `circle_members`, `availabilities` (`starts_at`, `expires_at` set by the server, activity, audience), `availability_recipients`, `joins`, `meetup_messages`, `push_tokens`, `reports`, `entitlements`, `subscription_events`, `analytics` (server-side events only).

**Server-enforced rules:**
- Every read is filtered by `expires_at > now()`.
- Audiences are resolved server-side, so a client can't notify non-friends.
- Blocked users never see each other.
- Premium checks read `entitlements`, never a client flag.

---

## 4. Monetisation & payments

### 4.1 Free vs Premium (core social loop is never paywalled)

| Free | Premium |
|---|---|
| Go free (activity + duration), see friends who are free, join, meetup chat | Unlimited custom circles |
| Unlimited friends, invites, QR add | Recurring availability ("free every Fri 6–9 pm") |
| Audience: all friends **or hand-pick friends**, plus **2 circles** (proposed) | Advanced activity filters & custom activities |
| Notifications on/off, mute a friend | Granular notification controls: per-circle, per-activity, quiet hours |
| Block, report, delete account | Enhanced group planning: polls, "who's in" threshold, scheduled meetups |
| | Profile themes, VYBE badge |

### 4.2 Billing architecture — recommendation: **RevenueCat over native StoreKit 2 + Google Play Billing**

| Option | Pros | Cons |
|---|---|---|
| Raw StoreKit 2 + Play Billing | No middleman fee | Two receipt-validation servers, two webhook formats (App Store Server Notifications v2, Google RTDN via Pub/Sub), grace periods, refunds and cross-platform entitlement merging are all ours to build and maintain. Weeks of work and a lasting source of bugs |
| **RevenueCat** (wraps both) | Server-side validation of both stores, a single webhook, entitlements, restore, trials, grace period, refunds, store-localised prices, revenue charts (MRR, churn, trial conversion) out of the box. Supports Stripe web purchases later. Works with Expo dev builds | Fee on revenue above a free tier |
| Adapty / Qonversion / Glassfy | Similar | Smaller ecosystem. No compelling reason to choose them over RevenueCat |

The deciding factor is cost versus engineering time: RevenueCat costs nothing until revenue is meaningful, and replaces the most error-prone code in the project. **Entitlements remain server-enforced:** the RevenueCat webhook writes to our `entitlements` table, and the backend checks that table. The client SDK is used only for display and purchase.

### 4.3 Fees

These figures are as of my last knowledge. **Verify on the official pages before setting prices.**

| Channel | Fee | Notes |
|---|---|---|
| Apple App Store | **15%** under the Small Business Program (<$1M/yr; enrol before launch). Otherwise 30% in year 1 of a subscription, 15% after | Apple is merchant of record and handles VAT/GST/sales tax |
| Google Play | **15%** on subscriptions | Google is merchant of record. User-choice billing exists in some regions (incl. India, EEA) with a reduced fee, but adds complexity, so skip it at launch |
| RevenueCat | Free up to ~$2.5k monthly tracked revenue, then ~1% | Verify the current plan |
| Stripe (web) | ~2.9% + 30¢ US cards. Varies in EU | **We** become merchant of record, so we handle VAT/sales tax ourselves (Stripe Tax) |
| Razorpay (web, India) | ~2% domestic | Recurring card payments need RBI e-mandate. UPI Autopay is supported |

**Store rules:** digital Premium features bought **inside the app must use Apple IAP / Google Play Billing**. Web checkout (Stripe in US/EU, Razorpay in India) is allowed only where the store rules permit it. For example, US apps can now link out to web purchase following the 2025 Epic v. Apple ruling, and the EU has DMA alternative terms. Both are evolving and need a legal check at implementation time. **Recommendation: launch with IAP only.** Add a web paywall in Phase 7 once revenue justifies the extra tax and compliance overhead. We never handle or store card data in any option.

### 4.4 Subscription flows covered (via RevenueCat plus our webhook handler)
Purchase · introductory free trial (optional, e.g. 7 days on annual) · renewal · cancellation (access lasts to the period end) · billing retry and grace period (failed payment) · expiry · refund/revoke (immediate loss of access) · restore purchases · cross-device sync by Supabase user ID · "Manage subscription" deep link to the store. Prices always come from the store's localised product data and are **never hardcoded**.

Testing uses the StoreKit sandbox/TestFlight and Google Play license testers. We never simulate success in production code.

---

## 5. Production readiness checklist

| Area | Plan |
|---|---|
| Auth | Supabase Auth: Sign in with Apple (required on iOS when offering Google), Google, email OTP. Session in SecureStore |
| Authorization | RLS on every table, with automated RLS tests (pgTAP). Edge Functions validate the JWT |
| Privacy | No location collected. Friends-only visibility. Minimal analytics properties |
| Backups | Supabase **Pro** plan (~$25/mo): daily backups. Add PITR when there are paying users. The free tier pauses idle projects and is **not** suitable for production |
| Expiry | Server `now()`. Clients sync clock offset for display only |
| Notifications | Expo Push. Token table, push receipts checked, dead tokens pruned, per-user rate limits (anti-spam) |
| Errors & crashes | Sentry (`@sentry/react-native`), source maps uploaded by EAS |
| Monitoring | Sentry performance, Supabase logs and alerts, uptime check on Edge Functions |
| Performance | Paginated lists (keyset pagination), indexed `expires_at`, FlashList for long lists |
| Safety | Block, report (user and message), admin review queue, ToS enforcement |
| Account deletion | In-app (Apple requirement). Edge Function cascades deletion; subscriptions are cancelled in the store by the user (with a link) |
| Legal | Privacy policy, terms, subscription terms. GDPR (lawful basis, DPAs with Supabase/Sentry/PostHog/RevenueCat, export & deletion). **India DPDP Act 2023 + 2025 Rules** (notice, consent, grievance officer). US state privacy laws (CCPA/CPRA). **Minimum age 18 proposed** to avoid DPDP verifiable parental consent for under-18s and COPPA |
| i18n | `expo-localization` + i18n strings from day one (English first). Store-localised prices. Timezone-aware "till tonight" |
| Secrets | EAS secrets, Supabase function secrets. Service-role key never in the app |
| Release | EAS Build + Submit. Internal → TestFlight / Play internal testing → staged rollout. EAS Update with `runtimeVersion` for instant JS rollback |
| Environments | Separate **staging** and **production** Supabase projects (`uat` branch → staging) |
| CI | GitHub Actions: typecheck, lint, unit tests, RLS tests on every PR |

### Analytics plan (PostHog, EU cloud or US cloud per region)
Events: `signed_up`, `onboarding_completed`, `friend_request_sent/accepted`, `invite_shared`, `availability_created`, `availability_joined`, `meetup_happened` (≥2 people joined). From these come weekly successful connections (the north-star metric) and D1/D7/D30 retention cohorts. Revenue metrics (MRR, ARR, trial conversion, cancellations, failed payments) come from **RevenueCat**, so there's no duplicate revenue tracking. No message content, contacts or exact timestamps of private plans are sent to analytics.

---

## 6. Brand direction (Phase 5 — concepts first, for your approval)

- **Positioning:** "Less planning. More living."
- **Personality:** confident, warm, spontaneous, minimal. Premium through restraint, not decoration.
- **Starting point:** the existing ink and electric-lime palette already reads as modern and distinctive. Proposal: evolve it rather than discard it. Lime becomes "the VYBE signal" (live/free), on deep ink, with one warm secondary colour.
- **Deliverables:** 3 icon/wordmark concepts (SVG) → you pick one → app icon (iOS light, dark and tinted; Android adaptive and monochrome), splash, light/dark logo variants, palette, type scale, updated tokens, applied to onboarding, login, tabs, settings and Premium.
- **Caveat:** a professional designer review of the final mark is recommended. Trademark clearance (A5) must come first.

---

## 7. Execution roadmap

| Phase | Scope | Exit criteria |
|---|---|---|
| **3a. Foundations** | EAS dev builds, `eas.json`, staging + prod Supabase, final bundle IDs, Sentry, CI, i18n scaffold, fix A8 | Dev build runs on a real iPhone and Android phone |
| **3b. Auth & profiles** | Apple/Google/email login, onboarding (name, username, photo, age gate), session routing, delete account | RLS tests pass. Deletion verified end to end |
| **3c. Friends & safety** | Username search, QR, invite links, requests, circles, block, report | Blocked users fully invisible (tested) |
| **3d. Availability & push** | `go-free` Edge Function (server expiry, audience resolution), realtime "free now", join, push fan-out, quiet hours, rate limits | Push received on both platforms. Expiry correct across timezones |
| **3e. Meetup chat** | Realtime chat per availability, auto-close on expiry, message report | — |
| **4. Premium** | RevenueCat, products in both stores, webhook → `entitlements`, paywall with store prices, trial, restore, manage, gated features | Sandbox purchase, renew, cancel, refund and restore all verified on real devices |
| **5. Brand** | VYBE identity applied app-wide (after trademark check) | Your sign-off on screens |
| **6. Release prep** | Security review, load test of push fan-out, legal pages hosted, store listings and privacy labels / Data safety, screenshots, staged rollout plan | App Review + Play review passed. **Nothing published without your approval** |
| **7. Post-launch** | Web paywall (Stripe/Razorpay) if justified, phone OTP + contacts, more locales | — |

### Accounts and costs you'll need (indicative)
Apple Developer (US$99/yr) · Google Play (US$25 one-time) · Supabase Pro ×1 prod (~$25/mo; staging can stay free) · EAS (free tier to start, ~$19/mo Production plan later) · Sentry and PostHog (free tiers sufficient at launch) · RevenueCat (free under threshold) · domain + email for support/legal · trademark filing · legal review of privacy and terms (recommended).

---

## 8. Decisions (approved 2026-11-10)

| # | Decision | Approved |
|---|---|---|
| D1 | Launch scope | **India first, then global 1–2 weeks later.** Everything (GDPR, i18n, regional pricing) must still be ready before the India launch |
| D2 | Login | **Sign in with Apple, Google, email OTP and phone OTP, all before launch** |
| D3 | Circles | Free: all friends, hand-picked friends, up to 2 circles. Premium: unlimited |
| D4 | Billing | RevenueCat + Apple IAP + Google Play Billing. Payments are live from launch; full sandbox testing beforehand (section 9) |
| D5 | Trial | 7-day free trial on the annual plan only |
| D6 | Minimum age | 18+ (age gate in onboarding, matching store age ratings) |
| D7 | Identifiers | Trademark/store-name check on VYBE first, then lock `app.vybe.mobile` |
| D8 | Branches & environments | All development and testing on **`uat`** (UAT Supabase project). When UAT passes, merge `uat` → **`prod`** and apply the same migrations to the **prod** Supabase project |

### Long lead-time items (start now, they gate launch)
| Item | Why | Typical lead time |
|---|---|---|
| **D-U-N-S number** (free, from Dun & Bradstreet) | Required for Apple **and** Google *organisation* developer accounts | 1–3 weeks |
| Apple Developer Program (organisation) | IAP, push, TestFlight | A few days after D-U-N-S |
| Google Play Console (organisation) | Play Billing, release. *Personal* accounts created after Nov 2023 must run a **closed test with 12+ testers for 14 days** before production access, so an organisation account avoids this | Days, plus identity verification |
| **TRAI DLT registration** (entity, sender ID, OTP template) | Required to send SMS OTP in India. Alternatively, use Twilio Verify, which uses its own pre-registered India templates (confirm with Twilio) | 1–2 weeks |
| Trademark / store-name check for VYBE | Blocks the bundle ID and brand work | Search: days. Filing: months (can launch while pending) |
| Domain (e.g. vybe.app) + support email | Bundle ID, legal pages, Apple/Google contact | Same day |

---

## 9. Payments — what we need to test (before launch)

> **Important:** payments can't be "switched on one day before launch" by itself. Apple reviews in-app purchases **together with an app build**, so Premium must be in the build sent for review. The plan is to submit the final build with Premium working **1–2 weeks before launch**, choose **"Manually release"** in App Store Connect (and a matching managed/manual publish on Google Play), then press release on launch day. Before release only sandbox/test money moves. After release, real purchases go through automatically; there is no separate switch.

### 9.1 Accounts & setup (owner: you, with my help)
**Apple (App Store Connect)**
- [ ] Apple Developer Program membership (organisation)
- [ ] **Paid Applications Agreement** signed, plus **bank and tax forms** completed. Required even for sandbox purchase testing
- [ ] Small Business Program enrolment (15% fee)
- [ ] App record with bundle ID `app.vybe.mobile`
- [ ] Subscription group "VYBE Premium" with 2 products: monthly and annual. Introductory offer: 7-day free trial on annual
- [ ] Prices per territory (set India in ₹ first; Apple auto-converts the rest, then review US/EU)
- [ ] In-App Purchase key (.p8) and App Store Server Notifications V2 URL → given to RevenueCat
- [ ] 2–3 **Sandbox tester** accounts (Users and Access → Sandbox)

**Google (Play Console)**
- [ ] Developer account (organisation) and **payments profile** (merchant account)
- [ ] App created, first AAB uploaded to the **internal testing** track (Play won't let you create subscriptions until a build with billing is uploaded; I'll prepare it)
- [ ] Subscription "premium" with 2 base plans (monthly, annual) and a 7-day free-trial offer on annual
- [ ] **License testers** added (Settings → License testing) — Gmail accounts of everyone testing
- [ ] Google Cloud service account with Play Console access (JSON key) → RevenueCat
- [ ] Real-time developer notifications (Pub/Sub topic) → RevenueCat

**RevenueCat**
- [ ] Project with iOS + Android apps connected to the keys above
- [ ] Entitlement `premium`, offering `default` with packages monthly + annual
- [ ] Webhook → our Supabase Edge Function (staging and prod, each with its own secret)

**Our side (I build this)**
- [ ] EAS **development build** installed on test phones (purchases don't work in Expo Go)
- [ ] Staging Supabase: `entitlements` + `subscription_events` tables, webhook function, RLS
- [ ] Paywall screen, restore, manage subscription, Premium-gated features

**Devices:** at least 1 real iPhone and 1 real Android phone. Simulators can't test the full flow reliably.

### 9.2 Test matrix (every row on iOS **and** Android, recorded in `docs/QA_PAYMENTS.md`)
| # | Scenario | Expected result |
|---|---|---|
| P1 | Paywall shows **store-provided ₹ prices** (and $/€ with a US/EU tester) | Matches store console, never hardcoded |
| P2 | Buy monthly | Premium unlocks. Server `entitlements` row active |
| P3 | Buy annual with 7-day trial | Trial active. Trial terms shown before purchase |
| P4 | Trial converts to paid | Renewal recorded. Premium continues |
| P5 | Auto-renewal (sandbox renews every few minutes) | Expiry date advances on server |
| P6 | Cancel | Premium lasts to the end of the period, then expires |
| P7 | Payment failure → grace period / billing retry | Access per grace rules, then expires. Event logged |
| P8 | Refund / revoke | Premium removed promptly |
| P9 | Restore purchases (reinstall / new phone) | Premium restored |
| P10 | Cross-platform: buy on iPhone, log in on Android | Premium (server is the source of truth) |
| P11 | Upgrade monthly → annual | Single active subscription, correct proration |
| P12 | Purchase cancelled by user / network failure mid-purchase | Clear message, no false "success", no charge |
| P13 | Tamper: client claims Premium without a purchase | Server still denies Premium features |
| P14 | Delete account with active subscription | User told to cancel in store (link shown). Data deleted |
| P15 | Webhook replayed or arrives out of order | Idempotent, final state correct |

Sandbox timings are compressed (Apple: a 1-month plan renews about every 5 minutes; Google license testers: similarly short), so the whole matrix fits in a day or two once setup is done.
