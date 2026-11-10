import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useSession } from '@/features/auth/session';
import { useMeetups } from '@/features/meetups/api';
import { meetupTitle } from '@/features/meetups/model';
import { errorMessage } from '@/lib/errors';
import { spacing } from '@/theme/tokens';

export default function ChatsScreen() {
  const { userId } = useSession();
  const meetups = useMeetups();
  const list = meetups.data ?? [];

  return (
    <Screen title="Chats" onRefresh={() => meetups.refetch()} refreshing={meetups.isRefetching}>
      <Text variant="caption" tone="muted">
        A chat opens when a friend says “I&apos;m in”, and closes when the plan ends.
      </Text>

      {meetups.isError ? (
        <Text variant="body" tone="danger">
          {errorMessage(meetups.error)}
        </Text>
      ) : list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emoji}>💬</Text>
          <Text variant="body" tone="muted" style={styles.center}>
            {meetups.isPending ? 'Loading…' : 'No chats yet. Go free, or say “I’m in” to a friend.'}
          </Text>
        </View>
      ) : (
        list.map((m) => (
          <ListRow
            key={m.availabilityId}
            onPress={() => router.push({ pathname: '/meetup/[id]', params: { id: m.availabilityId } })}
            left={<Avatar name={m.ownerName} path={m.ownerAvatarPath} free={m.isLive} />}
            title={meetupTitle(m, userId)}
            subtitle={m.lastMessage ?? `${m.participantCount} people · say hi`}
            right={
              <Text variant="caption" tone={m.isLive ? 'accent' : 'muted'}>
                {m.isLive ? 'Live' : 'Ended'}
              </Text>
            }
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxxl },
  emoji: { fontSize: 40, lineHeight: 48 },
  center: { textAlign: 'center' },
});
