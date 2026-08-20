export type ThemeId =
  | 'ocean'
  | 'emerald'
  | 'violet'
  | 'coral'
  | 'indigo'
  | 'amber'
  | 'slate';

export type PlannerSettings = {
  completedPlacement: 'keep' | 'bottom';
  haptics: boolean;
  sortMode: 'time' | 'manual';
  firstDayOfWeek?: 'mon' | 'sat' | 'sun';
  lastDayVisibility?: 'visible' | 'hidden';
  defaultViewMode?: 'day' | 'week' | 'month' | 'year';
  theme?: ThemeId;
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
  theme: 'ocean',
  syncAppleReminders: false,
  autoSyncAppleReminders: true,
};
