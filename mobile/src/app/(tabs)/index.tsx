import * as Haptics from 'expo-haptics';
import { Link, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { APP_NAME, MOCK_ME } from '@/constants/app';
import { useAvailability } from '@/features/availability/availability-context';
import { FreeButton } from '@/features/availability/free-button';
import { FreeFriendCard } from '@/features/availability/free-friend-card';
import { formatRemaining, getActivity, remainingFraction, remainingMs } from '@/features/availability/model';
import { MOCK_FRIENDS, audienceSize } from '@/features/friends/mock-data';
import { fonts, palette, spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const { current, lastSettings, now, goFree, goBusy } = useAvailability();
  const freeFriends = MOCK_FRIENDS.filter((f) => f.freeUntil && f.freeUntil > now);
  const activity = getActivity(current?.activity);

  const reuseLast = () => {
    if (current) return;
    goFree(lastSettings);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.wordmark}>{APP_NAME}</Text>
        <Link href="/profile" asChild>
          <PressableScale accessibilityRole="button" accessibilityLabel="Profile and settings">
            <Avatar name={MOCK_ME.name} size={36} />
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
              Notified {audienceSize(current.audience)} friends
            </Text>
            <Button
              variant="secondary"
              label="I'M BUSY"
              onPress={() => {
                goBusy();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
              style={styles.busy}
            />
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

      {freeFriends.length === 0 ? (
        <Text variant="body" tone="muted">
          No one yet. Be the first — tap the button.
        </Text>
      ) : (
        freeFriends.map((f, i) => <FreeFriendCard key={f.id} friend={f} now={now} index={i} />)
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
  busy: { minWidth: 160 },
  center: { textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.lime },
});
