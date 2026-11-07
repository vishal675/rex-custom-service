import { Text as RNText, type TextProps } from 'react-native';

import { type, type TypeVariant } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Tone = 'default' | 'muted' | 'accent' | 'onAccent' | 'danger';

export type AppTextProps = TextProps & {
  variant?: TypeVariant;
  tone?: Tone;
};

export function Text({ variant = 'body', tone = 'default', style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  const color = {
    default: colors.text,
    muted: colors.textMuted,
    accent: colors.accentText,
    onAccent: colors.onAccent,
    danger: colors.danger,
  }[tone];

  return <RNText {...rest} style={[type[variant], { color }, style]} />;
}
