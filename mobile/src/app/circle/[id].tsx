import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ListRow } from '@/components/ui/list-row';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useCircles, useDeleteCircle, useFriends, useSaveCircle } from '@/features/friends/api';
import { CIRCLE_EMOJIS, splitFriends } from '@/features/friends/model';
import { errorMessage, isPremiumRequired } from '@/lib/errors';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Create (`id = "new"`) or edit a group. Only friends can be members (enforced by RLS). */
export default function CircleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const circles = useCircles();
  const friends = useFriends();
  const existing = isNew ? undefined : circles.data?.find((c) => c.id === id);

  if (!isNew && !existing) {
    return (
      <View style={styles.center}>
        <Text variant="body" tone="muted">
          {circles.isPending ? 'Loading…' : 'This group no longer exists.'}
        </Text>
      </View>
    );
  }

  return (
    <CircleForm
      key={existing?.id ?? 'new'}
      id={existing?.id}
      initialName={existing?.name ?? ''}
      initialEmoji={existing?.emoji ?? CIRCLE_EMOJIS[0]}
      initialMembers={existing?.memberIds ?? []}
      friends={splitFriends(friends.data ?? []).friends}
    />
  );
}

function CircleForm({
  id,
  initialName,
  initialEmoji,
  initialMembers,
  friends,
}: {
  id?: string;
  initialName: string;
  initialEmoji: string;
  initialMembers: string[];
  friends: { id: string; displayName: string; username: string }[];
}) {
  const { colors } = useTheme();
  const save = useSaveCircle();
  const del = useDeleteCircle();
  const [name, setName] = useState(initialName);
  const [emoji, setEmoji] = useState(initialEmoji);
  const [members, setMembers] = useState<string[]>(initialMembers);
  const friendIds = new Set(friends.map((f) => f.id));

  const toggle = (fid: string) => setMembers((m) => (m.includes(fid) ? m.filter((x) => x !== fid) : [...m, fid]));

  const submit = async () => {
    try {
      await save.mutateAsync({
        id,
        name,
        emoji,
        // People who stopped being friends can't stay in a group.
        memberIds: members.filter((m) => friendIds.has(m)),
        currentMemberIds: initialMembers,
      });
      router.back();
    } catch (e) {
      Alert.alert(isPremiumRequired(e) ? 'VYBE Premium' : "Couldn't save group", errorMessage(e));
    }
  };

  const confirmDelete = () =>
    Alert.alert(`Delete “${initialName}”?`, 'Friends in it stay your friends.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          del.mutate(id!, {
            onSuccess: () => router.back(),
            onError: (e) => Alert.alert("Couldn't delete", errorMessage(e)),
          }),
      },
    ]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: id ? 'Edit group' : 'New group' }} />
      <TextField label="NAME" value={name} onChangeText={setName} placeholder="College gang" maxLength={40} />
      <View style={styles.chips}>
        {CIRCLE_EMOJIS.map((e) => (
          <Chip key={e} label={e} selected={emoji === e} onPress={() => setEmoji(e)} />
        ))}
      </View>

      <Text variant="overline" tone="muted">
        MEMBERS · {members.filter((m) => friendIds.has(m)).length}
      </Text>
      {friends.length === 0 ? (
        <Text variant="body" tone="muted">
          Add friends first — groups are made from your friends.
        </Text>
      ) : (
        friends.map((f) => {
          const on = members.includes(f.id);
          return (
            <ListRow
              key={f.id}
              onPress={() => toggle(f.id)}
              left={<Avatar name={f.displayName} />}
              title={f.displayName}
              subtitle={`@${f.username}`}
              right={
                <Text variant="bodyStrong" tone={on ? 'accent' : 'muted'}>
                  {on ? '✓' : '+'}
                </Text>
              }
            />
          );
        })
      )}

      <Button label={id ? 'Save' : 'Create group'} disabled={!name.trim()} loading={save.isPending} onPress={submit} />
      {id ? <Button variant="ghost" label="Delete group" onPress={confirmDelete} loading={del.isPending} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
