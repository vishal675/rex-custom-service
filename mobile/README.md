# Pingo — mobile app

Expo SDK 58 · React Native · TypeScript · Expo Router. See the [root README](../README.md) to run it.

## Structure

```
src/
  app/                  routes only (Expo Router)
    (tabs)/             Home · Chats · Friends
    go-free.tsx         bottom sheet: activity, duration, audience
    profile.tsx
  components/ui/        design-system components
  features/<feature>/   feature logic + components (+ __tests__)
  theme/                tokens.ts (colours, type, spacing) + useTheme
  constants/
```

Rules: no hard-coded colours or font sizes outside `theme/tokens.ts`; pure logic lives in `features/*/model.ts` and is unit tested.
