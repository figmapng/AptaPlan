import { useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { useOptionalPlanner } from '@/store/planner-store';
import { THEMES, THEME_LIST, getThemeColors, type ThemeConfig, type AppColors } from '@/constants/themes';
import type { ThemeId, ThemeMode } from '@/types/settings';

export function useTheme() {
  const systemColorScheme = useColorScheme();
  const planner = useOptionalPlanner();
  const settings = planner?.settings;
  const setPref = planner?.setPref;

  const themeId: ThemeId = (settings?.theme && THEMES[settings.theme]) ? settings.theme : 'ocean';
  const themeMode: ThemeMode = settings?.themeMode ?? 'system';

  const resolvedTheme: 'light' | 'dark' = useMemo(() => {
    if (themeMode === 'dark') return 'dark';
    if (themeMode === 'light') return 'light';
    return systemColorScheme === 'dark' ? 'dark' : 'light';
  }, [themeMode, systemColorScheme]);

  const isDark = resolvedTheme === 'dark';

  const themeConfig: ThemeConfig = useMemo(() => {
    return THEMES[themeId] || THEMES.ocean;
  }, [themeId]);

  const colors: AppColors = useMemo(() => {
    return getThemeColors(themeId, isDark);
  }, [themeId, isDark]);

  const setTheme = useCallback((newTheme: ThemeId) => {
    return setPref ? setPref('theme', newTheme) : Promise.resolve();
  }, [setPref]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    return setPref ? setPref('themeMode', mode) : Promise.resolve();
  }, [setPref]);

  return {
    theme: themeId,
    themeMode,
    resolvedTheme,
    isDark,
    themeConfig,
    colors,
    allThemes: THEME_LIST,
    setTheme,
    setThemeMode,
  };
}
