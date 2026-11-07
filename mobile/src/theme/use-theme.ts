import { useColorScheme } from '@/hooks/use-color-scheme';

import { colors, type ThemeColors } from './tokens';

export type Scheme = 'light' | 'dark';

export function useTheme(): { colors: ThemeColors; scheme: Scheme } {
  const scheme: Scheme = useColorScheme() === 'light' ? 'light' : 'dark';
  return { colors: colors[scheme], scheme };
}
