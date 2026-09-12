import { THEMES, THEME_LIST, getThemeColors } from '@/constants/themes';
import { defaultSettings } from '@/types/settings';

describe('Theme System', () => {
  it('has default ocean theme and system themeMode configured in defaultSettings', () => {
    expect(defaultSettings.theme).toBe('ocean');
    expect(defaultSettings.themeMode).toBe('system');
  });

  it('contains all 8 required themes with valid hex colors', () => {
    const expectedThemes = ['slate', 'ocean', 'emerald', 'amber', 'pink', 'coral', 'violet', 'minimal'];
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
    expect(oceanColors.today).toBe('#0195FF');
    expect(oceanColors.primary).toBe('#0195FF');
    expect(oceanColors.background).toBe('#EFF0F2');

    const emeraldColors = getThemeColors('emerald');
    expect(emeraldColors.today).toBe('#53B55A');
    expect(emeraldColors.primary).toBe('#53B55A');
    expect(emeraldColors.background).toBe('#EFF0F2');
    expect(emeraldColors.tintBg).toBe('#EDF7EE');

    const amberColors = getThemeColors('amber');
    expect(amberColors.today).toBe('#F6C543');
    expect(amberColors.background).toBe('#EFF0F2');
    expect(amberColors.text).toBe('#31383E');

    const violetColors = getThemeColors('violet');
    expect(violetColors.today).toBe('#8A52EE');
    expect(violetColors.background).toBe('#EFF0F2');

    const pinkColors = getThemeColors('pink');
    expect(pinkColors.today).toBe('#F077AF');
    expect(pinkColors.primary).toBe('#F077AF');

    const fallbackColors = getThemeColors(undefined as any);
    expect(fallbackColors.today).toBe('#0195FF');
    expect(fallbackColors.background).toBe('#EFF0F2');
  });

  it('getThemeColors with isDark=true returns dark palette with theme accent', () => {
    const darkOcean = getThemeColors('ocean', true);
    expect(darkOcean.background).toBe('#10131A');
    expect(darkOcean.card).toBe('#1C222E');
    expect(darkOcean.text).toBe('#F3F5F9');
    expect(darkOcean.today).toBe('#0195FF');

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
