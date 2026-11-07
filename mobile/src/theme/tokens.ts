/**
 * Design tokens — the single source of truth for colour, type, spacing and shape.
 * Never hard-code these values in components; import from here.
 */

export const palette = {
  lime: '#C6F432',
  limeDeep: '#7FA80A',
  ink: '#0E0E10',
  paper: '#FAF9F6',
  coral: '#FF6B5C',
} as const;

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  /** The "free" colour. Used for the I'M FREE button, live indicators, primary CTAs. */
  accent: string;
  /** Text/icons placed on top of `accent`. */
  onAccent: string;
  /** Accent used for text on the page background (lime is unreadable on light paper). */
  accentText: string;
  busy: string;
  danger: string;
};

export const colors: { dark: ThemeColors; light: ThemeColors } = {
  dark: {
    background: palette.ink,
    surface: '#17171A',
    surfaceRaised: '#212125',
    border: '#2A2A30',
    text: '#F5F5F2',
    textMuted: '#9A9AA3',
    accent: palette.lime,
    onAccent: palette.ink,
    accentText: palette.lime,
    busy: '#3A3A40',
    danger: palette.coral,
  },
  light: {
    background: palette.paper,
    surface: '#FFFFFF',
    surfaceRaised: '#F1F0EB',
    border: '#E6E4DD',
    text: '#111113',
    textMuted: '#6B6B73',
    accent: palette.lime,
    onAccent: palette.ink,
    accentText: palette.limeDeep,
    busy: '#D9D8D2',
    danger: '#E5483A',
  },
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Font family names as registered by expo-font in the root layout. */
export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displayHeavy: 'BricolageGrotesque_800ExtraBold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const type = {
  hero: { fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 38, letterSpacing: -0.5 },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.display, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 17 },
  overline: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 1.2 },
} as const;

export type TypeVariant = keyof typeof type;
