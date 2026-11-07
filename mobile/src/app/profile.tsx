import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Icon, type IconName } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Text } from '@/components/ui/text';
import { MOCK_ME } from '@/constants/app';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const ROWS: { icon: IconName; title: string; subtitle: string }[] = [
  { icon: 'person', title: 'Edit profile', subtitle: 'Photo, name, username' },
  { icon: 'lock', title: 'Privacy', subtitle: 'Who sees when you’re free' },
  { icon: 'bell', title: 'Notifications', subtitle: 'Muted friends, quiet hours' },
  { icon: 'block', title: 'Blocked users', subtitle: 'None' },
  { icon: 'qr', title: 'My QR code', subtitle: 'Let friends scan to add you' },
];

export default function ProfileScreen() {
  const { colors } = useTheme();
  const soon = () => Alert.alert('Coming soon', 'Settings arrive with accounts in Stage 3.');

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <View style={styles.hero}>
        <Avatar name={MOCK_ME.name} size={88} />
        <Text variant="title">{MOCK_ME.name}</Text>
        <Text variant="body" tone="muted">
          @{MOCK_ME.username}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {ROWS.map((r) => (
          <ListRow
            key={r.title}
            onPress={soon}
            left={<Icon name={r.icon} />}
            title={r.title}
            subtitle={r.subtitle}
            right={<Icon name="chevronRight" size={16} color={colors.textMuted} />}
          />
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ListRow onPress={soon} left={<Icon name="logout" color={colors.danger} />} title="Log out" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.xs },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
});
