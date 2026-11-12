import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { PRIVACY_URL, TERMS_URL } from '@/constants/app';
import { useAvailability } from '@/features/availability/availability-context';
import { activatePremium, useEntitlement } from '@/features/premium/api';
import {
  ALWAYS_FREE,
  annualSavingsPercent,
  BENEFITS,
  ctaLabel,
  renewalDisclosure,
  toPlans,
  type Plan,
} from '@/features/premium/model';
import {
  buy,
  getPackages,
  managementUrl,
  restore,
  storeAvailability,
  storeErrorMessage,
} from '@/features/premium/purchases';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/**
 * VYBE Premium paywall. Prices and trial come from the store; Premium turns on only when our server
 * confirms the subscription with RevenueCat (never on the purchase result alone).
 */
export default function PremiumScreen() {
  const { colors } = useTheme();
  const { isPremium } = useAvailability();
  const availability = storeAvailability();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <View style={styles.hero}>
        <Text style={styles.emoji}>✨</Text>
        <Text variant="title" style={styles.center}>
          {isPremium ? "You're Premium" : 'VYBE Premium'}
        </Text>
        <Text variant="body" tone="muted" style={styles.center}>
          {ALWAYS_FREE}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {BENEFITS.map((b) => (
          <View key={b.title} style={styles.benefit}>
            <Text style={styles.benefitEmoji}>{b.emoji}</Text>
            <View style={styles.flex}>
              <Text variant="bodyStrong">{b.title}</Text>
              <Text variant="caption" tone="muted">
                {b.body}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {isPremium ? (
        <ManageSubscription />
      ) : availability === 'ready' ? (
        <Purchase />
      ) : (
        <Unavailable reason={availability} />
      )}
    </ScrollView>
  );
}

function Purchase() {
  const { colors } = useTheme();
  const offer = useQuery({ queryKey: ['offerings'], queryFn: getPackages, staleTime: 5 * 60_000 });
  const plans = toPlans(offer.data ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = plans.find((p) => p.id === selectedId) ?? plans[0];
  const savings = annualSavingsPercent(plans);
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);

  const activate = async (afterRestore: boolean) => {
    const on = await activatePremium();
    if (on) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Welcome to Premium ✨', 'Unlimited groups are unlocked.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } else if (afterRestore) {
      Alert.alert('Nothing to restore', 'We couldn’t find an active VYBE Premium subscription for this store account.');
    } else {
      Alert.alert(
        'Almost there',
        'The store confirmed your purchase. Premium will switch on in a moment — reopen this screen shortly.',
      );
    }
  };

  const purchase = async () => {
    if (!selected) return;
    setBusy('buy');
    try {
      const outcome = await buy(selected.pkg);
      if (outcome === 'completed') await activate(false);
      else if (outcome === 'pending')
        Alert.alert(
          'Payment pending',
          'Your payment is still processing (for example, waiting for UPI approval). Premium switches on as soon as it completes.',
        );
    } catch (e) {
      Alert.alert("Couldn't complete purchase", storeErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const restorePurchases = async () => {
    setBusy('restore');
    try {
      await restore();
      await activate(true);
    } catch (e) {
      Alert.alert("Couldn't restore", storeErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  if (offer.isPending) return <ActivityIndicator style={styles.loading} />;
  if (offer.isError || plans.length === 0) {
    return (
      <View style={styles.section}>
        <Text variant="body" tone="muted" style={styles.center}>
          {offer.isError ? storeErrorMessage(offer.error) : 'Premium plans aren’t available in your store yet.'}
        </Text>
        <Button variant="secondary" label="Try again" onPress={() => offer.refetch()} />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          badge={plan.kind === 'annual' && savings ? `Save ${savings}%` : null}
          selected={plan.id === selected?.id}
          onPress={() => setSelectedId(plan.id)}
        />
      ))}
      <Button label={ctaLabel(selected)} loading={busy === 'buy'} disabled={busy !== null} onPress={purchase} />
      <Text variant="caption" tone="muted" style={styles.center}>
        {renewalDisclosure(selected, Platform.OS === 'ios' ? 'ios' : 'android')}
      </Text>
      <Button
        variant="ghost"
        size="sm"
        label="Restore purchases"
        loading={busy === 'restore'}
        disabled={busy !== null}
        onPress={restorePurchases}
      />
      <LegalLinks color={colors.textMuted} />
    </View>
  );
}

function PlanCard({
  plan,
  badge,
  selected,
  onPress,
}: {
  plan: Plan;
  badge: string | null;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale
      scaleTo={0.98}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.plan,
        {
          backgroundColor: colors.surface,
          borderColor: selected ? colors.accentText : colors.border,
          borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
        },
      ]}>
      <View style={styles.flex}>
        <View style={styles.planTitle}>
          <Text variant="bodyStrong">{plan.title}</Text>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: colors.accent }]}>
              <Text variant="caption" tone="onAccent">
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="caption" tone="muted">
          {plan.trialDays ? `${plan.trialDays} days free, then ` : ''}
          {plan.priceLine}
        </Text>
      </View>
      {plan.perMonth ? (
        <Text variant="label" tone="muted">
          {plan.perMonth}/mo
        </Text>
      ) : null}
    </PressableScale>
  );
}

function ManageSubscription() {
  const { colors } = useTheme();
  const entitlement = useEntitlement();
  const e = entitlement.data;
  const until = e?.expiresAt && !e.expiresAt.startsWith('9999') ? new Date(e.expiresAt).toLocaleDateString() : null;
  const line = !e
    ? ''
    : !until
      ? 'Premium is active.'
      : e.periodType === 'trial'
        ? `Free trial ${e.willRenew ? 'converts to paid' : 'ends'} on ${until}.`
        : e.willRenew
          ? `Renews on ${until}.`
          : `Active until ${until} — it won’t renew.`;

  const manage = async () => {
    if (e?.store === 'promotional' || !e?.store) {
      Alert.alert('Premium', 'Your Premium was granted by VYBE — there’s nothing to manage in the store.');
      return;
    }
    await WebBrowser.openBrowserAsync(await managementUrl());
  };

  return (
    <View style={styles.section}>
      <Text variant="body" tone="muted" style={styles.center}>
        {line}
      </Text>
      <Button variant="secondary" label="Manage subscription" onPress={manage} />
      <LegalLinks color={colors.textMuted} />
    </View>
  );
}

function Unavailable({ reason }: { reason: 'expo_go' | 'not_configured' }) {
  return (
    <View style={[styles.section, styles.hero]}>
      <Text variant="bodyStrong" style={styles.center}>
        Premium is coming soon
      </Text>
      <Text variant="caption" tone="muted" style={styles.center}>
        {reason === 'expo_go'
          ? 'Purchases can’t be made in Expo Go — use the VYBE test app.'
          : 'Subscriptions aren’t switched on in this version yet.'}
      </Text>
    </View>
  );
}

function LegalLinks({ color }: { color: string }) {
  const links = [
    TERMS_URL ? { label: 'Terms', url: TERMS_URL } : null,
    PRIVACY_URL ? { label: 'Privacy', url: PRIVACY_URL } : null,
  ].filter((l): l is { label: string; url: string } => !!l);
  if (links.length === 0) return null;
  return (
    <View style={styles.legal}>
      {links.map((l) => (
        <Text
          key={l.label}
          variant="caption"
          style={{ color, textDecorationLine: 'underline' }}
          accessibilityRole="link"
          onPress={() => WebBrowser.openBrowserAsync(l.url)}>
          {l.label}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxxl },
  hero: { alignItems: 'center', gap: spacing.sm },
  emoji: { fontSize: 44, lineHeight: 52 },
  center: { textAlign: 'center' },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  benefit: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  benefitEmoji: { fontSize: 22, lineHeight: 26 },
  flex: { flex: 1 },
  section: { gap: spacing.md },
  loading: { marginTop: spacing.xl },
  plan: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg },
  planTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl },
});
