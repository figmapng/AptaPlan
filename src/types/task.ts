export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly';
export type TaskRepeat = 'none' | 'hourly' | 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type Priority = 'normal' | 'important';

export type Task = {
  id: string;
  title: string;
  isCompleted: boolean;
  completed?: boolean;
  date: string;
  time: string | null;
  repeat?: TaskRepeat | null;
  repeatType: RepeatType | string;
  repeatInterval: number;
  note: string | null;
  priority: Priority;
  notificationOffset: number | null;
  notificationId: string | null;
  sortOrder: number;
  order?: number;
  createdAt: string;
  updatedAt: string;
  occurrenceDate?: string;
};

export type TaskInput = {
  title: string;
  date: string;
  time?: string | null;
  repeat?: TaskRepeat | null;
  repeatInterval?: number;
  note?: string | null;
  priority?: Priority;
  repeatType?: RepeatType | string;
  notificationOffset?: number | null;
};
