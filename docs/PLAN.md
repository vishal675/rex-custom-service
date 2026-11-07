# Plan & progress

_Last updated: 2026-11-07_

## Decisions

| Topic | Decision |
|---|---|
| Market | India first, campus-by-campus launch |
| Mobile | Expo SDK 58, React Native, TypeScript, Expo Router (native tabs) |
| Backend | Supabase — Postgres + RLS, Auth, Realtime, Storage, Edge Functions |
| Login (MVP) | **Email + password.** Phone OTP added later (needs SMS provider + DLT registration) |
| Contact discovery | Deferred until phone numbers are **verified** by OTP — matching unverified numbers would let anyone claim someone else's number |
| Chat | Meetup chats only in MVP; full 1:1 / group chat in v1.1 |
| Push | Expo Push Service → FCM / APNs |
| Expiry | `expires_at` column; reads filter on it (no timers) |
| Name | **Pingo** (working name, may change) (`mobile/src/constants/app.ts`, `mobile/app.json`) |
| Supabase project | ref `qwbqzasmyatjnmnuwrun` |

## Milestones

### ✅ Milestone 1 — Project setup + clickable prototype (Stages 1–2)
- [x] Expo app scaffolded in `mobile/`, template demo code removed
- [x] Design system: colour tokens (dark + light), Bricolage Grotesque + Inter, spacing, radii
- [x] UI kit: Text, Button, Chip, Avatar (free ring), Segmented, ListRow, Screen, Icon, PressableScale (haptics)
- [x] Navigation: native tabs (Home / Chats / Friends) + Profile screen + "Go free" bottom sheet
- [x] Home: animated I'M FREE button, countdown ring, I'M BUSY, hold-to-reuse-last, "Free right now" list with "I'm in"
- [x] Availability logic (durations, "till tonight", expiry, countdown) as pure functions with unit tests
- [x] Supabase CLI folder initialised (`supabase/`)
- [x] Checks: typecheck, lint, 14 unit tests, expo-doctor, iOS + Android bundles
- [ ] **Verified on a real iPhone and Android phone** (needs you — see README)

All data is mocked. Nothing is saved or sent yet.

### ⏳ Milestone 2 — Auth & profiles (Stage 3)
- [ ] Link Supabase project; first migration: `profiles` + RLS
- [ ] Email/password sign up, log in, log out, password reset
- [ ] Onboarding: name, unique username, optional photo (Storage)
- [ ] Session persistence; signed-out vs signed-in routing
- [ ] Tests: username validation, RLS (users can only edit themselves)

### Later
- Stage 4 Friends (username search, QR, requests, block) — contacts after phone OTP
- Stage 5 I'M FREE backed by `go-free` Edge Function
- Stage 6 Visibility + RLS + realtime "free now"
- Stage 7 Push (needs Firebase project for Android; Apple Developer account ₹8.7k/yr for iPhone push)
- Stage 8 Groups · Stage 9 Meetup chat · Stage 10 QA · Stage 11 Store release
