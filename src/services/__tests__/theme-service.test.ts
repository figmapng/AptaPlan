import { THEMES, THEME_LIST, getThemeColors } from '@/constants/themes';
import { defaultSettings } from '@/types/settings';

describe('Theme System', () => {
  it('has default ocean theme configured in defaultSettings', () => {
    expect(defaultSettings.theme).toBe('ocean');
  });

  it('contains all 8 required themes with valid hex colors', () => {
    const expectedThemes = ['ocean', 'emerald', 'violet', 'coral', 'rose', 'indigo', 'amber', 'slate'];
    expect(THEME_LIST.length).toBe(8);
    for (const themeId of expectedThemes) {
      const theme = THEMES[themeId as keyof typeof THEMES];
      expect(theme).toBeDefined();
      expect(theme.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.primaryDark).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.name.length).toBeGreaterThan(0);
      expect(theme.englishName.length).toBeGreaterThan(0);
    }
  });

  it('getThemeColors returns correct colors for specified theme and fallback to ocean', () => {
    const emeraldColors = getThemeColors('emerald');
    expect(emeraldColors.today).toBe('#10B981');
    expect(emeraldColors.primary).toBe('#10B981');
    expect(emeraldColors.background).toBe('#FAFCFB');
    expect(emeraldColors.tintBg).toBe('#ECFDF5');
    expect(emeraldColors.cardHeaderBg).toBe('#EDF3F0');
    expect(emeraldColors.inputBg).toBe('#F6FAF8');
    expect(emeraldColors.cardBorder).toBe('#E2EBE6');

    const amberColors = getThemeColors('amber');
    expect(amberColors.today).toBe('#FFAA01');
    expect(amberColors.background).toBe('#FFFEFA');
    expect(amberColors.cardHeaderBg).toBe('#F2F0ED');
    expect(amberColors.inputBg).toBe('#FAF8F5');

    const violetColors = getThemeColors('violet');
    expect(violetColors.today).toBe('#8B5CF6');
    expect(violetColors.background).toBe('#FCFBFE');
    expect(violetColors.cardHeaderBg).toBe('#F0EEF4');

    const fallbackColors = getThemeColors(undefined as any);
    expect(fallbackColors.today).toBe('#01B7FF');
    expect(fallbackColors.background).toBe('#FAFCFD');
    expect(fallbackColors.cardHeaderBg).toBe('#EDEFF2');
  });
});
