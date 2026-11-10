import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { SessionProvider, signOut, useSession } from '@/features/auth/session';
import { useMyStatus } from '@/features/availability/api';
import { AvailabilityProvider } from '@/features/availability/availability-context';
import { RealtimeSync } from '@/features/availability/realtime-sync';
import { errorMessage } from '@/lib/errors';
import { queryClient } from '@/lib/query';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colors, scheme } = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });

  // Fall back to system fonts if loading fails rather than blocking the app.
  if (!fontsLoaded && !fontError) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
      primary: colors.accentText,
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider value={navTheme}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <RootNavigator />
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

/** Routes are guarded by auth state: signed out → sign-in, signed in but not set up → onboarding, else the app. */
function RootNavigator() {
  const { colors } = useTheme();
  const { session, initialised } = useSession();
  const status = useMyStatus();

  const signedIn = !!session;
  const waitingForStatus = signedIn && status.isPending;
  const ready = initialised && !waitingForStatus;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  if (signedIn && status.isError && !status.data) {
    return <StartupError message={errorMessage(status.error)} onRetry={() => status.refetch()} />;
  }

  const onboarded = status.data?.onboarded ?? false;

  return (
    <AvailabilityProvider>
      {signedIn && onboarded ? <RealtimeSync /> : null}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>

        <Stack.Protected guard={signedIn && !onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>

        <Stack.Protected guard={signedIn && onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="go-free"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: [0.72, 0.95],
              sheetGrabberVisible: true,
              sheetCornerRadius: 28,
              contentStyle: { backgroundColor: colors.surface },
            }}
          />
          <Stack.Screen
            name="add-friend"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: [0.6, 0.95],
              sheetGrabberVisible: true,
              sheetCornerRadius: 28,
              contentStyle: { backgroundColor: colors.surface },
            }}
          />
          <Stack.Screen
            name="user/[id]"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: [0.55, 0.95],
              sheetGrabberVisible: true,
              sheetCornerRadius: 28,
              contentStyle: { backgroundColor: colors.surface },
            }}
          />
          <Stack.Screen
            name="circle/[id]"
            options={{
              presentation: 'modal',
              headerShown: true,
              title: 'Group',
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="profile"
            options={{
              headerShown: true,
              title: 'Profile',
              headerShadowVisible: false,
              headerBackButtonDisplayMode: 'minimal',
            }}
          />
        </Stack.Protected>
      </Stack>
    </AvailabilityProvider>
  );
}

function StartupError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.error, { backgroundColor: colors.background }]}>
      <Text variant="heading">Can&apos;t reach VYBE</Text>
      <Text variant="body" tone="muted" style={styles.center}>
        {message}
      </Text>
      <Button label="Try again" onPress={onRetry} />
      <Button variant="ghost" size="sm" label="Sign out" onPress={signOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  center: { textAlign: 'center' },
});
