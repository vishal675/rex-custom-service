import { StyleSheet } from 'react-native';

import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { PressableScale } from './pressable-scale';
import { Text } from './text';

type Props = {
  label: string;
  emoji?: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, emoji, selected, onPress }: Props) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.accent : colors.surfaceRaised,
          borderColor: selected ? colors.accent : colors.border,
        },
      ]}>
      <Text variant="label" tone={selected ? 'onAccent' : 'default'}>
        {emoji ? `${emoji}  ${label}` : label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.lg,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
