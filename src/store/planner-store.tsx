import { createContext, useCallback, useEffect, useMemo, useRef, useState, use } from 'react';
import type { Task, TaskInput } from '@/types/task';
import type { PlannerSettings } from '@/types/settings';
import { defaultSettings } from '@/types/settings';
import { getDatabase } from '@/database/database';
import * as repo from '@/database/task-repository';
import { getSettings, setSetting } from '@/database/settings-repository';
import { seedDemoData } from '@/database/demo-data';

import { addDays, fromDateKey, toDateKey } from '@/services/date-service';

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
  remove: (id: string) => Promise<void>;
  get: (id: string) => Promise<Task | null>;
  setPref: <K extends keyof PlannerSettings>(k: K, v: PlannerSettings[K]) => Promise<void>;
  clearAll: () => Promise<void>;
  move: (id: string, d: -1 | 1) => Promise<void>;
};

const Context = createContext<Store | null>(null);

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [range, setRange] = useState<[string, string] | null>(null);

  const rangeRef = useRef<[string, string] | null>(null);
  const tasksRef = useRef<Task[]>([]);
  tasksRef.current = tasks;

  const init = useCallback(async () => {
    try {
      const db = await getDatabase();
      await seedDemoData(db);
      setSettings(await getSettings(db));
      
      const today = new Date();
      const s = toDateKey(addDays(today, -60));
      const e = toDateKey(addDays(today, 60));
      rangeRef.current = [s, e];
      setRange([s, e]);
      const loaded = await repo.getTasksForRange(db, s, e);
      tasksRef.current = loaded;
      setTasks(loaded);

      setReady(true);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Деректер базасы ашылмады');
    }
  }, []);

  useEffect(() => {
    void init();
  }, [init]);

  const loadRange = useCallback(async (s: string, e: string) => {
    // If current loaded range already covers [s, e], use in-memory tasks without re-rendering or DB querying!
    if (rangeRef.current && s >= rangeRef.current[0] && e <= rangeRef.current[1]) {
      return tasksRef.current;
    }
    try {
      const db = await getDatabase();
      const startDate = fromDateKey(s);
      const endDate = fromDateKey(e);
      const bufferStart = toDateKey(addDays(startDate, -60));
      const bufferEnd = toDateKey(addDays(endDate, 60));
      rangeRef.current = [bufferStart, bufferEnd];
      setRange([bufferStart, bufferEnd]);
      const loaded = await repo.getTasksForRange(db, bufferStart, bufferEnd);
      tasksRef.current = loaded;
      setTasks(loaded);
      return loaded;
    } catch {
      const db = await getDatabase();
      const loaded = await repo.getTasksForRange(db, s, e);
      tasksRef.current = loaded;
      setTasks(loaded);
      return loaded;
    }
  }, []);

  const refresh = useCallback(async () => {
    if (rangeRef.current) {
      const db = await getDatabase();
      const loaded = await repo.getTasksForRange(db, rangeRef.current[0], rangeRef.current[1]);
      tasksRef.current = loaded;
      setTasks(loaded);
    }
  }, []);

  const value = useMemo<Store>(
    () => ({
      ready,
      error,
      tasks,
      settings,
      loadRange,
      refresh,
      toggle: async (t) => {
        setTasks((x) => x.map((v) => (v.id === t.id && v.date === t.date ? { ...v, isCompleted: !v.isCompleted } : v)));
        try {
          await repo.toggleTaskCompletion(await getDatabase(), t);
        } catch (e) {
          await refresh();
          throw e;
        }
      },
      create: async (i) => {
        const id = await repo.createTask(await getDatabase(), i);
        await refresh();
        return id;
      },
      update: async (id, i) => {
        await repo.updateTask(await getDatabase(), id, i);
        await refresh();
      },
      remove: async (id) => {
        await repo.deleteTask(await getDatabase(), id);
        await refresh();
      },
      get: async (id) => repo.getTask(await getDatabase(), id),
      setPref: async (k, v) => {
        await setSetting(await getDatabase(), k, v);
        setSettings((x) => ({ ...x, [k]: v }));
      },
      clearAll: async () => {
        const db = await getDatabase();
        await db.execAsync('DELETE FROM task_occurrences; DELETE FROM tasks;');
        await refresh();
      },
      move: async (id, d) => {
        await repo.moveTask(await getDatabase(), id, d);
        await refresh();
      },
    }),
    [ready, error, tasks, settings, loadRange, refresh]
  );

  return <Context value={value}>{children}</Context>;
}

export function usePlanner() {
  const c = use(Context);
  if (!c) throw new Error('PlannerProvider missing');
  return c;
}
