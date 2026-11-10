# Pingo (working name)

One tap to tell friends you're free. Selected friends get a push, it auto-expires, and anyone who's in gets a meetup chat.

| Folder | What |
|---|---|
| [`mobile/`](mobile/) | Expo (React Native + TypeScript) app for iOS and Android |
| [`supabase/`](supabase/) | Database migrations, Row Level Security, Edge Functions |
| [`docs/PLAN.md`](docs/PLAN.md) | Decisions, roadmap and progress tracker |

## Run the app locally

Requirements: Node 20+ and the **Expo Go** app on your phone (App Store / Play Store).

```bash
cd mobile
npm install
npm start          # scan the QR code with your phone camera (iOS) or Expo Go (Android)
```

Your phone and Mac must be on the same Wi-Fi. If it can't connect, run `npx expo start --tunnel`.

## Testing on UAT

The app talks to the **UAT** Supabase project. To sign in during testing (until custom email is set up):

1. In the app, enter any email and tap **I have a test code** (development builds only).
2. In a terminal: `supabase/scripts/dev-login-code.sh that@email.com` — prints the 6-digit code.

Use two phones (or a phone + simulator) with two emails to test friends and "I'm free".

```bash
supabase/scripts/test-db.sh      # SQL security tests (rolled back, leaves no data)
node supabase/scripts/smoke.mjs  # end-to-end API test with two throwaway users
```

## Checks

```bash
cd mobile
npm run typecheck
npm run lint
npm test
```

## Secrets

- `./.env` — Supabase CLI credentials (DB password, access token). Git-ignored.
- `mobile/.env.local` — public client config (project URL + publishable key). Git-ignored.

Templates live in the matching `.env.example` files. Never commit real values, never put the `service_role`/secret key in the mobile app.
