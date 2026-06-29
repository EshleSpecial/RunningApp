export const Colors = {
  primary: '#1a2f5a',
  accent: '#E8832A',
  white: '#ffffff',
  offWhite: '#e8e4dd',
  background: '#111e3a',
  surface: '#172238',
  surfaceAlt: '#0a1220',
  surfaceDeep: '#0a1220',
  textPrimary: '#e8e4dd',
  textSecondary: '#a8bdd4',
  textMuted: '#7a95b8',
  border: '#223352',
  borderStrong: '#2a4070',
  success: '#16a34a',
  successBg: '#0a1f0e',
  warning: '#d97706',
  danger: '#dc2626',
  streakOrange: '#E8832A',
  quoteAccent: '#E8832A',
  quoteBg: '#0a1220',
  streakBg: '#0a1220',
  workoutColors: {
    easy_run:     { accent: '#16a34a', pillBg: '#0a1f0e', pillText: '#16a34a' },
    long_run:     { accent: '#0ea5e9', pillBg: '#071e2e', pillText: '#38bdf8' },
    interval_run: { accent: '#f43f5e', pillBg: '#1f0a10', pillText: '#fb7185' },
    tempo_run:    { accent: '#f43f5e', pillBg: '#1f0a10', pillText: '#fb7185' },
    fartlek:      { accent: '#a855f7', pillBg: '#150d2e', pillText: '#c084fc' },
    hill_run:     { accent: '#f97316', pillBg: '#1e1008', pillText: '#fb923c' },
    cross_train:  { accent: '#E8832A', pillBg: '#1e1008', pillText: '#E8832A' },
    pt_only:      { accent: '#7c3aed', pillBg: '#150d2e', pillText: '#a78bfa' },
    rest:         { accent: '#374151', pillBg: '#111820', pillText: '#6b7280' },
    race:         { accent: '#E8832A', pillBg: '#1e1008', pillText: '#E8832A' },
  },
};

export const Typography = { xs: 11, sm: 13, md: 16, lg: 20, xl: 26 } as const;
export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 } as const;
export const BorderRadius = { sm: 4, md: 10, lg: 20 } as const;

export function useTheme() {
  return {
    dark: true,
    colors: Colors,
    typography: Typography,
    spacing: Spacing,
    borderRadius: BorderRadius,
  };
}
