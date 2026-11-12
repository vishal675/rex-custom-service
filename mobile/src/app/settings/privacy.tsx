import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Text } from '@/components/ui/text';
import { PRIVACY_URL } from '@/constants/app';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** How VYBE handles your data, in plain words — every line here is enforced by the server. */
const FACTS = [
  {
    title: 'You choose who sees you’re free',
    body: 'Each time you go free you pick all friends or specific groups. Nobody else is told.',
  },
  {
    title: 'No public profile',
    body: 'Only friends, people with a pending request, and people in the same plan can see your name and photo.',
  },
  {
    title: 'Found by exact username only',
    body: 'There’s no search or browse — someone needs your full username to add you.',
  },
  {
    title: 'Chats are short-lived',
    body: 'Plan chats close when the plan ends and disappear from the app after 24 hours.',
  },
  { title: 'Your birthday isn’t stored', body: 'We only check you’re 18 or older, then discard the date.' },
  { title: 'Delete anytime', body: 'Deleting your account removes your profile, friends, plans, chats and photo.' },
] as const;

export default function PrivacySettings() {
  const { colors } = useTheme();
  const card = [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }];
  const chevron = <Icon name="chevronRight" size={16} color={colors.textMuted} />;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <View style={[card, styles.facts]}>
        {FACTS.map((f) => (
          <View key={f.title} style={styles.fact}>
            <Text variant="bodyStrong">{f.title}</Text>
            <Text variant="caption" tone="muted">
              {f.body}
            </Text>
          </View>
        ))}
      </View>

      <View style={card}>
        <ListRow
          onPress={() => router.push('/settings/blocked')}
          left={<Icon name="block" />}
          title="Blocked users"
          subtitle="See and unblock people"
          right={chevron}
        />
        {PRIVACY_URL ? (
          <ListRow
            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}
            left={<Icon name="lock" />}
            title="Privacy policy"
            right={chevron}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  facts: { paddingVertical: spacing.lg, gap: spacing.lg },
  fact: { gap: 2 },
});
