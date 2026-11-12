import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';

/**
 * Crash reporting. Off unless EXPO_PUBLIC_SENTRY_DSN is set (EAS env), and never in development.
 * No personal data: only the Supabase user id is attached (no email, name or IP — sendDefaultPii is off).
 */
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
export const sentryEnabled = !!dsn && !__DEV__;

Sentry.init({
  dsn,
  enabled: sentryEnabled,
  environment: Updates.channel ?? (__DEV__ ? 'development' : 'unknown'),
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
});

if (sentryEnabled) {
  // Which over-the-air update was running when the crash happened.
  const scope = Sentry.getGlobalScope();
  scope.setTag('expo-update-id', Updates.updateId ?? 'none');
  scope.setTag('expo-is-embedded-update', String(Updates.isEmbeddedLaunch));
}

export function setCrashReportUser(userId: string | null) {
  Sentry.setUser(userId ? { id: userId } : null);
}

export { Sentry };
