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
