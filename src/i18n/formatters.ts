import { addDays, format, getDay, isSameMonth, isSameYear, parseISO } from 'date-fns';
import { translations } from './translations';
import { getDefaultSystemLanguage, type Language } from '@/types/settings';
import type { Translations } from './types';
import type { RepeatConfig, TaskRepeat } from '@/types/task';

export function getTranslations(lang?: Language): Translations {
  const targetLang = lang || getDefaultSystemLanguage();
  if (targetLang && translations[targetLang]) {
    return translations[targetLang];
  }
  return translations.kk;
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatLocalizedWeekRange(start: Date, end = addDays(start, 6), lang: Language = 'kk'): string {
  const t = getTranslations(lang);
  const d1 = format(start, 'd');
  const d2 = format(end, 'd');

  if (isSameMonth(start, end)) {
    if (lang === 'en') {
      return `${t.date.monthsShort[end.getMonth()]} ${d1} – ${d2}`;
    }
    return `${d1} – ${d2} ${t.date.monthsGenitive[end.getMonth()]}`;
  }

  if (isSameYear(start, end)) {
    if (lang === 'en') {
      return `${t.date.monthsShort[start.getMonth()]} ${d1} – ${t.date.monthsShort[end.getMonth()]} ${d2}`;
    }
    return `${d1} ${t.date.monthsShort[start.getMonth()]}. – ${d2} ${t.date.monthsShort[end.getMonth()]}.`;
  }

  if (lang === 'en') {
    return `${t.date.monthsShort[start.getMonth()]} ${d1}, ${start.getFullYear()} – ${t.date.monthsShort[end.getMonth()]} ${d2}, ${end.getFullYear()}`;
  }
  return `${d1} ${t.date.monthsShort[start.getMonth()]}. ${start.getFullYear()} – ${d2} ${t.date.monthsShort[end.getMonth()]}. ${end.getFullYear()}`;
}

export function formatLocalizedFullDate(date: Date, lang: Language = 'kk'): string {
  const t = getTranslations(lang);
  const day = format(date, 'd');
  const month = t.date.monthsGenitive[date.getMonth()];
  if (lang === 'en') {
    return `${day} ${t.date.monthsFull[date.getMonth()]}`;
  }
  return `${day} ${month}`;
}

export function formatLocalizedChipDate(dateStr: string, lang: Language = 'kk'): string {
  if (!dateStr) return '';
  const t = getTranslations(lang);
  try {
    const d = parseDateKey(dateStr);
    const day = format(d, 'd');
    const month = t.date.monthsShort[d.getMonth()];
    return `${day} ${month}`;
  } catch {
    return dateStr;
  }
}

export function formatLocalizedTaskDisplayDate(dateStr: string, lang: Language = 'kk'): string {
  if (!dateStr) return '';
  const t = getTranslations(lang);
  try {
    const d = parseDateKey(dateStr);
    const day = format(d, 'd');
    const month = t.date.monthsGenitive[d.getMonth()];
    if (lang === 'en') {
      return `${day} ${t.date.monthsFull[d.getMonth()]}`;
    }
    return `${day} ${month}`;
  } catch {
    return dateStr;
  }
}

export function describeLocalizedCustomRepeat(config: RepeatConfig, lang: Language = 'kk'): string {
  const t = getTranslations(lang);
  const { unit, interval, selectedWeekdays, monthlyMode, selectedMonthDate, selectedPosIdx, selectedDayIdx, selectedYearlyMonth, yearlyEnableWeekdays } = config;

  if (unit === 'weekly') {
    const dayNames = (selectedWeekdays || [])
      .map((d) => t.date.weekdaysShort[d])
      .join(', ');
    if (lang === 'en') {
      const intervalText = interval > 1 ? `Every ${interval} weeks` : 'Every week';
      return dayNames ? `${intervalText} on ${dayNames}` : intervalText;
    }
    const intervalText = interval > 1 ? `Әр ${interval} апта сайын` : 'Әр апта сайын';
    if (lang === 'ru') {
      const ruInterval = interval > 1 ? `Каждые ${interval} недели` : 'Каждую неделю';
      return dayNames ? `${ruInterval}: ${dayNames}` : ruInterval;
    }
    return dayNames ? `${intervalText}: ${dayNames}` : intervalText;
  }

  if (unit === 'monthly') {
    if (monthlyMode === 'dayOfWeek' && selectedPosIdx !== undefined && selectedDayIdx !== undefined) {
      const pos = t.date.weekPositions[selectedPosIdx];
      const day = t.date.weekdays[selectedDayIdx];
      if (lang === 'en') {
        const intervalText = interval > 1 ? `Every ${interval} months` : 'Every month';
        return `${intervalText} on the ${pos} ${day}`;
      }
      if (lang === 'ru') {
        const intervalText = interval > 1 ? `Каждые ${interval} месяца` : 'Каждый месяц';
        return `${intervalText} в ${pos} ${day}`;
      }
      const intervalText = interval > 1 ? `Әр ${interval} ай сайын` : 'Әр ай сайын';
      return `${intervalText}: ${pos} ${day}`;
    }
    const d = selectedMonthDate || 1;
    if (lang === 'en') {
      return interval > 1 ? `Every ${interval} months on day ${d}` : `Every month on day ${d}`;
    }
    if (lang === 'ru') {
      return interval > 1 ? `Каждые ${interval} месяца, ${d}-го числа` : `Каждый месяц, ${d}-го числа`;
    }
    return interval > 1 ? `Әр ${interval} ай сайын, ${d}-күні` : `Әр ай сайын, ${d}-күні`;
  }

  if (unit === 'yearly') {
    const mIdx = selectedYearlyMonth !== undefined ? selectedYearlyMonth : 0;
    const mName = t.date.monthsFull[mIdx];
    if (yearlyEnableWeekdays && selectedPosIdx !== undefined && selectedDayIdx !== undefined) {
      const pos = t.date.weekPositions[selectedPosIdx];
      const day = t.date.weekdays[selectedDayIdx];
      if (lang === 'en') {
        return interval > 1 ? `Every ${interval} years in ${mName} on the ${pos} ${day}` : `Every year in ${mName} on the ${pos} ${day}`;
      }
      if (lang === 'ru') {
        return interval > 1 ? `Каждые ${interval} года в ${mName} (${pos} ${day})` : `Каждый год в ${mName} (${pos} ${day})`;
      }
      return interval > 1 ? `Әр ${interval} жыл сайын, ${mName} (${pos} ${day})` : `Жыл сайын, ${mName} (${pos} ${day})`;
    }
    if (lang === 'en') {
      return interval > 1 ? `Every ${interval} years in ${mName}` : `Every year in ${mName}`;
    }
    if (lang === 'ru') {
      return interval > 1 ? `Каждые ${interval} года в ${mName}` : `Каждый год в ${mName}`;
    }
    return interval > 1 ? `Әр ${interval} жыл сайын (${mName})` : `Жыл сайын (${mName})`;
  }

  if (unit === 'hourly') {
    return t.repeat.everyNHours(interval);
  }

  // Daily
  if (interval > 1) {
    return t.repeat.everyNDays(interval);
  }
  return t.repeat.daily;
}

export function getLocalizedShortRepeatLabel(
  repeat: TaskRepeat | null,
  interval = 1,
  lang: Language = 'kk'
): string | null {
  if (!repeat || repeat === 'none') return null;
  const t = getTranslations(lang);

  if (interval > 1) {
    if (repeat === 'daily') return t.repeat.everyNDays(interval);
    if (repeat === 'weekly') return t.repeat.everyNWeeks(interval);
    if (repeat === 'monthly') return t.repeat.everyNMonths(interval);
    if (repeat === 'yearly') return t.repeat.everyNYears(interval);
  }

  return t.repeat[repeat] || t.repeat.custom;
}
