import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useSession } from '@/features/auth/session';
import { reportMessage, useMeetups, useParticipants, useSendMessage, useThread, type ChatMessage } from '@/features/meetups/api';
import { meetupTitle } from '@/features/meetups/model';
import { useNow } from '@/hooks/use-now';
import { errorMessage } from '@/lib/errors';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function MeetupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { userId } = useSession();
  const now = useNow(15_000);
  const meetups = useMeetups();
  const participants = useParticipants(id);
  const thread = useThread(id);
  const send = useSendMessage(id);
  const [draft, setDraft] = useState('');

  const meetup = meetups.data?.find((m) => m.availabilityId === id);
  const live = !!meetup && meetup.isLive && meetup.endsAt > now;
  const messages = thread.data?.pages.flat() ?? [];
  const names = (participants.data ?? []).map((p) => p.displayName.split(' ')[0]).join(', ');

  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    send.mutate(body, {
      onError: (e) => {
        setDraft(body);
        Alert.alert("Couldn't send", errorMessage(e));
      },
    });
  };

  const onLongPress = (m: ChatMessage) => {
    if (m.senderId === userId) return;
    Alert.alert('Report message?', 'Our team will review it. You can also block this person from their profile.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report',
        style: 'destructive',
        onPress: () =>
          reportMessage(m, id)
            .then(() => Alert.alert('Thanks', 'We’ll take a look.'))
            .catch((e) => Alert.alert("Couldn't report", errorMessage(e))),
      },
    ]);
  };

  if (thread.isError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Chat' }} />
        <Text variant="body" tone="muted">
          {errorMessage(thread.error)}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <Stack.Screen options={{ title: meetup ? meetupTitle(meetup, userId) : 'Chat' }} />
      {names ? (
        <Text variant="caption" tone="muted" style={styles.people} numberOfLines={1}>
          {names}
        </Text>
      ) : null}

      <FlatList
        inverted
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        onEndReached={() => thread.hasNextPage && !thread.isFetchingNextPage && thread.fetchNextPage()}
        onEndReachedThreshold={0.3}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text variant="body" tone="muted" style={styles.emptyText}>
            {thread.isPending ? 'Loading…' : 'Say hi and sort out the details 👋'}
          </Text>
        }
        renderItem={({ item, index }) => {
          const mine = item.senderId === userId;
          // In an inverted list the next item is the older message.
          const older = messages[index + 1];
          const showName = !mine && older?.senderId !== item.senderId;
          return (
            <Pressable onLongPress={() => onLongPress(item)} style={[styles.row, mine && styles.rowMine]}>
              {!mine ? (
                showName ? (
                  <Avatar name={item.senderName} path={item.senderAvatarPath} size={28} />
                ) : (
                  <View style={styles.avatarSpacer} />
                )
              ) : null}
              <View style={styles.bubbleWrap}>
                {showName ? (
                  <Text variant="caption" tone="muted">
                    {item.senderName.split(' ')[0]}
                  </Text>
                ) : null}
                <View
                  style={[
                    styles.bubble,
                    mine ? { backgroundColor: colors.accent } : { backgroundColor: colors.surfaceRaised },
                  ]}>
                  <Text variant="body" tone={mine ? 'onAccent' : 'default'}>
                    {item.body}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      {live ? (
        <View
          style={[
            styles.composer,
            { borderColor: colors.border, backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, spacing.md) },
          ]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message"
            placeholderTextColor={colors.textMuted}
            maxLength={1000}
            multiline
            accessibilityLabel="Message"
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
          />
          <Button size="sm" label="Send" onPress={submit} disabled={!draft.trim()} />
        </View>
      ) : (
        <View style={[styles.ended, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Text variant="caption" tone="muted">
            {meetups.isPending ? '' : 'This plan has ended — the chat is read-only.'}
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  people: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  list: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
  emptyText: { textAlign: 'center', marginVertical: spacing.xxxl, transform: [{ scaleY: -1 }] },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, maxWidth: '85%' },
  rowMine: { alignSelf: 'flex-end' },
  avatarSpacer: { width: 28 },
  bubbleWrap: { gap: 2, flexShrink: 1 },
  bubble: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.lg },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  ended: { alignItems: 'center', paddingTop: spacing.md },
});
