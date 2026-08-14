import { addDays, addMonths, addYears, eachDayOfInterval, endOfMonth, format, getDay, isSameMonth, isSameYear, parseISO, startOfMonth, startOfWeek } from 'date-fns';

export const months = ['қаңтар','ақпан','наурыз','сәуір','мамыр','маусым','шілде','тамыз','қыркүйек','қазан','қараша','желтоқсан'];
export const shortMonths = ['қаң','ақп','нау','сәу','мам','мау','шіл','там','қыр','қаз','қар','жел'];
export const weekdays = ['Жексенбі', 'Дүйсенбі', 'Сейсенбі', 'Сәрсенбі', 'Бейсенбі', 'Жұма', 'Сенбі'];
export const weekdaysShort = ['Жс', 'Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб'];
export const toDateKey = (date: Date) => format(date, 'yyyy-MM-dd');
export const fromDateKey = (key: string) => parseISO(`${key}T12:00:00`);
export const getStartOfWeek = (date: Date) => startOfWeek(date, { weekStartsOn: 1 });
export const getStartOfWeekWith = (date: Date, weekStartsOn: 0 | 1 | 6) => startOfWeek(date, { weekStartsOn });
export const getWeekDates = (date: Date) => Array.from({ length: 7 }, (_, index) => addDays(getStartOfWeek(date), index));
export const formatWeekRange = (start: Date, end = addDays(start, 6)) => {
  const d1 = format(start, 'd');
  const d2 = format(end, 'd');
  if (isSameMonth(start, end)) return `${d1} – ${d2} ${months[end.getMonth()]}`;
  if (isSameYear(start, end)) return `${d1} ${shortMonths[start.getMonth()]}. – ${d2} ${shortMonths[end.getMonth()]}.`;
  return `${d1} ${shortMonths[start.getMonth()]}. ${start.getFullYear()} – ${d2} ${shortMonths[end.getMonth()]}. ${end.getFullYear()}`;
};
export const formatFullDate = (date: Date) => `${format(date, 'dd')} ${months[date.getMonth()]}, ${weekdays[getDay(date)].toLowerCase()}`;
export const getMonthGrid = (date: Date, weekStartsOn: 0 | 1 | 6 = 1) =>
  eachDayOfInterval({
    start: getStartOfWeekWith(startOfMonth(date), weekStartsOn),
    end: addDays(getStartOfWeekWith(endOfMonth(date), weekStartsOn), 6),
  });
export { addDays, addMonths, addYears, isSameMonth };
