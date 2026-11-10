import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { APP_NAME, TAGLINE } from '@/constants/app';
import { isValidEmail, isValidOtp, normalizeEmail } from '@/features/auth/model';
import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { fonts, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const RESEND_SECONDS = 60;

/** Email one-time code sign-in. Creates the account on first use. Apple / Google / phone are added once their accounts are set up. */
export default function SignInScreen() {
  const { colors } = useTheme();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const sendCode = async () => {
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: normalizeEmail(email),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (err) {
      setError(errorMessage(err));
      return;
    }
    setCode('');
    setStep('code');
    setCooldown(RESEND_SECONDS);
  };

  const verify = async (value: string) => {
    if (!isValidOtp(value)) {
      setError('Enter the 6-digit code from the email.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({ email: normalizeEmail(email), token: value, type: 'email' });
    setBusy(false);
    // On success the session changes and the router moves on by itself.
    if (err) setError(errorMessage(err));
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <View style={styles.brand}>
            <Text style={[styles.wordmark, { color: colors.text }]} accessibilityRole="header">
              {APP_NAME}
            </Text>
            <Text variant="body" tone="muted">
              {TAGLINE}
            </Text>
          </View>

          {step === 'email' ? (
            <View style={styles.form}>
              <TextField
                label="EMAIL"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setError(null);
                }}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={sendCode}
                error={error}
                autoFocus
              />
              <Button label="Continue" onPress={sendCode} loading={busy} />
              {__DEV__ ? (
                // UAT only: lets testers enter a code from supabase/scripts/dev-login-code.sh. Stripped from release builds.
                <Button
                  variant="ghost"
                  size="sm"
                  label="I have a test code"
                  onPress={() => (isValidEmail(email) ? setStep('code') : setError('Enter the test email first.'))}
                />
              ) : null}
            </View>
          ) : (
            <View style={styles.form}>
              <Text variant="body">
                We sent a 6-digit code to <Text variant="bodyStrong">{normalizeEmail(email)}</Text>
              </Text>
              <TextField
                label="CODE"
                value={code}
                onChangeText={(t) => {
                  const digits = t.replace(/\D/g, '').slice(0, 6);
                  setCode(digits);
                  setError(null);
                  if (digits.length === 6) verify(digits);
                }}
                placeholder="123456"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                error={error}
                style={styles.code}
                autoFocus
              />
              <Button label="Verify" onPress={() => verify(code)} loading={busy} />
              <View style={styles.row}>
                <Button
                  variant="ghost"
                  size="sm"
                  label="Change email"
                  onPress={() => {
                    setStep('email');
                    setError(null);
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  label={cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                  disabled={cooldown > 0 || busy}
                  onPress={sendCode}
                />
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, padding: spacing.xl, justifyContent: 'center', gap: spacing.xxxl },
  brand: { gap: spacing.xs },
  wordmark: { fontFamily: fonts.displayHeavy, fontSize: 52, lineHeight: 56, letterSpacing: -1.5 },
  form: { gap: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  code: { fontFamily: fonts.semibold, fontSize: 22, letterSpacing: 8 },
});
