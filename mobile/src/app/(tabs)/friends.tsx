import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { useFreeNow } from '@/features/availability/api';
import { useAvailability } from '@/features/availability/availability-context';
import { useCircles, useFriends, useRemoveFriend, useRespondToRequest } from '@/features/friends/api';
import { splitFriends, usableCircleIds, type Friend } from '@/features/friends/model';
import { useNow } from '@/hooks/use-now';
import { errorMessage } from '@/lib/errors';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Tab = 'friends' | 'groups' | 'requests';

export default function FriendsScreen() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('friends');
  const now = useNow(30_000);
  const friendsQuery = useFriends();
  const circlesQuery = useCircles();
  const freeNow = useFreeNow();
  const { isPremium } = useAvailability();
  const respond = useRespondToRequest();
  const remove = useRemoveFriend();

  const { friends, incoming, outgoing } = splitFriends(friendsQuery.data ?? []);
  const circles = circlesQuery.data ?? [];
  const usable = usableCircleIds(circles, isPremium);
  const freeIds = new Set((freeNow.data ?? []).filter((f) => f.expiresAt > now).map((f) => f.userId));

  const openUser = (f: Friend) =>
    router.push({ pathname: '/user/[id]', params: { id: f.id, name: f.displayName, username: f.username, status: f.status, avatar: f.avatarPath ?? '' } });

  const newGroup = () => {
    if (!isPremium && circles.length >= 2) {
      Alert.alert('VYBE Premium', 'The free plan includes 2 groups. Premium unlocks unlimited groups — coming soon.');
      return;
    }
    router.push({ pathname: '/circle/[id]', params: { id: 'new' } });
  };

  const run = (p: Promise<unknown>) => p.catch((e) => Alert.alert("Couldn't update", errorMessage(e)));

  return (
    <Screen
      title="Friends"
      onRefresh={() => {
        friendsQuery.refetch();
        circlesQuery.refetch();
      }}
      refreshing={friendsQuery.isRefetching}
      right={
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Add friend"
          onPress={() => router.push('/add-friend')}
          style={[styles.iconBtn, { backgroundColor: colors.surfaceRaised }]}>
          <Icon name="addPerson" size={20} />
        </PressableScale>
      }>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'friends', label: `Friends ${friends.length}` },
          { value: 'groups', label: 'Groups' },
          { value: 'requests', label: incoming.length ? `Requests ${incoming.length}` : 'Requests' },
        ]}
      />

      {friendsQuery.isError ? (
        <Text variant="body" tone="danger">
          {errorMessage(friendsQuery.error)}
        </Text>
      ) : null}

      {tab === 'friends' &&
        (friends.length === 0 ? (
          <Empty
            text={friendsQuery.isPending ? 'Loading…' : 'No friends yet. Add people by their username.'}
            action={friendsQuery.isPending ? undefined : { label: 'Add a friend', onPress: () => router.push('/add-friend') }}
          />
        ) : (
          friends.map((f) => {
            const free = freeIds.has(f.id);
            return (
              <ListRow
                key={f.id}
                onPress={() => openUser(f)}
                left={<Avatar name={f.displayName} path={f.avatarPath} free={free} />}
                title={f.displayName}
                subtitle={free ? 'Free now' : `@${f.username}`}
              />
            );
          })
        ))}

      {tab === 'groups' && (
        <>
          {circles.length === 0 ? (
            <Empty text="Groups let you choose who sees when you're free — e.g. College, Office, Badminton." />
          ) : (
            circles.map((c) => (
              <ListRow
                key={c.id}
                onPress={() => router.push({ pathname: '/circle/[id]', params: { id: c.id } })}
                left={
                  <View style={[styles.groupIcon, { backgroundColor: colors.surfaceRaised }]}>
                    <Text style={styles.emoji}>{c.emoji ?? '✨'}</Text>
                  </View>
                }
                title={usable.has(c.id) ? c.name : `${c.name} 🔒`}
                subtitle={`${c.memberIds.length} ${c.memberIds.length === 1 ? 'member' : 'members'}`}
                right={<Icon name="chevronRight" size={16} color={colors.textMuted} />}
              />
            ))
          )}
          <Button variant="secondary" label="+ New group" onPress={newGroup} />
        </>
      )}

      {tab === 'requests' && (
        <>
          {incoming.length === 0 && outgoing.length === 0 ? <Empty text="No pending requests." /> : null}
          {incoming.map((r) => (
            <ListRow
              key={r.id}
              left={<Avatar name={r.displayName} path={r.avatarPath} />}
              title={r.displayName}
              subtitle={`@${r.username}`}
              right={
                <View style={styles.actions}>
                  <Button
                    size="sm"
                    variant="secondary"
                    label="Decline"
                    onPress={() => run(respond.mutateAsync({ requesterId: r.id, accept: false }))}
                  />
                  <Button
                    size="sm"
                    label="Accept"
                    onPress={() => run(respond.mutateAsync({ requesterId: r.id, accept: true }))}
                  />
                </View>
              }
            />
          ))}
          {outgoing.length > 0 ? (
            <Text variant="overline" tone="muted">
              SENT
            </Text>
          ) : null}
          {outgoing.map((r) => (
            <ListRow
              key={r.id}
              left={<Avatar name={r.displayName} path={r.avatarPath} />}
              title={r.displayName}
              subtitle={`@${r.username} · pending`}
              right={<Button size="sm" variant="secondary" label="Cancel" onPress={() => run(remove.mutateAsync(r.id))} />}
            />
          ))}
        </>
      )}
    </Screen>
  );
}

function Empty({ text, action }: { text: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.empty}>
      <Text variant="body" tone="muted">
        {text}
      </Text>
      {action ? <Button variant="secondary" label={action.label} onPress={action.onPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  groupIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 20, lineHeight: 26 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  empty: { gap: spacing.lg, paddingVertical: spacing.md },
});
