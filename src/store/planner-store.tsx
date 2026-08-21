import { createContext, useCallback, useEffect, useMemo, useRef, useState, use } from 'react';
import type { Task, TaskInput } from '@/types/task';
import type { PlannerSettings } from '@/types/settings';
import { defaultSettings } from '@/types/settings';
import { getDatabase, getDatabaseSync } from '@/database/database';
import * as repo from '@/database/task-repository';
import { getSettings, getSettingsSync, setSetting } from '@/database/settings-repository';
import { cancelReminder, scheduleReminder } from '@/services/notification-service';
import { removeSyncedAppleReminders, syncAppleRemindersToAptaPlan, type SyncResult } from '@/services/apple-reminders-service';

type Store = {
  ready: boolean;
  error: string | null;
  tasks: Task[];
  settings: PlannerSettings;
  loadRange: (s: string, e: string) => Promise<Task[]>;
  refresh: () => Promise<void>;
  toggle: (t: Task) => Promise<void>;
  create: (i: TaskInput) => Promise<string>;
  update: (id: string, i: TaskInput) => Promise<void>;
  remove: (id: string, date?: string, mode?: 'single' | 'all') => Promise<void>;
  removeOccurrence: (taskId: string, occurrenceDate: string) => Promise<void>;
  get: (id: string) => Promise<Task | null>;
  setPref: <K extends keyof PlannerSettings>(k: K, v: PlannerSettings[K]) => Promise<void>;
  clearAll: () => Promise<void>;
  syncAppleReminders: () => Promise<SyncResult>;
  enableAppleReminders: () => Promise<SyncResult>;
  disableAppleReminders: () => Promise<void>;
};

const Context = createContext<Store | null>(null);

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<PlannerSettings>(() => {
    try {
      const db = getDatabaseSync();
      return getSettingsSync(db);
    } catch {
      return defaultSettings;
    }
  });

  const rangeRef = useRef<[string, string] | null>(null);
  const tasksRef = useRef<Task[]>([]);
  tasksRef.current = tasks;

  const settingsRef = useRef<PlannerSettings>(settings);
  settingsRef.current = settings;

  const refresh = useCallback(async () => {
    try {
      const db = await getDatabase();
      const loaded = rangeRef.current
        ? await repo.getTasksForRange(db, rangeRef.current[0], rangeRef.current[1], {
            sortMode: settingsRef.current.sortMode,
            completedPlacement: settingsRef.current.completedPlacement,
          })
        : [];
      setTasks(loaded);
      setError(null);
    } catch (e) {
      setError('Байланыс жоқ');
      console.warn(e);
    }
  }, []);

  const loadRange = useCallback(async (s: string, e: string) => {
    try {
      if (rangeRef.current && s >= rangeRef.current[0] && e <= rangeRef.current[1]) {
        return tasksRef.current;
      }
      const db = await getDatabase();
      const result = await repo.getTasksForRange(db, s, e, {
        sortMode: settingsRef.current.sortMode,
        completedPlacement: settingsRef.current.completedPlacement,
      });
      rangeRef.current = [s, e];
      setTasks(result);
      setError(null);
      return result;
    } catch (e) {
      setError('Байланыс жоқ');
      console.warn(e);
      return [];
    }
  }, []);

  const get = useCallback(async (id: string) => {
    const db = await getDatabase();
    return repo.getTask(db, id);
  }, []);

  const toggle = useCallback(async (t: Task) => {
    const db = await getDatabase();
    setTasks((x) => {
      const next = x.map((v) => {
        if (v.id === t.id && v.date === t.date) {
          return { ...v, isCompleted: !v.isCompleted, completed: !v.isCompleted };
        }
        return v;
      });
      tasksRef.current = next;
      return next;
    });
    try {
      await repo.toggleTaskCompletion(db, t);
    } catch (e) {
      await refresh();
      console.warn(e);
    }
  }, [refresh]);

  const create = useCallback(async (i: TaskInput) => {
    const db = await getDatabase();
    const id = await repo.createTask(db, i);
    try {
      const reminderId = await scheduleReminder(i);
      if (reminderId) await repo.setNotificationId(db, id, reminderId);
    } catch (e) {
      console.warn('Reminder schedule failed', e);
    }
    await refresh();
    return id;
  }, [refresh]);

  const update = useCallback(async (id: string, i: TaskInput) => {
    const db = await getDatabase();
    const prev = await repo.getTask(db, id);
    try {
      if (prev?.notificationId) await cancelReminder(prev.notificationId);
      await repo.updateTask(db, id, i);
      const reminderId = await scheduleReminder(i);
      await repo.setNotificationId(db, id, reminderId);
    } catch (e) {
      console.warn('Reminder reschedule failed', e);
      await repo.updateTask(db, id, i);
      await repo.setNotificationId(db, id, null);
    }
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string, date?: string, mode?: 'single' | 'all') => {
    const db = await getDatabase();
    const prev = await repo.getTask(db, id);
    if (date && mode === 'single') {
      if (prev && prev.date === date && prev.notificationId) {
        await cancelReminder(prev.notificationId);
      }
      await repo.deleteTaskOccurrence(db, id, date);
    } else {
      if (prev?.notificationId) await cancelReminder(prev.notificationId);
      await repo.deleteTask(db, id);
    }
    await refresh();
  }, [refresh]);

  const removeOccurrence = useCallback(async (taskId: string, occurrenceDate: string) => {
    const db = await getDatabase();
    const prev = await repo.getTask(db, taskId);
    if (prev && prev.date === occurrenceDate && prev.notificationId) {
      await cancelReminder(prev.notificationId);
    }
    await repo.deleteTaskOccurrence(db, taskId, occurrenceDate);
    await refresh();
  }, [refresh]);

  const setPref = useCallback(async (k: keyof PlannerSettings, v: PlannerSettings[keyof PlannerSettings]) => {
    const db = await getDatabase();
    await setSetting(db, k, v);
    setSettings((prev) => {
      const updated = { ...prev, [k]: v };
      settingsRef.current = updated;
      return updated;
    });
    if (k === 'sortMode' || k === 'completedPlacement') {
      await refresh();
    }
  }, [refresh]);

  const clearAll = useCallback(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ notificationId: string | null }>(
      `SELECT notificationId FROM tasks WHERE notificationId IS NOT NULL`
    );
    for (const r of rows) {
      if (r.notificationId) await cancelReminder(r.notificationId);
    }
    await repo.deleteAllTasks(db);
    await refresh();
  }, [refresh]);

  const syncAppleReminders = useCallback(async (): Promise<SyncResult> => {
    const db = await getDatabase();
    const result = await syncAppleRemindersToAptaPlan(db);
    if (result.success) {
      const nowStr = new Date().toISOString();
      await setSetting(db, 'lastRemindersSyncTime', nowStr);
      setSettings((prev) => {
        const updated = { ...prev, lastRemindersSyncTime: nowStr };
        settingsRef.current = updated;
        return updated;
      });
      await refresh();
    }
    return result;
  }, [refresh]);

  const enableAppleReminders = useCallback(async (): Promise<SyncResult> => {
    const db = await getDatabase();
    const result = await syncAppleRemindersToAptaPlan(db);
    if (result.success) {
      const nowStr = new Date().toISOString();
      await setSetting(db, 'syncAppleReminders', true);
      await setSetting(db, 'autoSyncAppleReminders', true);
      await setSetting(db, 'lastRemindersSyncTime', nowStr);
      setSettings((prev) => {
        const updated = {
          ...prev,
          syncAppleReminders: true,
          autoSyncAppleReminders: true,
          lastRemindersSyncTime: nowStr,
        };
        settingsRef.current = updated;
        return updated;
      });
      await refresh();
    }
    return result;
  }, [refresh]);

  const disableAppleReminders = useCallback(async () => {
    const db = await getDatabase();
    await removeSyncedAppleReminders(db);
    await setSetting(db, 'syncAppleReminders', false);
    setSettings((prev) => {
      const updated = { ...prev, syncAppleReminders: false };
      settingsRef.current = updated;
      return updated;
    });
    await refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      ready,
      error,
      tasks,
      settings,
      loadRange,
      refresh,
      toggle,
      create,
      update,
      remove,
      removeOccurrence,
      get,
      setPref,
      clearAll,
      syncAppleReminders,
      enableAppleReminders,
      disableAppleReminders,
    }),
    [
      ready,
      error,
      tasks,
      settings,
      loadRange,
      refresh,
      toggle,
      create,
      update,
      remove,
      removeOccurrence,
      get,
      setPref,
      clearAll,
      syncAppleReminders,
      enableAppleReminders,
      disableAppleReminders,
    ]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = await getDatabase();
        const dbSettings = await getSettings(db);
        if (!cancelled) {
          setSettings(dbSettings);
          settingsRef.current = dbSettings;
        }
        if (dbSettings.syncAppleReminders && dbSettings.autoSyncAppleReminders !== false) {
          try {
            await syncAppleRemindersToAptaPlan(db);
          } catch (err) {
            console.warn('Auto sync reminders failed:', err);
          }
        }
        await refresh();
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) setError('Байланыс жоқ');
        console.warn(e);
      }
    })();
    return () => { cancelled = true; };
  }, [refresh]);

  return <Context value={value}>{children}</Context>;
}

export function usePlanner() {
  const ctx = use(Context);
  if (!ctx) throw new Error('usePlanner must be used within PlannerProvider');
  return ctx;
}

export function useOptionalPlanner() {
  return use(Context);
}
