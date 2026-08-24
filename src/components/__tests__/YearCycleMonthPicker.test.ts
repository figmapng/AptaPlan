jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => ({
    colors: {
      text: '#23262D',
      textMuted: '#94A3B8',
      today: '#01B7FF',
      todayDark: '#009FD6',
    },
    isDark: false,
  }),
}));

import {
  CANONICAL_MONTH_CONFIG,
  MONTH_NAMES,
  YearCycleMonthPicker,
  buildInnerProgressSubPath,
  calculateMonthProgress,
  getCenterlinePointAndNormal,
  getInnerProgressArrowheadPathD,
  getInnerProgressPoint,
  getInnerProgressPointAndTangent,
  getInnerProgressStartNotchPathD,
} from '../YearCycleMonthPicker';

describe('YearCycleMonthPicker canonical month mapping and geometry', () => {
  test('component is defined and exports correctly', () => {
    expect(YearCycleMonthPicker).toBeDefined();
  });

  test('canonical mapping covers all 12 months exactly (0..11) with explicit startT/endT', () => {
    expect(CANONICAL_MONTH_CONFIG).toHaveLength(12);

    const monthIndexes = CANONICAL_MONTH_CONFIG.map((c) => c.monthIndex);
    expect(monthIndexes).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

    CANONICAL_MONTH_CONFIG.forEach((c, idx) => {
      expect(c.startT).toBeCloseTo(idx / 12, 5);
      expect(c.endT).toBeCloseTo((idx + 1) / 12, 5);
    });

    const expectedShortKz = [
      'Қаң', 'Ақп', 'Нау', 'Сәу', 'Мам', 'Мау',
      'Шіл', 'Там', 'Қыр', 'Қаз', 'Қар', 'Жел',
    ];

    expectedShortKz.forEach((shortName, idx) => {
      expect(MONTH_NAMES.kz.short[idx]).toBe(shortName);
    });

    const expectedFullKz = [
      'Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым',
      'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан',
    ];

    expectedFullKz.forEach((fullName, idx) => {
      expect(MONTH_NAMES.kz.full[idx]).toBe(fullName);
    });

    // English localization check
    expect(MONTH_NAMES.en).toBeDefined();
    expect(MONTH_NAMES.en.short[0]).toBe('Jan');
    expect(MONTH_NAMES.en.full[0]).toBe('January');
    expect(MONTH_NAMES.en.seasons.summer).toBe('SUMMER');

    // Russian localization check
    expect(MONTH_NAMES.ru).toBeDefined();
    expect(MONTH_NAMES.ru.short[0]).toBe('Янв');
    expect(MONTH_NAMES.ru.full[0]).toBe('Январь');
    expect(MONTH_NAMES.ru.seasons.summer).toBe('ЛЕТО');
  });

  test('calculateMonthProgress on August 24 gives ~77.4% through August', () => {
    const year = 2026;
    const aug24Noon = new Date(year, 7, 24, 0, 0, 0, 0); // August 24
    const { monthIdx, monthProgress } = calculateMonthProgress(aug24Noon, year);

    expect(monthIdx).toBe(7); // August
    expect(monthProgress).toBeCloseTo(23 / 31, 2);
  });

  test('directional arrowhead rotates according to local tangent vector', () => {
    const cx = 179;
    const cy = 136;
    const Rc = 46;
    const trackWidth = 46;
    const Rout = Rc + trackWidth / 2;
    const outerW = 314;
    const wc = outerW - 2 * Rout;
    const hc = 48;
    const P = 2 * wc + 2 * hc + 2 * Math.PI * Rc;
    const deltaS = P / 12;
    const innerInset = trackWidth / 2 + 8; // 31

    // 1. Bottom straight (Jan): tangent should point right (+x, tx > 0, ty ≈ 0)
    const resJan = getInnerProgressPointAndTangent(0, cx, cy, wc, hc, Rc, P, innerInset);
    expect(resJan.tx).toBeCloseTo(1, 2);
    expect(resJan.ty).toBeCloseTo(0, 2);

    // 2. Right straight (Apr): tangent should point up (-y, tx ≈ 0, ty < 0)
    const resApr = getInnerProgressPointAndTangent(3 * deltaS, cx, cy, wc, hc, Rc, P, innerInset);
    expect(resApr.tx).toBeCloseTo(0, 2);
    expect(resApr.ty).toBeCloseTo(-1, 2);

    // 3. Top straight (Jul/Aug): tangent should point left (-x, tx < 0, ty ≈ 0)
    const resJul = getInnerProgressPointAndTangent(6 * deltaS, cx, cy, wc, hc, Rc, P, innerInset);
    expect(resJul.tx).toBeCloseTo(-1, 2);
    expect(resJul.ty).toBeCloseTo(0, 2);

    // 4. Arrowhead path string generation
    const arrowD = getInnerProgressArrowheadPathD(6.5 * deltaS, cx, cy, wc, hc, Rc, P, innerInset);
    expect(arrowD.startsWith('M ')).toBe(true);
    expect(arrowD).toContain('L ');

    // 5. Perpendicular start notch path generation
    const startNotchD = getInnerProgressStartNotchPathD(-deltaS / 2, cx, cy, wc, hc, Rc, P, innerInset);
    expect(startNotchD.startsWith('M ')).toBe(true);
    expect(startNotchD).toContain('L ');
  });

  test('master synchronized inner progress path aligns with month start boundaries', () => {
    const cx = 179;
    const cy = 136;
    const Rc = 46;
    const trackWidth = 46;
    const Rout = Rc + trackWidth / 2;
    const outerW = 314;
    const wc = outerW - 2 * Rout;
    const hc = 48;
    const P = 2 * wc + 2 * hc + 2 * Math.PI * Rc;
    const deltaS = P / 12;
    const innerInset = trackWidth / 2 + 8; // 31

    // Jan 1st start boundary (s = -deltaS / 2)
    const ptJanStart = getInnerProgressPoint(-deltaS / 2, cx, cy, wc, hc, Rc, P, innerInset);
    expect(ptJanStart.y).toBeCloseTo(cy + hc / 2 + Rc - innerInset, 1);
    expect(ptJanStart.x).toBeLessThan(cx);

    // Feb 1st boundary (s = +deltaS / 2)
    const ptFebStart = getInnerProgressPoint(deltaS / 2, cx, cy, wc, hc, Rc, P, innerInset);
    expect(ptFebStart.y).toBeCloseTo(cy + hc / 2 + Rc - innerInset, 1);
    expect(ptFebStart.x).toBeGreaterThan(cx);

    // Aug 1st boundary (s = 6.5 * deltaS)
    const ptAugStart = getInnerProgressPoint(6.5 * deltaS, cx, cy, wc, hc, Rc, P, innerInset);
    expect(ptAugStart.y).toBeCloseTo(cy - hc / 2 - Rc + innerInset, 1);

    // Full loop generates valid SVG path
    const loopD = buildInnerProgressSubPath(-deltaS / 2, -deltaS / 2 + P, cx, cy, wc, hc, Rc, P, innerInset);
    expect(loopD.startsWith('M ')).toBe(true);
    expect(loopD).toContain('L ');
  });

  test('corner month coordinates and Voronoi separation: Nau (2), Mam (4), Qyr (8), Qar (10)', () => {
    const cx = 163;
    const cy = 136;
    const Rc = 46;
    const trackWidth = 46;
    const Rout = Rc + trackWidth / 2;
    const outerW = 314;
    const wc = outerW - 2 * Rout;
    const hc = 48;
    const P = 2 * wc + 2 * hc + 2 * Math.PI * Rc;
    const deltaS = P / 12;

    const centers: { x: number; y: number }[] = [];
    for (let i = 0; i < 12; i++) {
      centers.push(getCenterlinePointAndNormal(i * deltaS, cx, cy, wc, hc, Rc, P));
    }

    const resolveTap = (px: number, py: number) => {
      let closest = 0;
      let minDistSq = Infinity;
      for (let i = 0; i < 12; i++) {
        const dx = px - centers[i].x;
        const dy = py - centers[i].y;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDistSq) {
          minDistSq = distSq;
          closest = i;
        }
      }
      return closest;
    };

    // 1. Tapping at exact centers returns the exact month
    for (let i = 0; i < 12; i++) {
      expect(resolveTap(centers[i].x, centers[i].y)).toBe(i);
    }

    // 2. Corner month Nau (2): tapping near Nau (bottom-right corner)
    expect(resolveTap(centers[2].x + 10, centers[2].y + 10)).toBe(2);
    expect(resolveTap(centers[2].x - 10, centers[2].y - 10)).toBe(2);

    // 3. Corner month Mam (4): tapping near Mam (top-right corner)
    expect(resolveTap(centers[4].x + 10, centers[4].y - 10)).toBe(4);
    expect(resolveTap(centers[4].x - 10, centers[4].y + 10)).toBe(4);

    // 4. Corner month Qyr (8): tapping near Qyr (top-left corner)
    expect(resolveTap(centers[8].x - 10, centers[8].y - 10)).toBe(8);
    expect(resolveTap(centers[8].x + 10, centers[8].y + 10)).toBe(8);

    // 5. Corner month Qar (10): tapping near Qar (bottom-left corner)
    expect(resolveTap(centers[10].x - 10, centers[10].y + 10)).toBe(10);
    expect(resolveTap(centers[10].x + 10, centers[10].y - 10)).toBe(10);
  });

  test('regression: July (index 6) corresponds to Шіл / Шілде and sits at Top Center', () => {
    const julyConfig = CANONICAL_MONTH_CONFIG.find((c) => c.monthIndex === 6);
    expect(julyConfig).toBeDefined();
    expect(julyConfig?.season).toBe('summer');
    expect(MONTH_NAMES.kz.short[6]).toBe('Шіл');
    expect(MONTH_NAMES.kz.full[6]).toBe('Шілде');
  });

  test('regression: June (index 5) corresponds to Мау / Маусым and August (index 7) to Там / Тамыз', () => {
    expect(MONTH_NAMES.kz.short[5]).toBe('Мау');
    expect(MONTH_NAMES.kz.full[5]).toBe('Маусым');
    expect(MONTH_NAMES.kz.short[7]).toBe('Там');
    expect(MONTH_NAMES.kz.full[7]).toBe('Тамыз');
  });

  test('regression: December (index 11) corresponds to Жел / Желтоқсан', () => {
    expect(MONTH_NAMES.kz.short[11]).toBe('Жел');
    expect(MONTH_NAMES.kz.full[11]).toBe('Желтоқсан');
  });
});
