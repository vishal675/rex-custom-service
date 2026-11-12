import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { useAvailability } from '@/features/availability/availability-context';
import {
  ACTIVITIES,
  DURATIONS,
  isActive,
  type ActivityId,
  type Audience,
  type DurationId,
} from '@/features/availability/model';
import { useCircles, useFriends } from '@/features/friends/api';
import { audienceSize, usableCircleIds } from '@/features/friends/model';
import { promptPremium } from '@/features/premium/prompt';
import { serverNow } from '@/lib/clock';
import { errorMessage, isPremiumRequired } from '@/lib/errors';
import { spacing } from '@/theme/tokens';

/** Bottom sheet: what, for how long, and who. Opens pre-filled with the current or last choices. */
export default function GoFreeSheet() {
  const { availability, lastSettings, goFree, isSaving, isPremium } = useAvailability();
  const friends = useFriends();
  const circles = useCircles();
  const current = isActive(availability, serverNow()) ? availability : null;
  const initial = current ?? lastSettings;

  const [activity, setActivity] = useState<ActivityId | null>(initial.activity);
  const [duration, setDuration] = useState<DurationId>(initial.duration);
  const [audience, setAudience] = useState<Audience>(initial.audience);

  const friendIds = (friends.data ?? []).filter((f) => f.status === 'friend').map((f) => f.id);
  const circleList = circles.data ?? [];
  const usable = usableCircleIds(circleList, isPremium);
  // Drop remembered circles that were deleted or are locked.
  const effectiveAudience: Audience = audience.allFriends
    ? audience
    : { allFriends: false, circleIds: audience.circleIds.filter((id) => usable.has(id)) };
  const reach = audienceSize(effectiveAudience, friendIds, circleList);
  const loading = friends.isPending || circles.isPending;

  const toggleCircle = (id: string) => {
    if (!usable.has(id)) {
      promptPremium();
      return;
    }
    setAudience((a) => {
      const ids = a.allFriends ? [] : a.circleIds;
      const circleIds = ids.includes(id) ? ids.filter((c) => c !== id) : [...ids, id];
      return { allFriends: false, circleIds };
    });
  };

  const submit = async () => {
    try {
      const { recipientCount } = await goFree({ activity, duration, audience: effectiveAudience });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
      if (recipientCount === 0) {
        Alert.alert("You're free", 'None of your friends were notified — add friends to get started.');
      }
    } catch (e) {
      if (isPremiumRequired(e)) promptPremium();
      else Alert.alert("Couldn't go free", errorMessage(e));
    }
  };

  const title = current ? 'Update' : "What's the vibe?";
  const label = loading
    ? 'Loading…'
    : friendIds.length === 0
      ? `${current ? 'Update' : 'Go free'}`
      : reach === 0
        ? 'Pick who sees it'
        : `${current ? 'Update' : 'Go free'} · notify ${reach}`;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Android: full screen with a header, so the title lives there instead of twice. */}
      {Platform.OS === 'ios' ? <Text variant="title">{title}</Text> : <Stack.Screen options={{ title }} />}

      <Section title="ACTIVITY · OPTIONAL">
        {ACTIVITIES.map((a) => (
          <Chip
            key={a.id}
            label={a.label}
            emoji={a.emoji}
            selected={activity === a.id}
            onPress={() => setActivity((cur) => (cur === a.id ? null : a.id))}
          />
        ))}
      </Section>

      <Section title="FOR">
        {DURATIONS.map((d) => (
          <Chip key={d.id} label={d.label} selected={duration === d.id} onPress={() => setDuration(d.id)} />
        ))}
      </Section>

      <Section title="WHO SEES IT">
        <Chip
          label={`All friends${friendIds.length ? ` · ${friendIds.length}` : ''}`}
          selected={audience.allFriends}
          onPress={() => setAudience({ allFriends: true, circleIds: [] })}
        />
        {circleList.map((c) => (
          <Chip
            key={c.id}
            label={usable.has(c.id) ? c.name : `${c.name} 🔒`}
            emoji={c.emoji ?? undefined}
            selected={!audience.allFriends && effectiveAudience.circleIds.includes(c.id)}
            onPress={() => toggleCircle(c.id)}
          />
        ))}
      </Section>

      <Button
        label={label}
        disabled={loading || (friendIds.length > 0 && reach === 0)}
        loading={isSaving}
        onPress={submit}
        style={styles.submit}
      />
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="overline" tone="muted">
        {title}
      </Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingTop: Platform.OS === 'ios' ? spacing.xxl : spacing.lg, gap: spacing.xl },
  section: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  submit: { marginTop: spacing.sm },
});
