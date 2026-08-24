import { useCallback, useMemo } from 'react';
import { useOptionalPlanner } from '@/store/planner-store';
import { getDefaultSystemLanguage, type Language } from '@/types/settings';
import type { RepeatConfig, TaskRepeat } from '@/types/task';
import {
  getTranslations,
  formatLocalizedWeekRange,
  formatLocalizedFullDate,
  formatLocalizedChipDate,
  formatLocalizedTaskDisplayDate,
  describeLocalizedCustomRepeat,
  getLocalizedShortRepeatLabel,
} from './formatters';

export {
  getTranslations,
  formatLocalizedWeekRange,
  formatLocalizedFullDate,
  formatLocalizedChipDate,
  formatLocalizedTaskDisplayDate,
  describeLocalizedCustomRepeat,
  getLocalizedShortRepeatLabel,
};

export function useI18n() {
  const planner = useOptionalPlanner();
  const settings = planner?.settings;
  const setPref = planner?.setPref;

  const language: Language = settings?.language ?? getDefaultSystemLanguage();

  const t = useMemo(() => getTranslations(language), [language]);

  const setLanguage = useCallback(
    (lang: Language) => {
      return setPref ? setPref('language', lang) : Promise.resolve();
    },
    [setPref]
  );

  const formatWeekRange = useCallback(
    (start: Date, end?: Date) => formatLocalizedWeekRange(start, end, language),
    [language]
  );

  const formatFullDate = useCallback(
    (date: Date) => formatLocalizedFullDate(date, language),
    [language]
  );

  const formatChipDate = useCallback(
    (dateStr: string) => formatLocalizedChipDate(dateStr, language),
    [language]
  );

  const formatTaskDisplayDate = useCallback(
    (dateStr: string) => formatLocalizedTaskDisplayDate(dateStr, language),
    [language]
  );

  const describeCustomRepeat = useCallback(
    (config: RepeatConfig) => describeLocalizedCustomRepeat(config, language),
    [language]
  );

  const getShortRepeatLabel = useCallback(
    (repeat: TaskRepeat | null, interval = 1) => getLocalizedShortRepeatLabel(repeat, interval, language),
    [language]
  );

  return {
    language,
    setLanguage,
    t,
    formatWeekRange,
    formatFullDate,
    formatChipDate,
    formatTaskDisplayDate,
    describeCustomRepeat,
    getShortRepeatLabel,
  };
}
