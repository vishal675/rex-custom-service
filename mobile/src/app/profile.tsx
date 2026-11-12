import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Icon, type IconName } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Text } from '@/components/ui/text';
import { signOut, useProfile } from '@/features/auth/session';
import { useAvailability } from '@/features/availability/availability-context';
import { deleteAccount } from '@/features/profile/api';
import { errorMessage } from '@/lib/errors';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const ROWS: { icon: IconName; title: string; subtitle: string; href: Href }[] = [
  { icon: 'bell', title: 'Notifications', subtitle: 'On/off, quiet hours, sounds', href: '/settings/notifications' },
  { icon: 'lock', title: 'Privacy', subtitle: 'Who sees what', href: '/settings/privacy' },
  { icon: 'block', title: 'Blocked users', subtitle: 'Manage people you’ve blocked', href: '/settings/blocked' },
];

export default function ProfileScreen() {
  const { colors } = useTheme();
  const profile = useProfile();
  const { isPremium } = useAvailability();
  const name = profile.data?.displayName ?? '';
  const [deleting, setDeleting] = useState(false);

  const reallyDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount(); // signs out → router shows sign-in
    } catch (e) {
      setDeleting(false);
      Alert.alert("Couldn't delete account", errorMessage(e));
    }
  };

  const confirmDelete = () =>
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your profile, friends, groups, plans, chats and photo. It can’t be undone.' +
        (isPremium
          ? '\n\nYour Premium subscription is billed by the App Store / Google Play — cancel it there to stop renewals.'
          : ''),
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete forever', style: 'destructive', onPress: reallyDelete },
      ],
    );

  const shareUsername = () => {
    const me = profile.data?.username;
    if (!me) return;
    Share.share({ message: `Add me on VYBE: @${me}` }).catch(() => {});
  };

  const confirmSignOut = () =>
    Alert.alert('Log out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => signOut() },
    ]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <View style={styles.hero}>
        <Avatar name={name || '?'} path={profile.data?.avatarPath} size={88} />
        <Text variant="title">{name}</Text>
        <Text variant="body" tone="muted">
          @{profile.data?.username ?? ''}
          {isPremium ? ' · Premium' : ''}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ListRow
          onPress={() => router.push('/premium')}
          left={<Icon name="premium" color={colors.accentText} />}
          title={isPremium ? 'VYBE Premium' : 'Get VYBE Premium'}
          subtitle={isPremium ? 'Active · manage subscription' : 'Unlimited groups'}
          right={<Icon name="chevronRight" size={16} color={colors.textMuted} />}
        />
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ListRow
          onPress={() => router.push('/edit-profile')}
          left={<Icon name="person" />}
          title="Edit profile"
          subtitle="Photo, name, username"
          right={<Icon name="chevronRight" size={16} color={colors.textMuted} />}
        />
        {ROWS.map((r) => (
          <ListRow
            key={r.title}
            onPress={() => router.push(r.href)}
            left={<Icon name={r.icon} />}
            title={r.title}
            subtitle={r.subtitle}
            right={<Icon name="chevronRight" size={16} color={colors.textMuted} />}
          />
        ))}
        <ListRow
          onPress={shareUsername}
          left={<Icon name="share" />}
          title="Share my username"
          subtitle={`@${profile.data?.username ?? ''} — so friends can add you`}
        />
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ListRow onPress={confirmSignOut} left={<Icon name="logout" color={colors.danger} />} title="Log out" />
        <ListRow
          onPress={deleting ? undefined : confirmDelete}
          left={<Icon name="block" color={colors.danger} />}
          title="Delete account"
          subtitle="Permanently delete your account and data"
          right={deleting ? <ActivityIndicator /> : undefined}
        />
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
