import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';

import { useTheme } from '@/theme/use-theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

/** App icon set: one name → native SF Symbol on iOS, Material Symbol on Android. */
const ICONS = {
  addPerson: { ios: 'person.badge.plus', android: 'person_add' },
  qr: { ios: 'qrcode', android: 'qr_code' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  bell: { ios: 'bell', android: 'notifications' },
  lock: { ios: 'lock', android: 'lock' },
  block: { ios: 'hand.raised', android: 'block' },
  person: { ios: 'person.crop.circle', android: 'account_circle' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
  chat: { ios: 'bubble.left.and.bubble.right', android: 'forum' },
  plus: { ios: 'plus', android: 'add' },
} as const satisfies Record<string, SymbolName>;

export type IconName = keyof typeof ICONS;

type Props = { name: IconName; size?: number; color?: string };

export function Icon({ name, size = 22, color }: Props) {
  const { colors } = useTheme();
  return <SymbolView name={ICONS[name]} size={size} tintColor={color ?? colors.text} />;
}
