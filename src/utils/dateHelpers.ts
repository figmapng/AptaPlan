import { addDays, format, parseISO } from 'date-fns';

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

export function getNextWeekKey(): string {
  return toDateKey(addDays(new Date(), 7));
}

export function getNextSaturdayKey(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (6 - day + 7) % 7 || 7;
  return toDateKey(addDays(d, diff));
}


export const kzWeekdaysShort = ['Жс', 'Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб'];

export function formatChipDate(dateStr: string): string {
  const date = fromDateKey(dateStr);
  const day = date.getDate();
  const monthIdx = date.getMonth();
  const shortMonth = kzMonthsShort[monthIdx];
  const weekdayShort = kzWeekdaysShort[date.getDay()];
  return `${day} ${shortMonth}, ${weekdayShort}`;
}

export function formatFullKzDate(dateStr: string): string {
  const date = fromDateKey(dateStr);
  const day = date.getDate();
  const monthIdx = date.getMonth();
  const fullMonth = kzMonthsFull[monthIdx];
  return `${day} ${fullMonth}`;
}
