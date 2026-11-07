import { StyleSheet, View } from 'react-native';

import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { MOCK_MEETUPS } from '@/features/friends/mock-data';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function ChatsScreen() {
  const { colors } = useTheme();

  return (
    <Screen title="Chats">
      <Text variant="caption" tone="muted">
        Meetup chats open when friends say “I&apos;m in” and close when the plan expires.
      </Text>
      {MOCK_MEETUPS.map((m) => (
        <ListRow
          key={m.id}
          onPress={() => {}}
          left={
            <View style={[styles.emoji, { backgroundColor: colors.surfaceRaised }]}>
              <Text style={styles.emojiText}>{m.emoji}</Text>
            </View>
          }
          title={m.title}
          subtitle={m.lastMessage}
          right={
            <Text variant="caption" tone="accent">
              {m.expiresInMin}m
            </Text>
          }
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  emoji: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: { fontSize: 22, lineHeight: 28 },
});
