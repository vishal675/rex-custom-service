import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { errorMessage } from '@/lib/errors';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { useJoin } from './api';
import { formatRemaining, getActivity } from './model';
import type { FreeNowItem } from './server';

type Props = { item: FreeNowItem; now: number; index: number };

export function FreeFriendCard({ item, now, index }: Props) {
  const { colors } = useTheme();
  const join = useJoin();
  const activity = getActivity(item.activity);
  const left = formatRemaining(item.expiresAt - now);
  const others = item.joinCount - (item.joined ? 1 : 0);

  const toggle = () => {
    const joining = !item.joined;
    join.mutate(
      { availabilityId: item.availabilityId, join: joining },
      {
        onSuccess: () => {
          if (joining) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: (e) => Alert.alert("Couldn't update", errorMessage(e)),
      },
    );
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify().damping(18)}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Avatar name={item.displayName} path={item.avatarPath} free size={44} />
      <View style={styles.body}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {item.displayName.split(' ')[0]}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {activity ? `${activity.emoji} ${activity.label}` : 'Free to hang'} · {left} left
          {others > 0 ? ` · ${others} in` : ''}
        </Text>
      </View>
      {item.joined ? (
        <Button
          size="sm"
          variant="secondary"
          label="Chat"
          onPress={() => router.push({ pathname: '/meetup/[id]', params: { id: item.availabilityId } })}
        />
      ) : null}
      <Button
        size="sm"
        variant={item.joined ? 'ghost' : 'primary'}
        label={item.joined ? 'Leave' : "I'm in"}
        loading={join.isPending}
        onPress={toggle}
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
