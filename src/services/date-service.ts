import { addDays, addMonths, addYears, eachDayOfInterval, endOfMonth, format, getDay, isSameMonth, isSameYear, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import type { Language } from '@/types/settings';
import { formatLocalizedFullDate, formatLocalizedWeekRange } from '@/i18n/formatters';

export const months = ['қаңтар','ақпан','наурыз','сәуір','мамыр','маусым','шілде','тамыз','қыркүйек','қазан','қараша','желтоқсан'];
export const shortMonths = ['қаң','ақп','нау','сәу','мам','мау','шіл','там','қыр','қаз','қар','жел'];
export const weekdays = ['Жексенбі', 'Дүйсенбі', 'Сейсенбі', 'Сәрсенбі', 'Бейсенбі', 'Жұма', 'Сенбі'];
export const weekdaysShort = ['Жс', 'Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб'];
export const toDateKey = (date: Date) => format(date, 'yyyy-MM-dd');
export const fromDateKey = (key: string) => parseISO(`${key}T12:00:00`);
export const getStartOfWeek = (date: Date) => startOfWeek(date, { weekStartsOn: 1 });
export const getStartOfWeekWith = (date: Date, weekStartsOn: 0 | 1 | 6) => startOfWeek(date, { weekStartsOn });
export const getWeekDates = (date: Date) => Array.from({ length: 7 }, (_, index) => addDays(getStartOfWeek(date), index));
export const formatWeekRange = (start: Date, end = addDays(start, 6), lang: Language = 'kk') => {
  return formatLocalizedWeekRange(start, end, lang);
};
export const formatFullDate = (date: Date, lang: Language = 'kk') => {
  return formatLocalizedFullDate(date, lang);
};
export const getMonthGrid = (date: Date, weekStartsOn: 0 | 1 | 6 = 1) =>
  eachDayOfInterval({
    start: getStartOfWeekWith(startOfMonth(date), weekStartsOn),
    end: addDays(getStartOfWeekWith(endOfMonth(date), weekStartsOn), 6),
  });

export const getFirstDominantWeekOfMonth = (date: Date, weekStartsOn: 0 | 1 | 6 = 1) => {
  const targetMonth = date.getMonth();
  const firstDay = new Date(date.getFullYear(), targetMonth, 1);
  const initialWeekStart = getStartOfWeekWith(firstDay, weekStartsOn);

  let countInMonth = 0;
  for (let i = 0; i < 7; i++) {
    if (addDays(initialWeekStart, i).getMonth() === targetMonth) {
      countInMonth++;
    }
  }

  return countInMonth >= 4 ? initialWeekStart : addDays(initialWeekStart, 7);
};

export { addDays, addMonths, addYears, isSameMonth };

