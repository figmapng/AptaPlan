import { computeReminderTrigger } from '../notification-service';
import * as Notifications from 'expo-notifications';

const { DAILY, WEEKLY, MONTHLY, DATE } = Notifications.SchedulableTriggerInputTypes;

const base = {
  title: 'Тест',
  date: '2020-01-06', // Monday
  time: '09:00',
  notificationOffset: 0,
  repeatType: 'none',
};

// Wednesday 2020-01-08, 08:00 local time
const now = new Date(2020, 0, 8, 8, 0);

describe('computeReminderTrigger', () => {
  it('returns null without a time or offset', () => {
    expect(computeReminderTrigger({ ...base, time: null }, new Set(), now)).toBeNull();
    expect(computeReminderTrigger({ ...base, date: '2020-01-09', notificationOffset: null }, new Set(), now)).toBeNull();
  });

  it('schedules a one-off task in the future, honouring the offset', () => {
    expect(computeReminderTrigger({ ...base, date: '2020-01-09', notificationOffset: 15 }, new Set(), now)).toEqual({
      type: DATE,
      date: new Date(2020, 0, 9, 8, 45),
    });
  });

  it('skips past or completed one-off tasks', () => {
    expect(computeReminderTrigger({ ...base, date: '2020-01-07' }, new Set(), now)).toBeNull();
    expect(computeReminderTrigger({ ...base, date: '2020-01-09', isCompleted: true }, new Set(), now)).toBeNull();
  });

  it('uses a native daily trigger for an active daily task', () => {
    expect(computeReminderTrigger({ ...base, repeatType: 'daily' }, new Set(), now)).toEqual({
      type: DAILY,
      hour: 9,
      minute: 0,
    });
  });

  it('uses the weekday of the start date for a weekly reminder', () => {
    expect(computeReminderTrigger({ ...base, repeatType: 'weekly' }, new Set(), now)).toEqual({
      type: WEEKLY,
      weekday: 2, // Monday (1 = Sunday)
      hour: 9,
      minute: 0,
    });
  });

  it('uses a native monthly trigger', () => {
    expect(computeReminderTrigger({ ...base, repeatType: 'monthly' }, new Set(), now)).toEqual({
      type: MONTHLY,
      day: 6,
      hour: 9,
      minute: 0,
    });
  });

  it('schedules the first occurrence once when the start date is in the future', () => {
    expect(computeReminderTrigger({ ...base, date: '2020-01-10', repeatType: 'daily' }, new Set(), now)).toEqual({
      type: DATE,
      date: new Date(2020, 0, 10, 9, 0),
    });
  });

  it('skips a completed occurrence and schedules the next one once', () => {
    expect(computeReminderTrigger({ ...base, repeatType: 'daily' }, new Set(['2020-01-08']), now)).toEqual({
      type: DATE,
      date: new Date(2020, 0, 9, 9, 0),
    });
  });

  it('schedules the next weekday for a weekdays task instead of a single fixed date', () => {
    // Friday 2020-01-10 at 10:00 → next is Monday 2020-01-13
    const friday = new Date(2020, 0, 10, 10, 0);
    expect(computeReminderTrigger({ ...base, repeatType: 'weekdays' }, new Set(), friday)).toEqual({
      type: DATE,
      date: new Date(2020, 0, 13, 9, 0),
    });
  });

  it('uses the local date, not UTC, to decide whether a repeat has started', () => {
    // 00:30 local on the start day: in UTC+5 this is still the previous UTC day.
    const justAfterMidnight = new Date(2020, 0, 6, 0, 30);
    expect(computeReminderTrigger({ ...base, repeatType: 'daily' }, new Set(), justAfterMidnight)).toEqual({
      type: DAILY,
      hour: 9,
      minute: 0,
    });
  });

  it('handles custom repeats with a one-shot trigger', () => {
    const task = { ...base, repeatType: 'custom', repeatConfig: { unit: 'daily' as const, interval: 3 }, repeatInterval: 3 };
    expect(computeReminderTrigger(task, new Set(), now)).toEqual({
      type: DATE,
      date: new Date(2020, 0, 9, 9, 0),
    });
  });
});
