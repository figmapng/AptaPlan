import { addDays, format, parseISO } from 'date-fns';
import type { Language } from '@/types/settings';
import { formatLocalizedChipDate, formatLocalizedFullDate, formatLocalizedTaskDisplayDate } from '@/i18n/formatters';

export const kzMonthsShort = [
  'қаң', 'ақп', 'нау', 'сәу', 'мам', 'мау',
  'шіл', 'там', 'қыр', 'қаз', 'қар', 'жел'
];

export const kzMonthsFull = [
  'қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым',
  'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'
];

export function toDateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function fromDateKey(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getTodayKey(): string {
  return toDateKey(new Date());
}

export function getTomorrowKey(): string {
  return toDateKey(addDays(new Date(), 1));
}

export function getThisWeekendKey(): string {
  const d = new Date();
  const day = d.getDay(); // 0: Sun, 6: Sat
  if (day === 6) return toDateKey(d);
  if (day === 0) return toDateKey(d);
  const diff = 6 - day;
  return toDateKey(addDays(d, diff));
}

export function getNextWeekMondayKey(): string {
  const d = new Date();
  const day = d.getDay(); // 0: Sun, 1: Mon...
  const daysUntilNextMon = day === 0 ? 1 : (8 - day);
  return toDateKey(addDays(d, daysUntilNextMon));
}

export const kzWeekdaysShort = ['Жс', 'Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб'];

export function formatChipDate(dateStr: string, lang: Language = 'kk'): string {
  return formatLocalizedChipDate(dateStr, lang);
}

export function formatFullKzDate(dateStr: string, lang: Language = 'kk'): string {
  return formatLocalizedFullDate(fromDateKey(dateStr), lang);
}

export function formatTaskDisplayDate(dateStr: string, lang: Language = 'kk'): string {
  return formatLocalizedTaskDisplayDate(dateStr, lang);
}

