import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { spacing } from '@/theme/tokens';

/** Meetup chat UI arrives in Phase 3e. The backend (meetup_messages + RLS) is already in place. */
export default function ChatsScreen() {
  return (
    <Screen title="Chats">
      <View style={styles.empty}>
        <Text style={styles.emoji}>💬</Text>
        <Text variant="heading">Meetup chats are coming</Text>
        <Text variant="body" tone="muted" style={styles.center}>
          When friends say “I&apos;m in”, you&apos;ll plan the details here. Chats close when the plan ends.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxxl },
  emoji: { fontSize: 40, lineHeight: 48 },
  center: { textAlign: 'center' },
});
