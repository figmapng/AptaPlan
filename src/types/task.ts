export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly';
export type TaskRepeat = 'none' | 'hourly' | 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type Priority = 'normal' | 'important';

export type RepeatCustomUnit = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type RepeatMonthlyMode = 'dates' | 'dayOfWeek';

export type RepeatConfig = {
  unit: RepeatCustomUnit;
  interval: number;
  selectedWeekdays?: number[];
  monthlyMode?: RepeatMonthlyMode;
  selectedMonthDate?: number;
  selectedPosIdx?: number;
  selectedDayIdx?: number;
  selectedYearlyMonth?: number;
  yearlyEnableWeekdays?: boolean;
};

export type Task = {
  id: string;
  externalId?: string | null;
  title: string;
  isCompleted: boolean;
  date: string;
  time: string | null;
  repeat?: TaskRepeat | null;
  repeatType: RepeatType | string;
  repeatInterval: number;
  repeatConfig?: RepeatConfig | null;
  note: string | null;
  priority: Priority;
  notificationOffset: number | null;
  notificationId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  occurrenceDate?: string;
};

export type TaskInput = {
  id?: string;
  externalId?: string | null;
  title: string;
  date: string;
  time?: string | null;
  repeat?: TaskRepeat | null;
  repeatInterval?: number;
  repeatConfig?: RepeatConfig | null;
  note?: string | null;
  priority?: Priority;
  repeatType?: RepeatType | string;
  notificationOffset?: number | null;
  isCompleted?: boolean;
};
