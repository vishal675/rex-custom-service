import * as Haptics from 'expo-haptics';
import { Link, router, useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { APP_NAME } from '@/constants/app';
import { useProfile } from '@/features/auth/session';
import { useFreeNow, useMyStatus } from '@/features/availability/api';
import { useAvailability } from '@/features/availability/availability-context';
import { FreeButton } from '@/features/availability/free-button';
import { FreeFriendCard } from '@/features/availability/free-friend-card';
import { markHomeSeen } from '@/features/availability/seen';
import { formatRemaining, getActivity, isActive, remainingFraction, remainingMs } from '@/features/availability/model';
import { useNow } from '@/hooks/use-now';
import { serverNow } from '@/lib/clock';
import { errorMessage } from '@/lib/errors';
import { fonts, palette, spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const now = useNow(1000);
  const { availability, lastSettings, goFree, goBusy, isSaving } = useAvailability();
  const profile = useProfile();
  const status = useMyStatus();
  const freeNow = useFreeNow();

  const current = isActive(availability, now) ? availability : null;
  const freeFriends = (freeNow.data ?? []).filter((f) => f.expiresAt > now);
  const activity = getActivity(current?.activity);
  const myName = profile.data?.displayName ?? '';

  // Looking at Home clears its badge (friends who went free since you last looked).
  const focused = useIsFocused();
  useEffect(() => {
    if (focused) markHomeSeen(serverNow());
  }, [focused, freeNow.dataUpdatedAt]);

  const reuseLast = async () => {
    if (current || isSaving) return;
    try {
      await goFree(lastSettings);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Couldn't go free", errorMessage(e));
    }
  };

  const busy = async () => {
    try {
      await goBusy();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      Alert.alert("Couldn't update", errorMessage(e));
    }
  };

  return (
    <Screen
      onRefresh={() => {
        status.refetch();
        freeNow.refetch();
      }}
      refreshing={freeNow.isRefetching}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>{APP_NAME}</Text>
        <Link href="/profile" asChild>
          <PressableScale accessibilityRole="button" accessibilityLabel="Profile and settings">
            <Avatar name={myName || '?'} path={profile.data?.avatarPath} size={36} />
          </PressableScale>
        </Link>
      </View>

      <View style={styles.hero}>
        <FreeButton
          active={!!current}
          fraction={current ? remainingFraction(current, now) : 1}
          remainingLabel={current ? formatRemaining(remainingMs(current, now)) : ''}
          activityLabel={activity ? `${activity.emoji} ${activity.label}` : undefined}
          onPress={() => router.push('/go-free')}
          onLongPress={reuseLast}
        />

        {current ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.status}>
            <Text variant="caption" tone="muted">
              Notified {current.recipientCount} {current.recipientCount === 1 ? 'friend' : 'friends'}
              {current.joinCount > 0 ? ` · ${current.joinCount} in` : ''}
            </Text>
            <View style={styles.actions}>
              {current.joinCount > 0 ? (
                <Button
                  label="Open chat"
                  onPress={() => router.push({ pathname: '/meetup/[id]', params: { id: current.id } })}
                  style={styles.busy}
                />
              ) : null}
              <Button variant="secondary" label="I'M BUSY" onPress={busy} loading={isSaving} style={styles.busy} />
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.status}>
            <Text variant="caption" tone="muted" style={styles.center}>
              Tap to let friends know · Hold to reuse last
            </Text>
          </Animated.View>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.liveDot} />
        <Text variant="overline" tone="muted">
          FREE RIGHT NOW · {freeFriends.length}
        </Text>
      </View>

      {freeNow.isError ? (
        <Text variant="body" tone="danger">
          {errorMessage(freeNow.error)}
        </Text>
      ) : freeFriends.length === 0 ? (
        <Text variant="body" tone="muted">
          {freeNow.isPending ? 'Checking…' : 'No one yet. Be the first — tap the button.'}
        </Text>
      ) : (
        freeFriends.map((f, i) => <FreeFriendCard key={f.availabilityId} item={f} now={now} index={i} />)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  wordmark: { fontFamily: fonts.displayHeavy, fontSize: 26, letterSpacing: -0.6 },
  hero: { alignItems: 'center', paddingVertical: spacing.md },
  status: { alignItems: 'center', gap: spacing.md, minHeight: 80 },
  busy: { minWidth: 140 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  center: { textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.lime },
});
