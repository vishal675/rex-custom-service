import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { Friend } from '@/features/friends/mock-data';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { formatRemaining, getActivity } from './model';

type Props = { friend: Friend; now: number; index: number };

export function FreeFriendCard({ friend, now, index }: Props) {
  const { colors } = useTheme();
  const [joined, setJoined] = useState(false);
  const activity = getActivity(friend.activity);
  const left = formatRemaining((friend.freeUntil ?? now) - now);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify().damping(18)}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Avatar name={friend.name} free size={44} />
      <View style={styles.body}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {friend.name.split(' ')[0]}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {activity ? `${activity.emoji} ${activity.label}` : 'Free to hang'} · {left} left
        </Text>
      </View>
      <Button
        size="sm"
        variant={joined ? 'secondary' : 'primary'}
        label={joined ? "You're in ✓" : "I'm in"}
        onPress={() => {
          setJoined((j) => !j);
          if (!joined) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  body: { flex: 1, gap: 2 },
});
