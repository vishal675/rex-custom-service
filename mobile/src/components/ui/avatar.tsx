import { StyleSheet, View } from 'react-native';

import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { Text } from './text';

/** Muted, warm avatar backgrounds — deterministic per name so a friend always gets the same colour. */
const AVATAR_COLORS = ['#F2A65A', '#7CC6FE', '#C792EA', '#F78C6C', '#89DDB8', '#FFCB6B', '#FF8FA3'];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

type Props = {
  name: string;
  size?: number;
  /** Shows the lime "free" ring around the avatar. */
  free?: boolean;
};

export function Avatar({ name, size = 44, free }: Props) {
  const { colors } = useTheme();
  const ring = free ? 2.5 : 0;
  const gap = free ? 2.5 : 0;
  const outer = size + (ring + gap) * 2;

  return (
    <View
      accessibilityLabel={free ? `${name}, free now` : name}
      style={[
        styles.ring,
        {
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          borderWidth: ring,
          borderColor: colors.accent,
        },
      ]}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: avatarColor(name),
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: size * 0.36, color: '#1A1A1A' }}>
          {initials(name)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { alignItems: 'center', justifyContent: 'center' },
});
