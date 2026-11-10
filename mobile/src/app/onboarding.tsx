import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import {
  deviceTimezone,
  displayNameError,
  dobError,
  formatDobInput,
  normalizeUsername,
  parseDob,
  toIsoDate,
  usernameError,
} from '@/features/auth/model';
import { signOut } from '@/features/auth/session';
import { errorMessage } from '@/lib/errors';
import { queryClient, queryKeys } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Name, username and an 18+ check. The date of birth is verified by the server and not stored. */
export default function OnboardingScreen() {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [dob, setDob] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const errors = {
    name: displayNameError(name),
    username: usernameError(username),
    dob: dobError(dob),
  };
  const valid = !errors.name && !errors.username && !errors.dob;

  const submit = async () => {
    setTouched(true);
    if (!valid) return;
    setBusy(true);
    setServerError(null);
    const { error } = await supabase.rpc('complete_onboarding', {
      p_username: normalizeUsername(username),
      p_display_name: name.trim(),
      p_date_of_birth: toIsoDate(parseDob(dob)!),
      p_timezone: deviceTimezone(),
    });
    if (error) {
      setBusy(false);
      setServerError(errorMessage(error));
      return;
    }
    // Status flips to onboarded → the router shows the app.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.status }),
      queryClient.invalidateQueries({ queryKey: queryKeys.profile }),
    ]);
    setBusy(false);
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text variant="title" accessibilityRole="header">
              Set up your profile
            </Text>
            <Text variant="body" tone="muted">
              Friends find you by your username.
            </Text>
          </View>

          <TextField
            label="YOUR NAME"
            value={name}
            onChangeText={setName}
            placeholder="Vishal Pingua"
            autoComplete="name"
            textContentType="name"
            maxLength={50}
            error={touched ? errors.name : null}
          />
          <TextField
            label="USERNAME"
            value={username}
            onChangeText={(t) => {
              setUsername(t.toLowerCase().replace(/\s/g, ''));
              setServerError(null);
            }}
            placeholder="vishal"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username-new"
            maxLength={21}
            error={username.length > 0 || touched ? errors.username : null}
            hint="3–20 characters: letters, numbers, dots and underscores."
          />
          <TextField
            label="DATE OF BIRTH"
            value={dob}
            onChangeText={(t) => setDob(formatDobInput(t))}
            placeholder="DD/MM/YYYY"
            keyboardType="number-pad"
            maxLength={10}
            error={dob.length === 10 || touched ? errors.dob : null}
            hint="VYBE is for people 18 and over. We only check it — we don't store it."
          />

          {serverError ? (
            <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
              {serverError}
            </Text>
          ) : null}

          <Button label="Let's go" onPress={submit} loading={busy} />
          <Button variant="ghost" size="sm" label="Use a different account" onPress={signOut} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingTop: spacing.xxxl, gap: spacing.xl },
  header: { gap: spacing.xs },
});
