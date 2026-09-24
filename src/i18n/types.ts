import type { Language, ThemeId } from '@/types/settings';
import type { TaskRepeat } from '@/types/task';
import type { ViewMode } from '@/components/ViewModeModal';

export type UserGuideSlide = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
};

export interface Translations {
  // Navigation & Common
  common: {
    back: string;
    cancel: string;
    confirm: string;
    save: string;
    saving: string;
    delete: string;
    edit: string;
    close: string;
    done: string;
    continue: string;
    error: string;
    warning: string;
    success: string;
    comingSoon: string;
    today: string;
    tomorrow: string;
    yesterday: string;
    undo: string;
    taskDeleted: string;
    connectionError: string;
    notSet: string;
    noTasks: string;
    addTask: string;
    tasksCount: string;
    completedOf: (done: number, total: number) => string;
    moreTasks: (count: number) => string;
  };

  // View modes
  viewModes: {
    day: string;
    week: string;
    month: string;
    year: string;
    title: string;
  };

  // Date & Calendar
  date: {
    date: string;
    monthsFull: string[]; // Nominative (e.g. Қаңтар / Январь / January)
    monthsGenitive: string[]; // Genitive for dates (e.g. қаңтар / января / January)
    monthsShort: string[]; // Short (e.g. қаң / янв / Jan)
    weekdays: string[]; // Full (e.g. Жексенбі / Воскресенье / Sunday)
    weekdaysShort: string[]; // Short 2-char (e.g. Жс / Вс / Su)
    weekdaysMedium: string[]; // 3-char / medium if needed
    weekPositions: string[]; // [first, second, third, fourth, last]
    posShort: string[]; // [1-st, 2-nd, 3-rd, 4-th, last]
    selectMonth: string;
    selectTime: string;
    selectDate: string;
    yearSuffix: string;
    weekend: string;
    today: string;
    tomorrow: string;
    thisWeekend: string;
    nextWeek: string;
  };

  // Calendar Modal
  calendar: {
    pickDate: string;
    today: string;
    tomorrow: string;
    thisWeekend: string;
    nextWeek: string;
    removeDate: string;
    todayShort: string;
  };

  // Time modal & formatters
  time: {
    time: string;
    pickTime: string;
    hours: string;
    minutes: string;
    setTime: string;
    removeTime: string;
  };

  // Repeat
  repeat: {
    title: string;
    none: string;
    hourly: string;
    daily: string;
    weekdays: string;
    weekends: string;
    weekly: string;
    monthly: string;
    yearly: string;
    custom: string;
    customTitle: string;
    customWithLabel: (label: string) => string;
    customSummary: string;
    selectDates: string;
    selectDayOfWeek: string;
    frequency: string;
    every: string;
    everyNDays: (n: number) => string;
    everyNWeeks: (n: number) => string;
    everyNMonths: (n: number) => string;
    everyNYears: (n: number) => string;
    everyNHours: (n: number) => string;
    onDayOfWeek: string;
    onDayOfMonth: string;
    endRepeat: string;
    never: string;
    untilDate: string;
    afterOccurrences: string;
    selectWeekdays: string;
    dayOfMonthLabel: (d: number) => string;
    dayOfWeekLabel: (pos: string, day: string) => string;
    yearlyMonthDayLabel: (m: string) => string;
    yearlyWeekDayLabel: (pos: string, day: string, m: string) => string;
  };

  // Motivational Header
  motivation: {
    greetingMorning: string;
    greetingDay: string;
    greetingEvening: string;
    todaySummary: string;
    tasksCount: (n: number) => string;
    andCompleted: (n: number) => string;
    yearCountdownPrefix: string;
    yearCountdown: (days: number, months: number) => string;
    quotes: string[];
  };

  // User Guide
  userGuide: {
    title: string;
    skip: string;
    next: string;
    understood: string;
    finish: string;
    slides: UserGuideSlide[];
  };

  // Settings screen
  settings: {
    title: string;
    language: string;
    languageModalTitle: string;
    languages: Record<Language, string>;
    appearance: string;
    appearanceSubtitle: string;
    accentColor: string;
    accentColorSubtitle: string;
    themeMode: string;
    themeModeSubtitle: string;
    modeLight: string;
    modeDark: string;
    modeSystem: string;
    appIcon: string;
    appIconSubtitle: string;
    themeNames: Record<ThemeId, string>;
    iconNames: Record<string, string>;
    appearanceAndLanguage: string;
    calendarAndView: string;
    defaultViewMode: string;
    monthPickerStyle: string;
    monthPickerStyleSubtitle: string;
    monthPickerStyles: {
      circular: string;
      grid: string;
    };
    monthPickerStylesSub: {
      circular: string;
      grid: string;
    };
    firstDayOfWeek: string;
    monday: string;
    saturday: string;
    sunday: string;
    lastDayVisibility: string;
    lastDayVisible: string;
    lastDayHidden: string;
    bookDivider: string;
    lastDayPreviewTitleVisible: string;
    lastDayPreviewSubVisible: string;
    lastDayPreviewTitleHidden: string;
    lastDayPreviewSubHidden: string;
    tasksSection: string;
    completedPlacement: string;
    completedPlacementKeep: string;
    completedPlacementBottom: string;
    sortMode: string;
    sortModeTime: string;
    sortModeManual: string;
    integrationsSection: string;
    integrations: string;
    syncAppleRemindersLabel: string;
    syncCalendarLabel: string;
    statusEnabled: string;
    statusDisabled: string;
    haptics: string;
    backupSection: string;
    exportBackup: string;
    importBackup: string;
    clearAllData: string;
    integrationsAndData: string;
    aboutAndSupport: string;
    userGuide: string;
    appVersion: string;
    clearAllConfirmTitle: string;
    clearAllConfirmDesc: string;
    clearAllFinalTitle: string;
    clearAllFinalDesc: string;
    clearAllButton: string;
  };

  // Integrations screen
  integrations: {
    title: string;
    appleServices: string;
    appleServicesSub: string;
    appleReminders: string;
    appleRemindersSub: string;
    autoSync: string;
    autoSyncSub: string;
    syncNow: string;
    lastSync: (time: string) => string;
    syncing: string;
    appleCalendar: string;
    appleCalendarSub: string;
    androidServices: string;
    androidServicesSub: string;
    googleCalendar: string;
    googleCalendarSub: string;
    googleTasks: string;
    googleTasksSub: string;
    privacyTitle: string;
    privacyDesc: string;
    alerts: {
      iosOnlyWarning: string;
      syncEnabledTitle: string;
      syncEnabledMessage: (imported: number, updated: number) => string;
      permissionRequiredTitle: string;
      disableTitle: string;
      disableMessage: string;
      syncSuccessTitle: string;
      syncSuccessMessage: (imported: number, updated: number, total: number) => string;
      noNewTasks: string;
      updatedCount: (count: number) => string;
      syncErrorTitle: string;
    };
  };

  // Task fields, titles, actions
  task: {
    taskParameters: string;
    taskPlaceholder: string;
    whatNeedsToBeDone: string;
    note: string;
    notePlaceholder: string;
    timeOptional: string;
    important: string;
    copy: string;
    duplicate: string;
    share: string;
    taskActions: string;
  };

  // Alerts & Dialogs
  alerts: {
    deleteTaskTitle: string;
    deleteTaskMessage: string;
    recurringTask: string;
    recurringDeleteQuestion: string;
    chooseDeleteMethod: string;
    deleteThisOnly: string;
    deleteAll: string;
    discardChangesTitle: string;
    discardChangesMessage: string;
    continue: string;
    saveErrorTitle: string;
    saveErrorMessage: string;
    exportErrorTitle: string;
    exportErrorMessage: string;
    importErrorTitle: string;
    importErrorMessage: string;
    importModuleNotReady: string;
    importInvalidJson: string;
    importInvalidStructure: string;
    restoreBackupTitle: string;
    restoreBackupMessage: (count: number) => string;
    importSuccessTitle: string;
    importSuccessMessage: string;
    taskDeleted: string;
  };

  // Accessibility labels
  accessibility: {
    markIncomplete: string;
    markComplete: string;
  };
}
