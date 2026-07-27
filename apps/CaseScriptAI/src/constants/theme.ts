/**
 * Serene Clinical design tokens — source: assets/ui_design/.../DESIGN.md
 * Consume via `useTheme()`, `ThemedText`, `ThemedView`. Do not hardcode palette hex in screens.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1c1c19',
    background: '#fcf9f5',
    backgroundElement: '#f0ede9',
    backgroundSelected: '#ebe8e4',
    textSecondary: '#414943',
    primary: '#3a6750',
    onPrimary: '#ffffff',
    surface: '#fcf9f5',
    outline: '#717973',
    outlineVariant: '#c0c9c1',
    surfaceContainerHigh: '#ebe8e4',
    primaryFixedDim: '#a0d2b5',
    secondaryFixedDim: '#b3cad7',
    secondaryContainer: '#cce3f1',
    onSecondaryContainer: '#506671',
  },
  dark: {
    text: '#f3f0ec',
    background: '#1c1c19',
    backgroundElement: '#31302e',
    backgroundSelected: '#414943',
    textSecondary: '#c0c9c1',
    primary: '#a0d2b5',
    onPrimary: '#002113',
    surface: '#1c1c19',
    outline: '#8b938c',
    outlineVariant: '#414943',
    surfaceContainerHigh: '#31302e',
    primaryFixedDim: '#3a6750',
    secondaryFixedDim: '#4c616d',
    secondaryContainer: '#344a55',
    onSecondaryContainer: '#cce3f1',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Loaded font family name from `assets/fonts/DMSans.ttf` via `useDmSans()`. */
export const FontFamily = {
  sans: 'DMSans',
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: FontFamily.sans,
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: FontFamily.sans,
    serif: 'serif',
    rounded: FontFamily.sans,
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
  section: 48,
  marginMobile: 20,
  marginTablet: 40,
} as const;

export const Radius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
} as const;

export const Layout = {
  tabletBreakpoint: 768,
  maxContentWidth: 800,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = Layout.maxContentWidth;
