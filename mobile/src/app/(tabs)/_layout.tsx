import { NativeTabs } from 'expo-router/native-tabs';

import { badgeLabel, useBadges } from '@/features/badges';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/theme/use-theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  const now = useNow(30_000);
  const badges = useBadges(now);

  return (
    <NativeTabs
      backgroundColor={colors.background}
      tintColor={colors.accentText}
      iconColor={{ default: colors.textMuted, selected: colors.accentText }}
      indicatorColor={colors.surfaceRaised}
      badgeBackgroundColor={colors.danger}
      labelStyle={{ default: { color: colors.textMuted }, selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bolt', selected: 'bolt.fill' }} md="bolt" />
        <NativeTabs.Trigger.Badge hidden={!badges.home}>{badgeLabel(badges.home)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chats">
        <NativeTabs.Trigger.Label>Chats</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'bubble.left.and.bubble.right', selected: 'bubble.left.and.bubble.right.fill' }}
          md="forum"
        />
        <NativeTabs.Trigger.Badge hidden={!badges.chats}>{badgeLabel(badges.chats)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="friends">
        <NativeTabs.Trigger.Label>Friends</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} md="group" />
        <NativeTabs.Trigger.Badge hidden={!badges.friends}>{badgeLabel(badges.friends)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
