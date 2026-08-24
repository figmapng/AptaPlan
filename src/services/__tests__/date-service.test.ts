import { formatWeekRange, getFirstDominantWeekOfMonth, getStartOfWeek, getWeekDates } from '../date-service';
import { addDays } from 'date-fns';

describe('date service', () => {
  test('апта дүйсенбіден басталады', () => expect(getStartOfWeek(new Date(2026, 6, 2)).getDay()).toBe(1));
  test('бір ай ішіндегі header', () => {
    const d = new Date(2026, 6, 1);
    expect(formatWeekRange(d, new Date(2026, 6, 7))).toBe('1 – 7 шілде');
  });
  test('екі айға өтетін header', () => expect(formatWeekRange(new Date(2026, 6, 29), new Date(2026, 7, 4))).toBe('29 шіл. – 4 там.'));
  test('екі жылға өтетін header', () => expect(formatWeekRange(new Date(2026, 11, 29), new Date(2027, 0, 4))).toBe('29 жел. 2026 – 4 қаң. 2027'));
  test('аптада 7 күн бар', () => expect(getWeekDates(new Date(2026, 6, 2))).toHaveLength(7));

  test('getFirstDominantWeekOfMonth chooses a week where the selected month is dominant (>= 4 days)', () => {
    // Test all 12 months in 2026
    for (let m = 0; m < 12; m++) {
      const selected = new Date(2026, m, 1);
      const weekStart = getFirstDominantWeekOfMonth(selected, 1);

      // Count how many days in this week belong to month m
      let count = 0;
      for (let i = 0; i < 7; i++) {
        if (addDays(weekStart, i).getMonth() === m) {
          count++;
        }
      }
      expect(count).toBeGreaterThanOrEqual(4);
    }
  });
});
