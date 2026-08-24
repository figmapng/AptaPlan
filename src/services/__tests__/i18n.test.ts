import { getTranslations, formatLocalizedFullDate, formatLocalizedChipDate, formatLocalizedTaskDisplayDate, describeLocalizedCustomRepeat, getLocalizedShortRepeatLabel } from '@/i18n/formatters';
import { translations } from '@/i18n/translations';
import { defaultSettings, getDefaultSystemLanguage } from '@/types/settings';

describe('i18n Localization Engine', () => {
  describe('System Language Detection & Defaults', () => {
    it('returns a supported language (kk, ru, en) from getDefaultSystemLanguage', () => {
      const systemLang = getDefaultSystemLanguage();
      expect(['kk', 'ru', 'en']).toContain(systemLang);
    });

    it('sets defaultSettings.language to detected system language', () => {
      expect(['kk', 'ru', 'en']).toContain(defaultSettings.language);
      expect(defaultSettings.language).toBe(getDefaultSystemLanguage());
    });
  });

  describe('Translation Dictionaries', () => {
    it('provides valid dictionaries for kk, ru, en', () => {
      expect(translations.kk).toBeDefined();
      expect(translations.ru).toBeDefined();
      expect(translations.en).toBeDefined();
    });

    it('returns correct dictionary from getTranslations', () => {
      expect(getTranslations('kk').settings.title).toBe('Баптаулар');
      expect(getTranslations('ru').settings.title).toBe('Настройки');
      expect(getTranslations('en').settings.title).toBe('Settings');
    });

    it('formats completedOf correctly across languages', () => {
      expect(getTranslations('kk').common.completedOf(0, 2)).toBe('0/2 орындалды');
      expect(getTranslations('ru').common.completedOf(0, 2)).toBe('0/2 выполнено');
      expect(getTranslations('en').common.completedOf(0, 2)).toBe('0/2 completed');
    });

    it('defaults to kk when an unknown language is passed', () => {
      expect(getTranslations('unknown' as any).settings.title).toBe('Баптаулар');
    });
  });

  describe('Date Formatters Localization', () => {
    const testDate = new Date(2026, 7, 24); // 24 August 2026

    it('formats full date correctly in kk, ru, en', () => {
      expect(formatLocalizedFullDate(testDate, 'kk')).toBe('24 тамыз');
      expect(formatLocalizedFullDate(testDate, 'ru')).toBe('24 августа');
      expect(formatLocalizedFullDate(testDate, 'en')).toBe('24 August');
    });

    it('formats chip date correctly in kk, ru, en', () => {
      expect(formatLocalizedChipDate('2026-08-24', 'kk')).toBe('24 там');
      expect(formatLocalizedChipDate('2026-08-24', 'ru')).toBe('24 авг');
      expect(formatLocalizedChipDate('2026-08-24', 'en')).toBe('24 Aug');
    });

    it('formats task display date in kk, ru, en', () => {
      expect(formatLocalizedTaskDisplayDate('2026-08-24', 'kk')).toBe('24 тамыз');
      expect(formatLocalizedTaskDisplayDate('2026-08-24', 'ru')).toBe('24 августа');
      expect(formatLocalizedTaskDisplayDate('2026-08-24', 'en')).toBe('24 August');
    });
  });

  describe('Repeat Labels & Custom Repeat Formatting', () => {
    it('formats standard repeat labels across languages', () => {
      expect(getLocalizedShortRepeatLabel('daily', 1, 'kk')).toBe('Күнде');
      expect(getLocalizedShortRepeatLabel('daily', 1, 'ru')).toBe('Каждый день');
      expect(getLocalizedShortRepeatLabel('daily', 1, 'en')).toBe('Daily');

      expect(getLocalizedShortRepeatLabel('weekly', 1, 'kk')).toBe('Апта сайын');
      expect(getLocalizedShortRepeatLabel('weekly', 1, 'ru')).toBe('Каждую неделю');
      expect(getLocalizedShortRepeatLabel('weekly', 1, 'en')).toBe('Weekly');

      expect(getLocalizedShortRepeatLabel('weekdays', 1, 'kk')).toBe('Жұмыс күндері');
      expect(getLocalizedShortRepeatLabel('weekdays', 1, 'ru')).toBe('По будням');
      expect(getLocalizedShortRepeatLabel('weekdays', 1, 'en')).toBe('Weekdays');
    });

    it('formats custom interval repeats across languages', () => {
      expect(getLocalizedShortRepeatLabel('daily', 3, 'kk')).toBe('Әр 3 күнде');
      expect(getLocalizedShortRepeatLabel('daily', 3, 'ru')).toBe('Каждые 3 дня(ей)');
      expect(getLocalizedShortRepeatLabel('daily', 3, 'en')).toBe('Every 3 days');
    });

    it('describes custom repeat configs in Kazakh', () => {
      expect(describeLocalizedCustomRepeat({
        interval: 2,
        unit: 'weekly',
        selectedWeekdays: [1, 3, 5],
      }, 'kk')).toBe('Әр 2 апта сайын: Дс, Ср, Жм');
    });

    it('describes custom repeat configs in Russian', () => {
      expect(describeLocalizedCustomRepeat({
        interval: 2,
        unit: 'weekly',
        selectedWeekdays: [1, 3, 5],
      }, 'ru')).toBe('Каждые 2 недели: Пн, Ср, Пт');
    });

    it('describes custom repeat configs in English', () => {
      expect(describeLocalizedCustomRepeat({
        interval: 2,
        unit: 'weekly',
        selectedWeekdays: [1, 3, 5],
      }, 'en')).toBe('Every 2 weeks on Mo, We, Fr');
    });
  });
});
