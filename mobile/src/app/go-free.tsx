import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { useAvailability } from '@/features/availability/availability-context';
import {
  ACTIVITIES,
  DURATIONS,
  type ActivityId,
  type Audience,
  type DurationId,
} from '@/features/availability/model';
import { MOCK_CIRCLES, audienceSize } from '@/features/friends/mock-data';
import { spacing } from '@/theme/tokens';

/** Bottom sheet: what, for how long, and who. Opens pre-filled with the last choices. */
export default function GoFreeSheet() {
  const { current, lastSettings, goFree } = useAvailability();
  const initial = current ?? lastSettings;

  const [activity, setActivity] = useState<ActivityId | null>(initial.activity);
  const [duration, setDuration] = useState<DurationId>(initial.duration);
  const [audience, setAudience] = useState<Audience>(initial.audience);

  const reach = audienceSize(audience);

  const toggleCircle = (id: string) =>
    setAudience((a) => {
      const circleIds = a.circleIds.includes(id) ? a.circleIds.filter((c) => c !== id) : [...a.circleIds, id];
      return { allFriends: false, circleIds };
    });

  const submit = () => {
    goFree({ activity, duration, audience });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text variant="title">{current ? 'Update' : "What's the vibe?"}</Text>

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
          label="All friends"
          selected={audience.allFriends}
          onPress={() => setAudience({ allFriends: true, circleIds: [] })}
        />
        {MOCK_CIRCLES.map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            emoji={c.emoji}
            selected={!audience.allFriends && audience.circleIds.includes(c.id)}
            onPress={() => toggleCircle(c.id)}
          />
        ))}
      </Section>

      <Button
        label={reach === 0 ? 'Pick who sees it' : `${current ? 'Update' : 'Go free'} · notify ${reach}`}
        disabled={reach === 0}
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
  content: { padding: spacing.xl, paddingTop: spacing.xxl, gap: spacing.xl },
  section: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  submit: { marginTop: spacing.sm },
});
