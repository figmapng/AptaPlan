export type PlannerSettings = {
  completedPlacement: 'keep' | 'bottom';
  haptics: boolean;
  sortMode: 'time' | 'manual';
  firstDayOfWeek?: 'mon' | 'sat' | 'sun';
  lastDayVisibility?: 'visible' | 'hidden';
  defaultViewMode?: 'day' | 'week' | 'month' | 'year';
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
  autoSyncAppleReminders: false,
};
