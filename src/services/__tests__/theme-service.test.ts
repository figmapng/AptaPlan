import { THEMES, THEME_LIST, getThemeColors } from '@/constants/themes';
import { defaultSettings } from '@/types/settings';

describe('Theme System', () => {
  it('has default ocean theme and system themeMode configured in defaultSettings', () => {
    expect(defaultSettings.theme).toBe('ocean');
    expect(defaultSettings.themeMode).toBe('system');
  });

  it('contains all 9 required themes with valid hex colors', () => {
    const expectedThemes = ['ocean', 'pink', 'violet', 'teal', 'amber', 'emerald', 'coral', 'slate', 'minimal'];
    expect(THEME_LIST.length).toBe(9);
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
    expect(oceanColors.background).toBe('#FFFFFF');

    const emeraldColors = getThemeColors('emerald');
    expect(emeraldColors.today).toBe('#00A15F');
    expect(emeraldColors.primary).toBe('#00A15F');
    expect(emeraldColors.background).toBe('#FFFFFF');
    expect(emeraldColors.tintBg).toBe('#F0FAF4');

    const amberColors = getThemeColors('amber');
    expect(amberColors.today).toBe('#FFAA01');
    expect(amberColors.background).toBe('#FFFFFF');
    expect(amberColors.cardHeaderBg).toBe('#F2F0ED');
    expect(amberColors.inputBg).toBe('#FCFAF7');

    const violetColors = getThemeColors('violet');
    expect(violetColors.today).toBe('#906AF4');
    expect(violetColors.background).toBe('#FFFFFF');

    const pinkColors = getThemeColors('pink');
    expect(pinkColors.today).toBe('#FF87C4');
    expect(pinkColors.primary).toBe('#FF87C4');

    const fallbackColors = getThemeColors(undefined as any);
    expect(fallbackColors.today).toBe('#01B7FF');
    expect(fallbackColors.background).toBe('#FFFFFF');
  });

  it('getThemeColors with isDark=true returns dark palette with theme accent', () => {
    const darkOcean = getThemeColors('ocean', true);
    expect(darkOcean.background).toBe('#10131A');
    expect(darkOcean.card).toBe('#1C222E');
    expect(darkOcean.text).toBe('#F3F5F9');
    expect(darkOcean.today).toBe('#01B7FF');

    const darkEmerald = getThemeColors('emerald', true);
    expect(darkEmerald.background).toBe('#10131A');
    expect(darkEmerald.card).toBe('#1C222E');
    expect(darkEmerald.today).toBe('#00A15F');

    const darkMinimal = getThemeColors('minimal', true);
    expect(darkMinimal.today).toBe('#E4E4E7');
    expect(darkMinimal.activeCardBorder).toBe('#A1A1AA');
    expect(darkMinimal.activeHeaderBg).toBe('#3F485A');
    expect(darkMinimal.activeHeaderText).toBe('#FFFFFF');

    const darkSlate = getThemeColors('slate', true);
    expect(darkSlate.today).toBe('#94A3B8');
    expect(darkSlate.activeCardBorder).toBe('#94A3B8');
  });
});
