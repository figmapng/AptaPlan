import { getNotificationTrigger } from '../notification-service';
import * as Notifications from 'expo-notifications';

const baseTask = {
  title: 'Тест',
  date: '2020-01-06',
  time: '09:00',
  notificationOffset: 0,
};

describe('getNotificationTrigger', () => {
  it('uses a repeating daily trigger for an active daily task', () => {
    expect(getNotificationTrigger({ ...baseTask, repeatType: 'daily' }, new Date(2020, 0, 6, 9, 0))).toEqual({
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
    });
  });

  it('uses the shifted weekday for a weekly reminder', () => {
    expect(getNotificationTrigger({ ...baseTask, repeatType: 'weekly' }, new Date(2020, 0, 6, 9, 0))).toEqual({
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 2,
      hour: 9,
      minute: 0,
    });
  });

  it('preserves a zero-minute offset as a valid date trigger', () => {
    const triggerDate = new Date(Date.now() + 86_400_000);
    const task = { ...baseTask, date: triggerDate.toISOString().slice(0, 10), notificationOffset: 0, repeatType: 'none' };
    expect(getNotificationTrigger(task, triggerDate)).toEqual({
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    });
  });
});
