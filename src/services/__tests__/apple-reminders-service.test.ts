import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import { syncAppleRemindersToAptaPlan, removeSyncedAppleReminders } from '../apple-reminders-service';
import * as taskRepo from '@/database/task-repository';
import * as notifService from '@/services/notification-service';
import { toDateKey } from '@/utils/dateHelpers';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('expo-calendar', () => ({
  EntityTypes: { REMINDER: 'REMINDER' },
  requestRemindersPermissionsAsync: jest.fn(),
  getRemindersPermissionsAsync: jest.fn(),
  getCalendarsAsync: jest.fn(),
  getRemindersAsync: jest.fn(),
}));

jest.mock('@/database/task-repository', () => ({
  createTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
  deleteSyncedTasks: jest.fn(),
  getTaskByExternalId: jest.fn(),
}));

jest.mock('@/services/notification-service', () => ({
  cancelReminder: jest.fn(),
}));

describe('Apple Reminders Synchronization - All Scenarios', () => {
  const mockDb = {} as any;
  const todayKey = toDateKey(new Date());

  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = 'ios';
    (Calendar.requestRemindersPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue([{ id: 'cal-1', title: 'Reminders' }]);
  });

  test('Situation 1: Incomplete task with explicit dueDate -> imports with exact dueDate and time', async () => {
    (Calendar.getRemindersAsync as jest.Mock).mockResolvedValue([
      {
        id: 'rem-1',
        title: 'Дәрі қабылдау',
        completed: false,
        dueDate: '2026-08-25T14:30:00.000Z',
        notes: 'Тамақтан кейін',
      },
    ]);
    (taskRepo.getTaskByExternalId as jest.Mock).mockResolvedValue(null);

    const result = await syncAppleRemindersToAptaPlan(mockDb);

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(1);
    expect(taskRepo.createTask).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        externalId: 'rem-1',
        title: 'Дәрі қабылдау',
        date: toDateKey(new Date('2026-08-25T14:30:00.000Z')),
        time: expect.any(String),
        isCompleted: false,
        note: 'Тамақтан кейін',
      })
    );
  });

  test('Situation 2: Incomplete task with startDate (no dueDate) -> imports with startDate', async () => {
    (Calendar.getRemindersAsync as jest.Mock).mockResolvedValue([
      {
        id: 'rem-2',
        title: 'Спорт зал',
        completed: false,
        startDate: '2026-08-23T09:00:00.000Z',
      },
    ]);
    (taskRepo.getTaskByExternalId as jest.Mock).mockResolvedValue(null);

    const result = await syncAppleRemindersToAptaPlan(mockDb);

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(1);
    expect(taskRepo.createTask).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        externalId: 'rem-2',
        title: 'Спорт зал',
        date: toDateKey(new Date('2026-08-23T09:00:00.000Z')),
        isCompleted: false,
      })
    );
  });

  test('Situation 3: Incomplete task with NO date -> defaults to today as an active task', async () => {
    (Calendar.getRemindersAsync as jest.Mock).mockResolvedValue([
      {
        id: 'rem-3',
        title: 'Кітап оқу',
        completed: false,
        dueDate: null,
        startDate: null,
      },
    ]);
    (taskRepo.getTaskByExternalId as jest.Mock).mockResolvedValue(null);

    const result = await syncAppleRemindersToAptaPlan(mockDb);

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(1);
    expect(taskRepo.createTask).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        externalId: 'rem-3',
        title: 'Кітап оқу',
        date: todayKey,
        time: null,
        isCompleted: false,
      })
    );
  });

  test('Situation 4: Completed task with explicit dueDate -> imported on dueDate as completed', async () => {
    (Calendar.getRemindersAsync as jest.Mock).mockResolvedValue([
      {
        id: 'rem-4',
        title: 'Есеп тапсыру',
        completed: true,
        dueDate: '2026-08-15T18:00:00.000Z',
      },
    ]);
    (taskRepo.getTaskByExternalId as jest.Mock).mockResolvedValue(null);

    const result = await syncAppleRemindersToAptaPlan(mockDb);

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(1);
    expect(taskRepo.createTask).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        externalId: 'rem-4',
        title: 'Есеп тапсыру',
        date: toDateKey(new Date('2026-08-15T18:00:00.000Z')),
        isCompleted: true,
      })
    );
  });

  test('Situation 5: Completed task with NO dueDate, but with completionDate -> imported on completionDate (NOT today)', async () => {
    (Calendar.getRemindersAsync as jest.Mock).mockResolvedValue([
      {
        id: 'rem-5',
        title: 'Дүкенге бару',
        completed: true,
        dueDate: null,
        completionDate: '2026-08-10T11:20:00.000Z',
      },
    ]);
    (taskRepo.getTaskByExternalId as jest.Mock).mockResolvedValue(null);

    const result = await syncAppleRemindersToAptaPlan(mockDb);

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(1);
    expect(taskRepo.createTask).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        externalId: 'rem-5',
        title: 'Дүкенге бару',
        date: toDateKey(new Date('2026-08-10T11:20:00.000Z')),
        isCompleted: true,
      })
    );
  });

  test('Situation 6: Completed task with NO dates at all -> SKIPPED (not imported to today)', async () => {
    (Calendar.getRemindersAsync as jest.Mock).mockResolvedValue([
      {
        id: 'rem-6',
        title: 'Ескі орындалған тапсырма',
        completed: true,
        dueDate: null,
        completionDate: null,
        startDate: null,
      },
    ]);
    (taskRepo.getTaskByExternalId as jest.Mock).mockResolvedValue(null);

    const result = await syncAppleRemindersToAptaPlan(mockDb);

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(0);
    expect(taskRepo.createTask).not.toHaveBeenCalled();
  });

  test('Situation 7: Previously imported undated task that is now completed without date -> deleted from DB', async () => {
    (Calendar.getRemindersAsync as jest.Mock).mockResolvedValue([
      {
        id: 'rem-7',
        title: 'Бұрын бүгінге түскен тапсырма',
        completed: true,
        dueDate: null,
        completionDate: null,
        startDate: null,
      },
    ]);
    (taskRepo.getTaskByExternalId as jest.Mock).mockResolvedValue({
      id: 'local-task-7',
      externalId: 'rem-7',
      title: 'Бұрын бүгінге түскен тапсырма',
      date: todayKey,
    });

    const result = await syncAppleRemindersToAptaPlan(mockDb);

    expect(result.success).toBe(true);
    expect(taskRepo.deleteTask).toHaveBeenCalledWith(mockDb, 'local-task-7');
    expect(taskRepo.updateTask).not.toHaveBeenCalled();
    expect(taskRepo.createTask).not.toHaveBeenCalled();
  });

  test('Situation 8: Existing task in database gets updated when reminder changes in iOS', async () => {
    (Calendar.getRemindersAsync as jest.Mock).mockResolvedValue([
      {
        id: 'rem-8',
        title: 'Жаңартылған тақырып',
        completed: true,
        dueDate: '2026-08-21T10:00:00.000Z',
        notes: 'Жаңа жазба',
      },
    ]);
    (taskRepo.getTaskByExternalId as jest.Mock).mockResolvedValue({
      id: 'local-task-8',
      externalId: 'rem-8',
      title: 'Ескі тақырып',
      date: '2026-08-20',
      time: null,
      isCompleted: false,
      note: null,
      priority: 'normal',
      repeatType: 'none',
    });

    const result = await syncAppleRemindersToAptaPlan(mockDb);

    expect(result.success).toBe(true);
    expect(result.updatedCount).toBe(1);
    expect(taskRepo.updateTask).toHaveBeenCalledWith(
      mockDb,
      'local-task-8',
      expect.objectContaining({
        title: 'Жаңартылған тақырып',
        isCompleted: true,
        note: 'Жаңа жазба',
      })
    );
  });

  test('Situation 9: Empty/whitespace title reminder -> skipped', async () => {
    (Calendar.getRemindersAsync as jest.Mock).mockResolvedValue([
      { id: 'rem-9', title: '   ', completed: false },
      { id: 'rem-10', title: '', completed: false },
    ]);

    const result = await syncAppleRemindersToAptaPlan(mockDb);

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(0);
    expect(taskRepo.createTask).not.toHaveBeenCalled();
  });

  test('Situation 10: Non-iOS platform -> returns platform error cleanly', async () => {
    (Platform as any).OS = 'android';

    const result = await syncAppleRemindersToAptaPlan(mockDb);

    expect(result.success).toBe(false);
    expect(result.error).toContain('iOS');
  });

  test('Situation 11: Permission denied -> returns permission error cleanly', async () => {
    (Calendar.requestRemindersPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

    const result = await syncAppleRemindersToAptaPlan(mockDb);

    expect(result.success).toBe(false);
    expect(result.error).toContain('рұқсат');
  });

  test('Situation 12: No reminder calendars found -> returns success with 0 items', async () => {
    (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue([]);

    const result = await syncAppleRemindersToAptaPlan(mockDb);

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(0);
    expect(result.totalFound).toBe(0);
  });

  test('Situation 13: removeSyncedAppleReminders cleans up all synced tasks and notifications', async () => {
    (taskRepo.deleteSyncedTasks as jest.Mock).mockResolvedValue([
      { id: 't-1', notificationId: 'notif-1' },
      { id: 't-2', notificationId: null },
    ]);

    const count = await removeSyncedAppleReminders(mockDb);

    expect(count).toBe(2);
    expect(notifService.cancelReminder).toHaveBeenCalledWith('notif-1');
  });
});
