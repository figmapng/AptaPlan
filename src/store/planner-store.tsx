import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { Task, TaskInput } from '@/types/task';
import type { PlannerSettings } from '@/types/settings';
import { defaultSettings } from '@/types/settings';
import { getDatabase, getDatabaseSync } from '@/database/database';
import * as repo from '@/database/task-repository';
import { getSettings, getSettingsSync, setSetting } from '@/database/settings-repository';
import { cancelAllReminders, cancelReminder } from '@/services/notification-service';
import { refreshTaskReminder, rescheduleAllReminders } from '@/services/reminder-scheduler';
import { removeSyncedAppleReminders, syncAppleRemindersToAptaPlan, type SyncResult } from '@/services/apple-reminders-service';
import { getTranslations } from '@/i18n/formatters';

type Store = {
  ready: boolean;
  /** Set only when the database could not be opened at launch. */
  error: string | null;
  retry: () => void;
  tasks: Task[];
  settings: PlannerSettings;
  loadRange: (s: string, e: string) => Promise<Task[]>;
  refresh: () => Promise<void>;
  /** Re-reads settings and tasks from the database (e.g. after restoring a backup). */
  reload: () => Promise<void>;
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

  const [initAttempt, setInitAttempt] = useState(0);
  const retry = useCallback(() => setInitAttempt((n) => n + 1), []);
  const readyRef = useRef(false);
  readyRef.current = ready;

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
    } catch (e) {
      console.warn('Failed to refresh tasks', e);
    }
  }, []);

  const reload = useCallback(async () => {
    const db = await getDatabase();
    const dbSettings = await getSettings(db);
    settingsRef.current = dbSettings;
    setSettings(dbSettings);
    await refresh();
  }, [refresh]);

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
      return result;
    } catch (err) {
      console.warn('Failed to load tasks', err);
      return [];
    }
  }, []);

  const get = useCallback(async (id: string) => {
    const db = await getDatabase();
    return repo.getTask(db, id);
  }, []);

  const lang = () => settingsRef.current.language;

  const toggle = useCallback(async (t: Task) => {
    const db = await getDatabase();
    setTasks((x) => {
      const next = x.map((v) => (v.id === t.id && v.date === t.date ? { ...v, isCompleted: !v.isCompleted } : v));
      tasksRef.current = next;
      return next;
    });
    try {
      await repo.toggleTaskCompletion(db, t);
    } catch (e) {
      console.warn(e);
      await refresh();
      return;
    }
    // Completing a task (or one occurrence) silences its reminder; un-completing restores it.
    await refreshTaskReminder(db, t.id, { lang: lang(), requestPermission: false });
  }, [refresh]);

  const create = useCallback(async (i: TaskInput) => {
    const db = await getDatabase();
    const id = await repo.createTask(db, i);
    await refreshTaskReminder(db, id, { lang: lang(), requestPermission: true });
    await refresh();
    return id;
  }, [refresh]);

  const update = useCallback(async (id: string, i: TaskInput) => {
    const db = await getDatabase();
    await repo.updateTask(db, id, i);
    await refreshTaskReminder(db, id, { lang: lang(), requestPermission: true });
    await refresh();
  }, [refresh]);

  const removeOccurrence = useCallback(async (taskId: string, occurrenceDate: string) => {
    const db = await getDatabase();
    const prev = await repo.getTask(db, taskId);
    if (prev?.repeatType === 'none' && prev.date === occurrenceDate) {
      // A one-off task has a single occurrence: removing it removes the task.
      await cancelReminder(prev.notificationId);
      await repo.deleteTask(db, taskId);
    } else {
      await repo.deleteTaskOccurrence(db, taskId, occurrenceDate);
      await refreshTaskReminder(db, taskId, { lang: lang(), requestPermission: false });
    }
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string, date?: string, mode?: 'single' | 'all') => {
    if (date && mode === 'single') {
      await removeOccurrence(id, date);
      return;
    }
    const db = await getDatabase();
    const prev = await repo.getTask(db, id);
    await cancelReminder(prev?.notificationId);
    await repo.deleteTask(db, id);
    await refresh();
  }, [refresh, removeOccurrence]);

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
    for (const id of await repo.getAllNotificationIds(db)) await cancelReminder(id);
    await cancelAllReminders();
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
      await rescheduleAllReminders(db, lang());
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
      await rescheduleAllReminders(db, lang());
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
      retry,
      tasks,
      settings,
      loadRange,
      refresh,
      reload,
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
      retry,
      tasks,
      settings,
      loadRange,
      refresh,
      reload,
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
      let db;
      try {
        db = await getDatabase();
        await repo.purgeSoftDeletedTasks(db);
        const dbSettings = await getSettings(db);
        if (cancelled) return;
        setSettings(dbSettings);
        settingsRef.current = dbSettings;
        setError(null);
        await refresh();
        if (!cancelled) setReady(true);
      } catch (e) {
        console.warn(e);
        if (!cancelled) setError(getTranslations(settingsRef.current.language).system.storageError);
        return;
      }

      // Background work that must not delay the first render.
      if (settingsRef.current.syncAppleReminders && settingsRef.current.autoSyncAppleReminders !== false) {
        try {
          const res = await syncAppleRemindersToAptaPlan(db);
          if (res.success) await refresh();
        } catch (err) {
          console.warn('Auto sync reminders failed:', err);
        }
      }
      try {
        await rescheduleAllReminders(db, settingsRef.current.language);
      } catch (err) {
        console.warn('Reminder reschedule failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [refresh, initAttempt]);

  // Returning to the app: roll repeating reminders forward and pick up a new day.
  useEffect(() => {
    let last = AppState.currentState;
    const sub = AppState.addEventListener('change', (next) => {
      if (last.match(/inactive|background/) && next === 'active' && readyRef.current) {
        void (async () => {
          try {
            const db = await getDatabase();
            await rescheduleAllReminders(db, settingsRef.current.language);
            await refresh();
          } catch (e) {
            console.warn('Foreground refresh failed', e);
          }
        })();
      }
      last = next;
    });
    return () => sub.remove();
  }, [refresh]);

  return <Context value={value}>{children}</Context>;
}

export function usePlanner() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('usePlanner must be used within PlannerProvider');
  return ctx;
}

export function useOptionalPlanner() {
  const ctx = useContext(Context);
  return ctx;
}
