import { addDays, addMonths, addYears, eachDayOfInterval, endOfMonth, format, getDay, isSameMonth, isSameYear, parseISO, startOfMonth, startOfWeek } from 'date-fns';

export const months = ['қаңтар','ақпан','наурыз','сәуір','мамыр','маусым','шілде','тамыз','қыркүйек','қазан','қараша','желтоқсан'];
export const shortMonths = ['қаң','ақп','нау','сәу','мам','мау','шіл','там','қыр','қаз','қар','жел'];
export const weekdays = ['ЖЕКСЕНБІ','ДҮЙСЕНБІ','СЕЙСЕНБІ','СӘРСЕНБІ','БЕЙСЕНБІ','ЖҰМА','СЕНБІ'];
export const toDateKey = (date: Date) => format(date, 'yyyy-MM-dd');
export const fromDateKey = (key: string) => parseISO(`${key}T12:00:00`);
export const getStartOfWeek = (date: Date) => startOfWeek(date, { weekStartsOn: 1 });
export const getWeekDates = (date: Date) => Array.from({ length: 7 }, (_, index) => addDays(getStartOfWeek(date), index));
export const formatWeekRange = (start: Date, end = addDays(start, 6)) => {
  const d1 = format(start, 'dd'); const d2 = format(end, 'dd');
  if (isSameMonth(start, end)) return `${d1}–${d2} ${months[end.getMonth()]}`;
  if (isSameYear(start, end)) return `${d1} ${months[start.getMonth()]} – ${d2} ${months[end.getMonth()]}`;
  return `${d1} ${months[start.getMonth()]} ${start.getFullYear()} – ${d2} ${months[end.getMonth()]} ${end.getFullYear()}`;
};
export const formatFullDate = (date: Date) => `${format(date, 'dd')} ${months[date.getMonth()]}, ${weekdays[getDay(date)].toLowerCase()}`;
export const getMonthGrid = (date: Date) => eachDayOfInterval({ start: getStartOfWeek(startOfMonth(date)), end: addDays(getStartOfWeek(endOfMonth(date)), 6) });
export { addDays, addMonths, addYears, isSameMonth };
