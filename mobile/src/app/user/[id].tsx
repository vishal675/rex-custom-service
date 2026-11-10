import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { REPORT_REASONS, reportUser, useBlockUser, useRemoveFriend, type ReportReason } from '@/features/friends/api';
import { errorMessage } from '@/lib/errors';
import { spacing } from '@/theme/tokens';

/** Friend actions: remove, block, report. */
export default function UserSheet() {
  const { id, name, username, status } = useLocalSearchParams<{
    id: string;
    name?: string;
    username?: string;
    status?: string;
  }>();
  const remove = useRemoveFriend();
  const block = useBlockUser();
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const displayName = name || username || 'this person';

  const confirmRemove = () =>
    Alert.alert(`Remove ${displayName}?`, 'They won’t be notified. You’ll stop seeing when each other is free.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          remove.mutate(id, {
            onSuccess: () => router.back(),
            onError: (e) => Alert.alert("Couldn't remove", errorMessage(e)),
          }),
      },
    ]);

  const confirmBlock = () =>
    Alert.alert(
      `Block ${displayName}?`,
      'They won’t be able to find you, add you or see when you’re free. They won’t be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () =>
            block.mutate(id, {
              onSuccess: () => router.back(),
              onError: (e) => Alert.alert("Couldn't block", errorMessage(e)),
            }),
        },
      ],
    );

  const submitReport = async () => {
    if (!reason) return;
    setSending(true);
    try {
      await reportUser(id, reason, details);
      Alert.alert('Thanks for telling us', 'Our team will review this. You can also block them.', [
        { text: 'Done', onPress: () => router.back() },
        { text: 'Block', style: 'destructive', onPress: confirmBlock },
      ]);
    } catch (e) {
      Alert.alert("Couldn't send report", errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <Avatar name={displayName} size={72} />
        <Text variant="heading">{displayName}</Text>
        {username ? (
          <Text variant="body" tone="muted">
            @{username}
          </Text>
        ) : null}
      </View>

      {!reporting ? (
        <View style={styles.actions}>
          {status === 'friend' ? (
            <Button variant="secondary" label="Remove friend" onPress={confirmRemove} loading={remove.isPending} />
          ) : null}
          <Button variant="secondary" label="Block" onPress={confirmBlock} loading={block.isPending} />
          <Button variant="ghost" label="Report" onPress={() => setReporting(true)} />
        </View>
      ) : (
        <View style={styles.actions}>
          <Text variant="overline" tone="muted">
            WHAT&apos;S WRONG?
          </Text>
          <View style={styles.chips}>
            {REPORT_REASONS.map((r) => (
              <Chip key={r.id} label={r.label} selected={reason === r.id} onPress={() => setReason(r.id)} />
            ))}
          </View>
          <TextField
            label="DETAILS · OPTIONAL"
            value={details}
            onChangeText={setDetails}
            placeholder="Anything that helps us review this"
            maxLength={1000}
            multiline
            style={styles.details}
          />
          <Button label="Send report" disabled={!reason} loading={sending} onPress={submitReport} />
          <Button variant="ghost" size="sm" label="Cancel" onPress={() => setReporting(false)} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingTop: spacing.xxl, gap: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.xs },
  actions: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  details: { height: 96, paddingTop: spacing.md, textAlignVertical: 'top' },
});
