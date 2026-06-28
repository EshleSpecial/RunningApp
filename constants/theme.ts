import { useEffect, useState } from 'react';
import { Appearance } from 'react-native';

export const Colors = {
  primary: '#1a2f5a',
  accent: '#E8832A',

  backgroundLight: '#F5F5F5',
  backgroundDark: '#0D0D0D',

  surfaceLight: '#FFFFFF',
  surfaceDark: '#1C1C1E',

  textLight: '#111111',
  textDark: '#F0F0F0',

  success: '#2E7D32',
  warning: '#F9A825',
  danger: '#C62828',
} as const;

export const Typography = {
  xs: 11,
  sm: 13,
  md: 16,
  lg: 20,
  xl: 26,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
} as const;

export const BorderRadius = {
  sm: 4,
  md: 10,
  lg: 20,
} as const;

interface ThemeTokens {
  colors: {
    primary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    success: string;
    warning: string;
    danger: string;
  };
  typography: typeof Typography;
  spacing: typeof Spacing;
  borderRadius: typeof BorderRadius;
}

export function useTheme(): ThemeTokens {
  const [scheme, setScheme] = useState(Appearance.getColorScheme());

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setScheme(colorScheme);
    });
    return () => sub.remove();
  }, []);

  const dark = scheme === 'dark';

  return {
    colors: {
      primary: Colors.primary,
      accent: Colors.accent,
      background: dark ? Colors.backgroundDark : Colors.backgroundLight,
      surface: dark ? Colors.surfaceDark : Colors.surfaceLight,
      text: dark ? Colors.textDark : Colors.textLight,
      success: Colors.success,
      warning: Colors.warning,
      danger: Colors.danger,
    },
    typography: Typography,
    spacing: Spacing,
    borderRadius: BorderRadius,
  };
}
