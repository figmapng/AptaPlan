export type ThemeMode = 'system' | 'light' | 'dark';

export type ThemeId =
  | 'ocean'
  | 'pink'
  | 'violet'
  | 'teal'
  | 'amber'
  | 'emerald'
  | 'coral'
  | 'slate'
  | 'minimal';

export type Language = 'kk' | 'ru' | 'en';

/**
 * Detects device system language and maps to one of the 3 supported languages ('kk', 'ru', 'en').
 * If device locale is Kazakh ('kk', 'kz'), Russian ('ru', 'be', 'uk' if fallback desired or 'ru'), or English ('en'),
 * it returns that language code. Otherwise defaults to 'kk'.
 */
export function getDefaultSystemLanguage(): Language {
  try {
    let locale = '';

    // 1. Try Intl API (Supported in modern React Native / Hermes / Web)
    if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
      locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    }

    // 2. Try React Native NativeModules fallback if Intl is empty
    if (!locale) {
      try {
        const { NativeModules, Platform } = require('react-native');
        if (Platform.OS === 'ios') {
          locale =
            NativeModules.SettingsManager?.settings?.AppleLocale ||
            NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
            '';
        } else if (Platform.OS === 'android') {
          locale = NativeModules.I18nManager?.localeIdentifier || '';
        }
      } catch {}
    }

    const code = locale.toLowerCase().split(/[-_]/)[0];
    if (code === 'ru') return 'ru';
    if (code === 'en') return 'en';
    if (code === 'kk' || code === 'kz') return 'kk';
  } catch {
    // Fallback to default
  }

  return 'kk';
}

export type MonthPickerViewStyle = 'circular' | 'grid';

export type PlannerSettings = {
  completedPlacement: 'keep' | 'bottom';
  haptics: boolean;
  sortMode: 'time' | 'manual';
  firstDayOfWeek?: 'mon' | 'sat' | 'sun';
  lastDayVisibility?: 'visible' | 'hidden';
  showBookDivider?: boolean;
  defaultViewMode?: 'day' | 'week' | 'month' | 'year';
  theme?: ThemeId;
  themeMode?: ThemeMode;
  language?: Language;
  appIcon?: string;
  monthPickerStyle?: MonthPickerViewStyle;
  syncAppleReminders?: boolean;
  autoSyncAppleReminders?: boolean;
  lastRemindersSyncTime?: string;
};

export const defaultSettings: PlannerSettings = {
  completedPlacement: 'bottom',
  haptics: true,
  sortMode: 'time',
  firstDayOfWeek: 'mon',
  lastDayVisibility: 'visible',
  showBookDivider: false,
  defaultViewMode: 'week',
  theme: 'ocean',
  themeMode: 'system',
  language: getDefaultSystemLanguage(),
  monthPickerStyle: 'circular',
  syncAppleReminders: false,
  autoSyncAppleReminders: true,
};
