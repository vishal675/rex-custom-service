import { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { normalizeUsername, usernameError } from '@/features/auth/model';
import { useProfile } from '@/features/auth/session';
import { findUser, useFriends, useSendFriendRequest, type FoundUser } from '@/features/friends/api';
import { errorMessage } from '@/lib/errors';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Add a friend by exact username (no partial search, so nobody can browse the user list). */
export default function AddFriendSheet() {
  const { colors } = useTheme();
  const profile = useProfile();
  const friends = useFriends();
  const send = useSendFriendRequest();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<FoundUser | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    const u = normalizeUsername(query);
    setResult(null);
    if (usernameError(u)) {
      setMessage('Enter their full username.');
      return;
    }
    setSearching(true);
    setMessage(null);
    try {
      const found = await findUser(u);
      if (found) setResult(found);
      else setMessage(`No one called @${u}. Check the spelling, or invite them below.`);
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setSearching(false);
    }
  };

  const existing = result ? friends.data?.find((f) => f.id === result.id)?.status : undefined;

  const add = async () => {
    if (!result) return;
    try {
      const status = await send.mutateAsync(result.id);
      setMessage(status === 'accepted' ? `You and ${result.displayName} are now friends.` : 'Request sent.');
    } catch (e) {
      Alert.alert("Couldn't send request", errorMessage(e));
    }
  };

  const invite = () => {
    const me = profile.data?.username;
    Share.share({
      message: `I'm on VYBE — the app for when you're free to hang. Add me: @${me ?? ''}`,
    }).catch(() => {});
  };

  const actionLabel =
    existing === 'friend' ? 'Friends ✓' : existing === 'outgoing' ? 'Requested' : existing === 'incoming' ? 'Accept' : 'Add';

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text variant="title">Add a friend</Text>
      <TextField
        label="USERNAME"
        value={query}
        onChangeText={(t) => {
          setQuery(t.toLowerCase().replace(/\s/g, ''));
          setMessage(null);
          setResult(null);
        }}
        placeholder="@username"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={search}
        autoFocus
      />
      <Button label="Find" onPress={search} loading={searching} />

      {result ? (
        <View style={[styles.result, { backgroundColor: colors.surfaceRaised }]}>
          <Avatar name={result.displayName} />
          <View style={styles.flex}>
            <Text variant="bodyStrong">{result.displayName}</Text>
            <Text variant="caption" tone="muted">
              @{result.username}
            </Text>
          </View>
          <Button
            size="sm"
            label={actionLabel}
            disabled={existing === 'friend' || existing === 'outgoing'}
            loading={send.isPending}
            onPress={add}
          />
        </View>
      ) : null}

      {message ? (
        <Text variant="body" tone="muted" accessibilityLiveRegion="polite">
          {message}
        </Text>
      ) : null}

      <View style={[styles.invite, { borderColor: colors.border }]}>
        <Text variant="bodyStrong">Friends not on VYBE yet?</Text>
        <Text variant="caption" tone="muted">
          Send them your username so they can add you once they join.
        </Text>
        <Button variant="secondary" label="Invite friends" onPress={invite} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingTop: spacing.xxl, gap: spacing.lg },
  result: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg },
  flex: { flex: 1 },
  invite: { gap: spacing.sm, paddingTop: spacing.xl, marginTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
