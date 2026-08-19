import { useMemo, useCallback } from 'react';
import { usePlanner } from '@/store/planner-store';
import { THEMES, THEME_LIST, getThemeColors, type ThemeConfig, type AppColors } from '@/constants/themes';
import type { ThemeId } from '@/types/settings';

export function useTheme() {
  const { settings, setPref } = usePlanner();
  const themeId: ThemeId = (settings?.theme && THEMES[settings.theme]) ? settings.theme : 'ocean';

  const themeConfig: ThemeConfig = useMemo(() => {
    return THEMES[themeId] || THEMES.ocean;
  }, [themeId]);

  const colors: AppColors = useMemo(() => {
    return getThemeColors(themeId);
  }, [themeId]);

  const setTheme = useCallback((newTheme: ThemeId) => {
    return setPref('theme', newTheme);
  }, [setPref]);

  return {
    theme: themeId,
    themeConfig,
    colors,
    allThemes: THEME_LIST,
    setTheme,
  };
}
