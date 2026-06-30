/**
 * Primed design tokens - extracted 1:1 from the "Pulse / Primed Hi-Fi" Claude Design doc.
 * Dark-mode-first strength tracker. Single accent (electric green), big tabular numbers.
 */
import { Platform, TextStyle } from 'react-native';

export const palette = {
  bg: '#0A0B0D', // app background (true-black-ish, OLED)
  surface: '#15171B', // cards / sheets
  surface2: '#1E2127', // elevated rows / inputs
  surface3: '#2C313A', // chips / dividers on elevated
  hairline: '#262B33', // subtle borders
  hairlineSoft: '#191C21',

  text: '#E8EAED', // primary text (never pure white)
  textDim: '#9AA0A8', // labels / secondary
  textMute: '#6B727C', // tertiary / disabled
  textGhost: '#4B525B', // pre-fill ghost text ("minule")

  accent: '#00E07A', // electric green - action / success / PR
  accentDeep: '#06210F', // accent tint background
  accentMid: '#1F7A4D',
  accentSoft: '#5FE6A6',

  amber: '#FFB020', // near-failure / warning
  red: '#FF5247', // destructive only

  heatCold: '#7FA3D6', // muscle heatmap: under-trained (cool)
  // heatmap gradient: heatCold -> accent -> amber -> red (under -> optimal -> over)
} as const;

export const radius = {
  sm: 12, // inputs
  md: 16, // cards
  lg: 22,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Inter, loaded via @expo-google-fonts/inter. Falls back to system if unavailable. */
export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** Tabular numerals so weights/reps/timers don't shift width as digits change. */
export const tabularNums: TextStyle = { fontVariant: ['tabular-nums'] };

export const type = {
  hero: 46, // the biggest weight/score numbers
  display: 34, // section hero numbers
  title: 22,
  h1: 20,
  h2: 17,
  body: 15,
  label: 13,
  caption: 11,
} as const;

// ---- legacy shape kept so default-template imports keep compiling ----
export const Colors = {
  light: {
    text: palette.text,
    background: palette.bg,
    backgroundElement: palette.surface2,
    backgroundSelected: palette.surface3,
    textSecondary: palette.textDim,
  },
  dark: {
    text: palette.text,
    background: palette.bg,
    backgroundElement: palette.surface2,
    backgroundSelected: palette.surface3,
    textSecondary: palette.textDim,
  },
} as const;

export type ThemeColor = keyof typeof Colors.dark;

export const Fonts = Platform.select({
  default: { sans: font.regular, serif: 'serif', rounded: font.regular, mono: 'monospace' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MaxContentWidth = 480;
