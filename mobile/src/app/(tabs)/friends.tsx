import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { useAvailability } from '@/features/availability/availability-context';
import { MOCK_CIRCLES, MOCK_FRIENDS, MOCK_REQUESTS } from '@/features/friends/mock-data';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Tab = 'friends' | 'groups' | 'requests';

const comingSoon = (what: string) => Alert.alert('Coming soon', `${what} arrives in a later milestone.`);

export default function FriendsScreen() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('friends');
  const { now } = useAvailability();

  return (
    <Screen
      title="Friends"
      right={
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Add friend"
          onPress={() => comingSoon('Adding friends')}
          style={[styles.iconBtn, { backgroundColor: colors.surfaceRaised }]}>
          <Icon name="addPerson" size={20} />
        </PressableScale>
      }>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'friends', label: `Friends ${MOCK_FRIENDS.length}` },
          { value: 'groups', label: 'Groups' },
          { value: 'requests', label: `Requests ${MOCK_REQUESTS.length}` },
        ]}
      />

      {tab === 'friends' &&
        MOCK_FRIENDS.map((f) => {
          const free = !!f.freeUntil && f.freeUntil > now;
          return (
            <ListRow
              key={f.id}
              left={<Avatar name={f.name} free={free} />}
              title={f.name}
              subtitle={free ? 'Free now' : `@${f.username}`}
            />
          );
        })}

      {tab === 'groups' && (
        <>
          {MOCK_CIRCLES.map((c) => (
            <ListRow
              key={c.id}
              onPress={() => comingSoon('Editing groups')}
              left={
                <View style={[styles.groupIcon, { backgroundColor: colors.surfaceRaised }]}>
                  <Text style={styles.emoji}>{c.emoji}</Text>
                </View>
              }
              title={c.name}
              subtitle={`${c.memberIds.length} members`}
              right={<Icon name="chevronRight" size={16} color={colors.textMuted} />}
            />
          ))}
          <Button variant="secondary" label="+ New group" onPress={() => comingSoon('Creating groups')} />
        </>
      )}

      {tab === 'requests' &&
        MOCK_REQUESTS.map((r) => (
          <ListRow
            key={r.id}
            left={<Avatar name={r.name} />}
            title={r.name}
            subtitle={`@${r.username}`}
            right={<Button size="sm" label="Accept" onPress={() => comingSoon('Friend requests')} />}
          />
        ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  groupIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 20, lineHeight: 26 },
});
