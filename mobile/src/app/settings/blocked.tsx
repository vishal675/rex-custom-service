import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useBlockedUsers, useUnblock, type BlockedUser } from '@/features/settings/api';
import { errorMessage } from '@/lib/errors';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** People you've blocked. Unblocking doesn't re-add them as friends. */
export default function BlockedUsers() {
  const { colors } = useTheme();
  const blocked = useBlockedUsers();
  const unblock = useUnblock();

  const confirm = (u: BlockedUser) =>
    Alert.alert(
      `Unblock ${u.displayName}?`,
      'They’ll be able to find you and send you a friend request again. They won’t be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: () => unblock.mutate(u.id, { onError: (e) => Alert.alert("Couldn't unblock", errorMessage(e)) }),
        },
      ],
    );

  if (blocked.isPending) return <ActivityIndicator style={styles.loading} />;

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      data={blocked.data ?? []}
      keyExtractor={(u) => u.id}
      refreshing={blocked.isRefetching}
      onRefresh={() => blocked.refetch()}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text variant="bodyStrong">No one blocked</Text>
          <Text variant="caption" tone="muted" style={styles.center}>
            {blocked.isError
              ? errorMessage(blocked.error)
              : 'Block someone from their profile. They can’t find you, add you or see when you’re free.'}
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Avatar name={item.displayName} path={item.avatarPath} />
          <View style={styles.flex}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {item.displayName}
            </Text>
            {item.username ? (
              <Text variant="caption" tone="muted">
                @{item.username}
              </Text>
            ) : null}
          </View>
          <Button
            size="sm"
            variant="secondary"
            label="Unblock"
            loading={unblock.isPending && unblock.variables === item.id}
            onPress={() => confirm(item)}
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: spacing.xxl },
  content: { padding: spacing.xl, gap: spacing.md, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  empty: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xxxl },
  center: { textAlign: 'center' },
});
