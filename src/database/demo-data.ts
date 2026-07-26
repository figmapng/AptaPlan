import type { SQLiteDatabase } from 'expo-sqlite';
import { getWeekDates, toDateKey } from '@/services/date-service';
import { createTask } from './task-repository';

type DemoItem = string | { title: string; isCompleted?: boolean };

const demo: DemoItem[][] = [
  [
    'Тапсырманы аяқтау ме...',
    'Жобаның негізгі мақсатын анықтау',
    'Команда мүшелері арасында міндеттерді бөлу',
    'Жұмыстың прогресін бақылау',
  ],
  [
    { title: 'Құжаттарды дайындау', isCompleted: true },
    { title: 'Жаңа дизайн жасау', isCompleted: false },
    { title: 'Командамен келісу', isCompleted: false },
  ],
  [
    'Бағдарламаны тестілеу',
    'Құжаттаманы жаңарту',
    'Қателерді түзету',
  ],
  [
    'Жобаны жоспарлау',
    'Мәліметтерді талдау',
    'Мәліметтерді талдау',
    'Техникалық тапсырманы жазу',
  ],
  [
    'Клиентпен кездесу',
    'Кодты жазу',
    'Кодты жазу',
  ],
  ['Нарықты зерттеу'],
  ['Пайдаланушыларды оқыту', 'Құралдарды жаңарту'],
];

export async function seedDemoData(db: SQLiteDatabase) {
  const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) n FROM tasks');
  const seeded = await db.getFirstAsync('SELECT value FROM settings WHERE key=?', 'demoSeeded');
  if ((count?.n ?? 0) > 0 || seeded) return;

  const dates = getWeekDates(new Date());
  for (let i = 0; i < 7; i++) {
    for (const item of demo[i]) {
      const title = typeof item === 'string' ? item : item.title;
      const isCompleted = typeof item === 'string' ? false : !!item.isCompleted;
      const id = await createTask(db, {
        title,
        date: toDateKey(dates[i]),
        time: null,
        note: null,
        priority: 'normal',
        repeatType: 'none',
        notificationOffset: null,
      });
      if (isCompleted) {
        await db.runAsync('UPDATE tasks SET isCompleted=1 WHERE id=?', id);
      }
    }
  }
  await db.runAsync("INSERT INTO settings(key,value) VALUES('demoSeeded','true')");
}

