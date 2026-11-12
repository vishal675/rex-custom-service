import { useQuery } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { useSettings, useUpdateSettings } from '@/features/settings/api';
import {
  DEFAULT_QUIET_END,
  hourLabel,
  QUIET_END_HOURS,
  QUIET_START_HOURS,
  quietHoursSummary,
  quietHoursUpdate,
} from '@/features/settings/model';
import { errorMessage } from '@/lib/errors';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Push on/off and quiet hours. Both are enforced by the server's push function, in the user's timezone. */
export default function NotificationSettings() {
  const { colors } = useTheme();
  const settings = useSettings();
  const update = useUpdateSettings();
  const permission = useQuery({ queryKey: ['notification-permission'], queryFn: Notifications.getPermissionsAsync });

  // Re-check after the user comes back from the phone's Settings app.
  useFocusEffect(
    useCallback(() => {
      permission.refetch();
    }, [permission]),
  );

  const save = (patch: Parameters<typeof update.mutate>[0]) =>
    update.mutate(patch, { onError: (e) => Alert.alert("Couldn't save", errorMessage(e)) });

  if (settings.isPending) return <ActivityIndicator style={styles.loading} />;
  if (settings.isError) {
    return (
      <View style={styles.content}>
        <Text tone="muted">{errorMessage(settings.error)}</Text>
        <Button variant="secondary" label="Try again" onPress={() => settings.refetch()} />
      </View>
    );
  }

  const { notificationsEnabled, quietHours, timezone } = settings.data;
  const osBlocked = permission.data && !permission.data.granted;
  const card = [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      {osBlocked ? (
        <View style={[card, styles.gap]}>
          <Text variant="bodyStrong">Notifications are off in your phone’s settings</Text>
          <Text variant="caption" tone="muted">
            Turn them on to hear when friends are free or message you.
          </Text>
          <Button size="sm" variant="secondary" label="Open phone settings" onPress={() => Linking.openSettings()} />
        </View>
      ) : null}

      <View style={card}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text variant="bodyStrong">Push notifications</Text>
            <Text variant="caption" tone="muted">
              Friends going free, joins, messages, friend requests
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={(v) => save({ notifications_enabled: v })}
            trackColor={{ true: colors.accent }}
            accessibilityLabel="Push notifications"
          />
        </View>
      </View>

      <View style={[card, styles.gap, !notificationsEnabled && styles.dim]}>
        <View>
          <Text variant="bodyStrong">Quiet hours</Text>
          <Text variant="caption" tone="muted">
            {quietHoursSummary(quietHours)} · {timezone}
          </Text>
        </View>
        <Text variant="overline" tone="muted">
          FROM
        </Text>
        <View style={styles.chips}>
          <Chip label="Off" selected={!quietHours} onPress={() => save(quietHoursUpdate(null, null))} />
          {QUIET_START_HOURS.map((h) => (
            <Chip
              key={h}
              label={hourLabel(h)}
              selected={quietHours?.start === h}
              onPress={() => save(quietHoursUpdate(h, quietHours?.end ?? DEFAULT_QUIET_END))}
            />
          ))}
        </View>
        {quietHours ? (
          <>
            <Text variant="overline" tone="muted">
              UNTIL
            </Text>
            <View style={styles.chips}>
              {QUIET_END_HOURS.map((h) => (
                <Chip
                  key={h}
                  label={hourLabel(h)}
                  selected={quietHours.end === h}
                  onPress={() => save(quietHoursUpdate(quietHours.start, h))}
                />
              ))}
            </View>
          </>
        ) : null}
      </View>

      <View style={[card, styles.gap]}>
        <Text variant="bodyStrong">Sounds</Text>
        <Text variant="caption" tone="muted">
          VYBE plays its own chime when a friend is free and a pop for messages. Change or mute them in your phone’s
          notification settings.
        </Text>
        <Button size="sm" variant="secondary" label="Open phone settings" onPress={() => Linking.openSettings()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: spacing.xxl },
  content: { padding: spacing.xl, gap: spacing.lg },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  gap: { gap: spacing.md },
  dim: { opacity: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
