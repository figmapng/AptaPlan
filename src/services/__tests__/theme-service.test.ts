import { THEMES, THEME_LIST, getThemeColors } from '@/constants/themes';
import { defaultSettings } from '@/types/settings';

describe('Theme System', () => {
  it('has default ocean theme configured in defaultSettings', () => {
    expect(defaultSettings.theme).toBe('ocean');
  });

  it('contains all 8 required themes with valid hex colors', () => {
    const expectedThemes = ['ocean', 'pink', 'violet', 'teal', 'amber', 'emerald', 'coral', 'slate'];
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
    const oceanColors = getThemeColors('ocean');
    expect(oceanColors.today).toBe('#01B7FF');
    expect(oceanColors.primary).toBe('#01B7FF');
    expect(oceanColors.background).toBe('#FBFEFF');

    const emeraldColors = getThemeColors('emerald');
    expect(emeraldColors.today).toBe('#00A15F');
    expect(emeraldColors.primary).toBe('#00A15F');
    expect(emeraldColors.background).toBe('#FAFEFB');
    expect(emeraldColors.tintBg).toBe('#E6F7EE');

    const amberColors = getThemeColors('amber');
    expect(amberColors.today).toBe('#FFAA01');
    expect(amberColors.background).toBe('#FFFEFC');
    expect(amberColors.cardHeaderBg).toBe('#F2F0ED');
    expect(amberColors.inputBg).toBe('#FAF8F5');

    const violetColors = getThemeColors('violet');
    expect(violetColors.today).toBe('#906AF4');
    expect(violetColors.background).toBe('#FDFDFF');

    const pinkColors = getThemeColors('pink');
    expect(pinkColors.today).toBe('#FF87C4');
    expect(pinkColors.primary).toBe('#FF87C4');

    const fallbackColors = getThemeColors(undefined as any);
    expect(fallbackColors.today).toBe('#01B7FF');
    expect(fallbackColors.background).toBe('#FBFEFF');
  });
});
