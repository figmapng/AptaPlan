import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type ColorTheme } from '@/constants/colors';
import { usePlanner } from '@/store/planner-store';
import type { ThemeMode } from '@/types/settings';

type ThemeContextValue = {
  themePreference: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  isDark: boolean;
  colors: ColorTheme;
  setTheme: (theme: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue>({
  themePreference: 'system',
  resolvedTheme: 'light',
  isDark: false,
  colors: lightColors,
  setTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const { settings, setPref } = usePlanner();

  const themePreference: ThemeMode = settings?.theme ?? 'system';

  const resolvedTheme: 'light' | 'dark' = useMemo(() => {
    if (themePreference === 'dark') return 'dark';
    if (themePreference === 'light') return 'light';
    return systemColorScheme === 'dark' ? 'dark' : 'light';
  }, [themePreference, systemColorScheme]);

  const isDark = resolvedTheme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const setTheme = async (mode: ThemeMode) => {
    await setPref('theme', mode);
  };

  const value = useMemo(
    () => ({
      themePreference,
      resolvedTheme,
      isDark,
      colors,
      setTheme,
    }),
    [themePreference, resolvedTheme, isDark, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
