export type ThemeMode = 'system' | 'light' | 'dark';

export type PlannerSettings = {
  completedPlacement: 'keep' | 'bottom';
  haptics: boolean;
  sortMode: 'time' | 'manual';
  firstDayOfWeek?: 'mon' | 'sat' | 'sun';
  lastDayVisibility?: 'visible' | 'hidden';
  defaultViewMode?: 'day' | 'week' | 'month' | 'year';
  theme?: ThemeMode;
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
  defaultViewMode: 'week',
  theme: 'system',
  syncAppleReminders: false,
  autoSyncAppleReminders: true,
};

