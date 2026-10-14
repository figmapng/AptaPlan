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

const THEME_IDS: readonly ThemeId[] = ['ocean', 'pink', 'violet', 'teal', 'amber', 'emerald', 'coral', 'slate', 'minimal'];

const oneOf =
  <T extends string>(values: readonly T[]) =>
  (v: unknown): v is T =>
    typeof v === 'string' && (values as readonly string[]).includes(v);
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isIsoString = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));

const SETTING_VALIDATORS: { [K in keyof PlannerSettings]-?: (v: unknown) => boolean } = {
  completedPlacement: oneOf(['keep', 'bottom'] as const),
  haptics: isBool,
  sortMode: oneOf(['time', 'manual'] as const),
  firstDayOfWeek: oneOf(['mon', 'sat', 'sun'] as const),
  lastDayVisibility: oneOf(['visible', 'hidden'] as const),
  showBookDivider: isBool,
  defaultViewMode: oneOf(['day', 'week', 'month', 'year'] as const),
  theme: oneOf(THEME_IDS),
  themeMode: oneOf(['system', 'light', 'dark'] as const),
  language: oneOf(['kk', 'ru', 'en'] as const),
  monthPickerStyle: oneOf(['circular', 'grid'] as const),
  syncAppleReminders: isBool,
  autoSyncAppleReminders: isBool,
  lastRemindersSyncTime: isIsoString,
};

/** Keeps only known setting keys whose values have the expected shape. */
export function sanitizeSettings(raw: Record<string, unknown>): Partial<PlannerSettings> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(SETTING_VALIDATORS) as (keyof PlannerSettings)[]) {
    if (key in raw && SETTING_VALIDATORS[key](raw[key])) out[key] = raw[key];
  }
  return out as Partial<PlannerSettings>;
}
