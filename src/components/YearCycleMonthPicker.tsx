import React, { useMemo } from 'react';
import {
  Dimensions,
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/use-theme';

export interface YearCycleMonthPickerProps {
  year: number;
  selectedMonth: number; // 0 = Jan (Қаң) .. 11 = Dec (Жел)
  currentDate?: Date;
  locale?: 'kz' | 'ru';
  debugProgress?: number; // Optional normalized year progress 0..1 for testing
  onSelectMonth: (monthIndex: number) => void;
  onChangeYear?: (newYear: number) => void;
}

export const MONTH_NAMES = {
  kz: {
    short: ['Қаң', 'Ақп', 'Нау', 'Сәу', 'Мам', 'Мау', 'Шіл', 'Там', 'Қыр', 'Қаз', 'Қар', 'Жел'],
    full: [
      'Қаңтар',
      'Ақпан',
      'Наурыз',
      'Сәуір',
      'Мамыр',
      'Маусым',
      'Шілде',
      'Тамыз',
      'Қыркүйек',
      'Қазан',
      'Қараша',
      'Желтоқсан',
    ],
    seasons: {
      summer: 'ЖАЗ',
      autumn: 'КҮЗ',
      winter: 'ҚЫС',
      spring: 'КӨКТЕМ',
    },
  },
  ru: {
    short: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
    full: [
      'Январь',
      'Февраль',
      'Март',
      'Апрель',
      'Май',
      'Июнь',
      'Июль',
      'Август',
      'Сентябрь',
      'Октябрь',
      'Ноябрь',
      'Декабрь',
    ],
    seasons: {
      summer: 'ЛЕТО',
      autumn: 'ОСЕНЬ',
      winter: 'ЗИМА',
      spring: 'ВЕСНА',
    },
  },
};

export type SeasonKey = 'winter' | 'spring' | 'summer' | 'autumn';

export interface MonthConfigItem {
  monthIndex: number; // Canonical JavaScript month 0..11
  sPos: number; // 0..11 position on racetrack
  season: SeasonKey;
  startT: number; // 0..1 normalized yearly perimeter start
  endT: number; // 0..1 normalized yearly perimeter end
}

/**
 * Explicit Canonical Month Configuration (Single Source of Truth)
 *
 * Each month segment anchors exactly between [k/12, (k+1)/12]:
 * - Jan (0): [0, 1/12] (starts exactly at Жел/Қаң divider)
 * - Feb (1): [1/12, 2/12] (starts at Қаң/Ақп divider)
 * - Mar (2): [2/12, 3/12] (starts at Ақп/Нау divider)
 * - Apr (3): [3/12, 4/12] (starts at Нау/Сәу divider)
 * - May (4): [4/12, 5/12] (starts at Сәу/Мам divider)
 * - Jun (5): [5/12, 6/12] (starts at Мам/Мау divider)
 * - Jul (6): [6/12, 7/12] (starts at Мау/Шіл divider at top center)
 * - Aug (7): [7/12, 8/12] (starts at Шіл/Там divider)
 * - Sep (8): [8/12, 9/12] (starts at Там/Қыр divider)
 * - Oct (9): [9/12, 10/12] (starts at Қыр/Қаз divider)
 * - Nov (10): [10/12, 11/12] (starts at Қаз/Қар divider)
 * - Dec (11): [11/12, 1.0] (starts at Қар/Жел divider, returns to Жел/Қаң)
 */
export const CANONICAL_MONTH_CONFIG: MonthConfigItem[] = [
  { monthIndex: 0, sPos: 0, season: 'winter', startT: 0 / 12, endT: 1 / 12 },
  { monthIndex: 1, sPos: 1, season: 'winter', startT: 1 / 12, endT: 2 / 12 },
  { monthIndex: 2, sPos: 2, season: 'spring', startT: 2 / 12, endT: 3 / 12 },
  { monthIndex: 3, sPos: 3, season: 'spring', startT: 3 / 12, endT: 4 / 12 },
  { monthIndex: 4, sPos: 4, season: 'spring', startT: 4 / 12, endT: 5 / 12 },
  { monthIndex: 5, sPos: 5, season: 'summer', startT: 5 / 12, endT: 6 / 12 },
  { monthIndex: 6, sPos: 6, season: 'summer', startT: 6 / 12, endT: 7 / 12 },
  { monthIndex: 7, sPos: 7, season: 'summer', startT: 7 / 12, endT: 8 / 12 },
  { monthIndex: 8, sPos: 8, season: 'autumn', startT: 8 / 12, endT: 9 / 12 },
  { monthIndex: 9, sPos: 9, season: 'autumn', startT: 9 / 12, endT: 10 / 12 },
  { monthIndex: 10, sPos: 10, season: 'autumn', startT: 10 / 12, endT: 11 / 12 },
  { monthIndex: 11, sPos: 11, season: 'winter', startT: 11 / 12, endT: 12 / 12 },
];

/**
 * Calculates Month-Boundary Synchronized Canonical Progress within Month (0..1)
 */
export function calculateMonthProgress(currentDate: Date, year: number): { monthIdx: number; monthProgress: number } {
  const monthIdx = currentDate.getMonth(); // 0..11
  const startOfMonth = new Date(year, monthIdx, 1, 0, 0, 0, 0);
  const startOfNextMonth = new Date(year, monthIdx + 1, 1, 0, 0, 0, 0);

  const elapsed = currentDate.getTime() - startOfMonth.getTime();
  const total = startOfNextMonth.getTime() - startOfMonth.getTime();
  const monthProgress = Math.min(Math.max(elapsed / total, 0), 1.0);

  return { monthIdx, monthProgress };
}

/**
 * Continuous parameterization of racetrack centerline by perimeter arc-length s in [0, P).
 */
export function getCenterlinePointAndNormal(
  s: number,
  cx: number,
  cy: number,
  wc: number,
  hc: number,
  Rc: number,
  P: number
): { x: number; y: number; nx: number; ny: number } {
  const normS = ((s % P) + P) % P;

  const arcLen = (Math.PI / 2) * Rc;
  const s0 = wc / 2;
  const s1 = s0 + arcLen;
  const s2 = s1 + hc;
  const s3 = s2 + arcLen;
  const s4 = s3 + wc;
  const s5 = s4 + arcLen;
  const s6 = s5 + hc;
  const s7 = s6 + arcLen;

  if (normS <= s0) {
    return { x: cx + normS, y: cy + hc / 2 + Rc, nx: 0, ny: 1 };
  }
  if (normS <= s1) {
    const delta = normS - s0;
    const angle = Math.PI / 2 - delta / Rc;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    return { x: cx + wc / 2 + Rc * cosA, y: cy + hc / 2 + Rc * sinA, nx: cosA, ny: sinA };
  }
  if (normS <= s2) {
    const delta = normS - s1;
    return { x: cx + wc / 2 + Rc, y: cy + hc / 2 - delta, nx: 1, ny: 0 };
  }
  if (normS <= s3) {
    const delta = normS - s2;
    const angle = 0 - delta / Rc;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    return { x: cx + wc / 2 + Rc * cosA, y: cy - hc / 2 + Rc * sinA, nx: cosA, ny: sinA };
  }
  if (normS <= s4) {
    const delta = normS - s3;
    return { x: cx + wc / 2 - delta, y: cy - hc / 2 - Rc, nx: 0, ny: -1 };
  }
  if (normS <= s5) {
    const delta = normS - s4;
    const angle = -Math.PI / 2 - delta / Rc;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    return { x: cx - wc / 2 + Rc * cosA, y: cy - hc / 2 + Rc * sinA, nx: cosA, ny: sinA };
  }
  if (normS <= s6) {
    const delta = normS - s5;
    return { x: cx - wc / 2 - Rc, y: cy - hc / 2 + delta, nx: -1, ny: 0 };
  }
  if (normS <= s7) {
    const delta = normS - s6;
    const angle = Math.PI - delta / Rc;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    return { x: cx - wc / 2 + Rc * cosA, y: cy + hc / 2 + Rc * sinA, nx: cosA, ny: sinA };
  }
  const delta = normS - s7;
  return { x: cx - wc / 2 + delta, y: cy + hc / 2 + Rc, nx: 0, ny: 1 };
}

/**
 * Returns point on the inner progress path by taking the exact centerline point and offsetting inward.
 */
export function getInnerProgressPoint(
  s: number,
  cx: number,
  cy: number,
  wc: number,
  hc: number,
  Rc: number,
  P: number,
  innerInset: number
): { x: number; y: number } {
  const pt = getCenterlinePointAndNormal(s, cx, cy, wc, hc, Rc, P);
  return {
    x: pt.x - innerInset * pt.nx,
    y: pt.y - innerInset * pt.ny,
  };
}

/**
 * Returns point, unit tangent vector, and normal vector on the inner progress path.
 */
export function getInnerProgressPointAndTangent(
  s: number,
  cx: number,
  cy: number,
  wc: number,
  hc: number,
  Rc: number,
  P: number,
  innerInset: number
): { px: number; py: number; tx: number; ty: number; nx: number; ny: number } {
  const pt = getCenterlinePointAndNormal(s, cx, cy, wc, hc, Rc, P);
  const px = pt.x - innerInset * pt.nx;
  const py = pt.y - innerInset * pt.ny;
  // Counter-clockwise unit tangent
  const tx = pt.ny;
  const ty = -pt.nx;
  return { px, py, tx, ty, nx: pt.nx, ny: pt.ny };
}

/**
 * Builds the small subtle directional arrowhead at the progress line endpoint.
 */
export function getInnerProgressArrowheadPathD(
  s: number,
  cx: number,
  cy: number,
  wc: number,
  hc: number,
  Rc: number,
  P: number,
  innerInset: number
): string {
  const { px, py, tx, ty, nx, ny } = getInnerProgressPointAndTangent(s, cx, cy, wc, hc, Rc, P, innerInset);
  const L = 4.8;
  const W = 3.2;
  const w1x = (px - L * tx + W * nx).toFixed(2);
  const w1y = (py - L * ty + W * ny).toFixed(2);
  const w2x = (px - L * tx - W * nx).toFixed(2);
  const w2y = (py - L * ty - W * ny).toFixed(2);

  return `M ${w1x} ${w1y} L ${px.toFixed(2)} ${py.toFixed(2)} L ${w2x} ${w2y}`;
}

/**
 * Builds the perpendicular start notch / tick mark at the progress line starting point.
 */
export function getInnerProgressStartNotchPathD(
  sStart: number,
  cx: number,
  cy: number,
  wc: number,
  hc: number,
  Rc: number,
  P: number,
  innerInset: number
): string {
  const { px, py, nx, ny } = getInnerProgressPointAndTangent(sStart, cx, cy, wc, hc, Rc, P, innerInset);
  const H = 5.5;
  const p1x = (px + H * nx).toFixed(2);
  const p1y = (py + H * ny).toFixed(2);
  const p2x = (px - H * nx).toFixed(2);
  const p2y = (py - H * ny).toFixed(2);

  return `M ${p1x} ${p1y} L ${p2x} ${p2y}`;
}

/**
 * Builds the continuous inner progress loop path from sStart to sEnd.
 */
export function buildInnerProgressSubPath(
  sStart: number,
  sEnd: number,
  cx: number,
  cy: number,
  wc: number,
  hc: number,
  Rc: number,
  P: number,
  innerInset: number
): string {
  const totalLen = sEnd - sStart;
  if (totalLen <= 0.001) return '';

  const samples = Math.max(Math.ceil((totalLen / P) * 120), 4);
  const pts: { x: string; y: string }[] = [];

  for (let i = 0; i <= samples; i++) {
    const s = sStart + (i / samples) * totalLen;
    const pt = getInnerProgressPoint(s, cx, cy, wc, hc, Rc, P, innerInset);
    pts.push({ x: pt.x.toFixed(2), y: pt.y.toFixed(2) });
  }

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i <= samples; i++) {
    d += ` L ${pts[i].x} ${pts[i].y}`;
  }
  return d;
}

export function YearCycleMonthPicker({
  year,
  selectedMonth,
  currentDate = new Date(),
  locale = 'kz',
  debugProgress,
  onSelectMonth,
}: YearCycleMonthPickerProps) {
  const { colors, isDark } = useTheme();
  const screenWidth = Dimensions.get('window').width;

  const loc = MONTH_NAMES[locale] ?? MONTH_NAMES.kz;

  const isCurrentYear = year === currentDate.getFullYear();
  const actualCurrentMonthIdx = currentDate.getMonth();

  // Dynamic responsive sizing
  const containerWidth = screenWidth - 32;
  const svgWidth = containerWidth;
  const svgHeight = 272;
  const cx = svgWidth / 2;
  const cy = svgHeight / 2;

  // Track Dimensions
  const trackWidth = 46;
  const Rc = 46;
  const Rout = Rc + trackWidth / 2; // 69
  const Rin = Rc - trackWidth / 2; // 23

  const outerW = Math.min(svgWidth - 44, 326);
  const wc = outerW - 2 * Rout;
  const hc = 48;

  const P = 2 * wc + 2 * hc + 2 * Math.PI * Rc;
  const deltaS = P / 12;

  const outerH = hc + 2 * Rout;
  const innerW = wc + 2 * Rin;
  const innerH = hc + 2 * Rin;

  // Inner progress path inset (trackWidth / 2 + 8px inward offset = 31 pt from centerline)
  const innerInset = trackWidth / 2 + 8;

  // Seasonal palette
  const seasonStyles = useMemo(() => {
    if (isDark) {
      return {
        winter: { bg: '#1F2633', label: '#8FA8C4' },
        spring: { bg: '#1C2A24', label: '#76AD8F' },
        summer: { bg: '#2B271A', label: '#CBAA5E' },
        autumn: { bg: '#2A201B', label: '#B5916E' },
      };
    }
    return {
      winter: { bg: '#EEF3F8', label: '#657D99' },
      spring: { bg: '#EEF6F0', label: '#528769' },
      summer: { bg: '#FDFAEF', label: '#9E7B3D' },
      autumn: { bg: '#F4ECE3', label: '#8E6545' },
    };
  }, [isDark]);

  // Master Synchronized Progress S-Coordinate:
  // Starts at s = -deltaS / 2 (Jan 1, 00:00 at Жел/Қаң separator)
  // Advances through completed months and interpolates smoothly within the current month
  const targetProgressS = useMemo(() => {
    const sStartJan = -deltaS / 2;

    if (typeof debugProgress === 'number') {
      const clamped = Math.min(Math.max(debugProgress, 0), 1.0);
      return sStartJan + clamped * P;
    }

    if (!isCurrentYear) return sStartJan;

    const { monthIdx, monthProgress } = calculateMonthProgress(currentDate, year);
    // Exact position along the master racetrack:
    const sCurrent = (monthIdx - 0.5 + monthProgress) * deltaS;
    return sCurrent;
  }, [debugProgress, isCurrentYear, currentDate, year, deltaS, P]);

  // 1. Continuous Base Racetrack Path (EvenOdd fill)
  const trackPathD = useMemo(() => {
    const ox = cx - outerW / 2;
    const oy = cy - outerH / 2;
    const ix = cx - innerW / 2;
    const iy = cy - innerH / 2;

    return `
      M ${ox + Rout} ${oy}
      H ${ox + outerW - Rout}
      A ${Rout} ${Rout} 0 0 1 ${ox + outerW} ${oy + Rout}
      V ${oy + outerH - Rout}
      A ${Rout} ${Rout} 0 0 1 ${ox + outerW - Rout} ${oy + outerH}
      H ${ox + Rout}
      A ${Rout} ${Rout} 0 0 1 ${ox} ${oy + outerH - Rout}
      V ${oy + Rout}
      A ${Rout} ${Rout} 0 0 1 ${ox + Rout} ${oy}
      Z
      M ${ix + Rin} ${iy}
      A ${Rin} ${Rin} 0 0 0 ${ix} ${iy + Rin}
      V ${iy + innerH - Rin}
      A ${Rin} ${Rin} 0 0 0 ${ix + Rin} ${iy + innerH}
      H ${ix + innerW - Rin}
      A ${Rin} ${Rin} 0 0 0 ${ix + innerW} ${iy + innerH - Rin}
      V ${iy + Rin}
      A ${Rin} ${Rin} 0 0 0 ${ix + innerW - Rin} ${iy}
      Z
    `;
  }, [cx, cy, outerW, outerH, innerW, innerH, Rout, Rin]);

  // 2. Dedicated Full Background Progress Loop (Closed loop starting at Jan 1st)
  const fullProgressLoopD = useMemo(() => {
    const sStartJan = -deltaS / 2;
    return buildInnerProgressSubPath(
      sStartJan,
      sStartJan + P,
      cx,
      cy,
      wc,
      hc,
      Rc,
      P,
      innerInset
    );
  }, [cx, cy, wc, hc, Rc, P, deltaS, innerInset]);

  // 3. Active Year Progress Stroke Path (Runs from Jan 1st to targetProgressS)
  const activeProgressPathD = useMemo(() => {
    const sStartJan = -deltaS / 2;
    if (targetProgressS <= sStartJan + 0.5) return '';
    return buildInnerProgressSubPath(
      sStartJan,
      targetProgressS,
      cx,
      cy,
      wc,
      hc,
      Rc,
      P,
      innerInset
    );
  }, [targetProgressS, cx, cy, wc, hc, Rc, P, deltaS, innerInset]);

  // 4. Directional Arrowhead at the current progress endpoint
  const arrowheadPathD = useMemo(() => {
    const sStartJan = -deltaS / 2;
    if (targetProgressS <= sStartJan + 0.5) return '';
    return getInnerProgressArrowheadPathD(
      targetProgressS,
      cx,
      cy,
      wc,
      hc,
      Rc,
      P,
      innerInset
    );
  }, [targetProgressS, cx, cy, wc, hc, Rc, P, deltaS, innerInset]);

  // 5. Perpendicular start notch at Jan 1st
  const startNotchPathD = useMemo(() => {
    const sStartJan = -deltaS / 2;
    return getInnerProgressStartNotchPathD(
      sStartJan,
      cx,
      cy,
      wc,
      hc,
      Rc,
      P,
      innerInset
    );
  }, [cx, cy, wc, hc, Rc, P, deltaS, innerInset]);

  // 6. Build segments explicitly mapped to their canonical monthIndex with expanded hit targets
  const { segments, dividers, monthCenters } = useMemo(() => {
    const segList = [];
    const divList = [];
    const centers = [];
    const samplesPerEdge = 12;

    for (const item of CANONICAL_MONTH_CONFIG) {
      const { monthIndex, sPos, season, startT, endT } = item;
      const sCenter = sPos * deltaS;
      const centerPt = getCenterlinePointAndNormal(sCenter, cx, cy, wc, hc, Rc, P);

      centers.push({ monthIndex, x: centerPt.x, y: centerPt.y });

      const sStart = sCenter - deltaS / 2;
      const sEnd = sCenter + deltaS / 2;

      // Visible polygon (exact racetrack width)
      const outerPoints: { x: number; y: number }[] = [];
      for (let step = 0; step <= samplesPerEdge; step++) {
        const s = sStart + (step / samplesPerEdge) * (sEnd - sStart);
        const { x, y, nx, ny } = getCenterlinePointAndNormal(s, cx, cy, wc, hc, Rc, P);
        outerPoints.push({
          x: x + (trackWidth / 2) * nx,
          y: y + (trackWidth / 2) * ny,
        });
      }

      const innerPoints: { x: number; y: number }[] = [];
      for (let step = 0; step <= samplesPerEdge; step++) {
        const s = sEnd - (step / samplesPerEdge) * (sEnd - sStart);
        const { x, y, nx, ny } = getCenterlinePointAndNormal(s, cx, cy, wc, hc, Rc, P);
        innerPoints.push({
          x: x - (trackWidth / 2) * nx,
          y: y - (trackWidth / 2) * ny,
        });
      }

      let pD = `M ${outerPoints[0].x.toFixed(2)} ${outerPoints[0].y.toFixed(2)}`;
      for (let k = 1; k < outerPoints.length; k++) {
        pD += ` L ${outerPoints[k].x.toFixed(2)} ${outerPoints[k].y.toFixed(2)}`;
      }
      for (let k = 0; k < innerPoints.length; k++) {
        pD += ` L ${innerPoints[k].x.toFixed(2)} ${innerPoints[k].y.toFixed(2)}`;
      }
      pD += ' Z';

      // Expanded hit target polygon (extends 8pt radially inward and outward without angular overlap)
      const hitOuterPoints: { x: number; y: number }[] = [];
      for (let step = 0; step <= samplesPerEdge; step++) {
        const s = sStart + (step / samplesPerEdge) * (sEnd - sStart);
        const { x, y, nx, ny } = getCenterlinePointAndNormal(s, cx, cy, wc, hc, Rc, P);
        hitOuterPoints.push({
          x: x + (trackWidth / 2 + 8) * nx,
          y: y + (trackWidth / 2 + 8) * ny,
        });
      }

      const hitInnerPoints: { x: number; y: number }[] = [];
      for (let step = 0; step <= samplesPerEdge; step++) {
        const s = sEnd - (step / samplesPerEdge) * (sEnd - sStart);
        const { x, y, nx, ny } = getCenterlinePointAndNormal(s, cx, cy, wc, hc, Rc, P);
        hitInnerPoints.push({
          x: x - (trackWidth / 2 + 8) * nx,
          y: y - (trackWidth / 2 + 8) * ny,
        });
      }

      let hitPD = `M ${hitOuterPoints[0].x.toFixed(2)} ${hitOuterPoints[0].y.toFixed(2)}`;
      for (let k = 1; k < hitOuterPoints.length; k++) {
        hitPD += ` L ${hitOuterPoints[k].x.toFixed(2)} ${hitOuterPoints[k].y.toFixed(2)}`;
      }
      for (let k = 0; k < hitInnerPoints.length; k++) {
        hitPD += ` L ${hitInnerPoints[k].x.toFixed(2)} ${hitInnerPoints[k].y.toFixed(2)}`;
      }
      hitPD += ' Z';

      segList.push({
        monthIndex,
        sPos,
        season,
        startT,
        endT,
        pathD: pD,
        expandedHitPathD: hitPD,
        shortName: loc.short[monthIndex],
        fullName: loc.full[monthIndex],
        centerX: centerPt.x,
        centerY: centerPt.y,
        dotX: centerPt.x + 13 * centerPt.nx,
        dotY: centerPt.y + 13 * centerPt.ny,
      });

      const sDiv = sCenter + deltaS / 2;
      const divPt = getCenterlinePointAndNormal(sDiv, cx, cy, wc, hc, Rc, P);
      divList.push({
        x1: divPt.x - (trackWidth / 2) * divPt.nx,
        y1: divPt.y - (trackWidth / 2) * divPt.ny,
        x2: divPt.x + (trackWidth / 2) * divPt.nx,
        y2: divPt.y + (trackWidth / 2) * divPt.ny,
      });
    }

    return { segments: segList, dividers: divList, monthCenters: centers };
  }, [cx, cy, wc, hc, Rc, P, deltaS, trackWidth, loc]);

  // Season Labels positions: ~16px outer margin to screen edge, vertical breathing room
  const seasonLabels = {
    summer: {
      text: loc.seasons.summer,
      x: cx,
      y: cy - outerH / 2 - 18,
    },
    winter: {
      text: loc.seasons.winter,
      x: cx,
      y: cy + outerH / 2 + 26,
    },
    spring: {
      text: loc.seasons.spring,
      x: cx + outerW / 2 + 13,
      y: cy,
    },
    autumn: {
      text: loc.seasons.autumn,
      x: cx - outerW / 2 - 13,
      y: cy,
    },
  };

  const handleMonthPress = (monthIdx: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectMonth(monthIdx);
  };

  // Voronoi Nearest-Center Tap Resolver fallback for taps anywhere on the canvas
  const handleContainerPress = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    let closestMonth = 0;
    let minDistSq = Infinity;

    for (let i = 0; i < monthCenters.length; i++) {
      const dx = locationX - monthCenters[i].x;
      const dy = locationY - monthCenters[i].y;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        closestMonth = monthCenters[i].monthIndex;
      }
    }

    handleMonthPress(closestMonth);
  };

  const trackBorderColor = isDark ? '#2E384D' : '#DFE4EA';
  const dividerColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)';

  return (
    <Pressable
      style={[styles.container, { width: svgWidth, height: svgHeight }]}
      onPress={handleContainerPress}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`Ай таңдау: ${loc.full[selectedMonth]} ${year}`}
    >
      <Svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} pointerEvents="box-none">
        {/* Season Labels outside racetrack */}
        {/* Top: ЖАЗ */}
        <SvgText
          x={seasonLabels.summer.x}
          y={seasonLabels.summer.y}
          textAnchor="middle"
          fontSize={10.5}
          fontWeight="700"
          letterSpacing={1.4}
          fill={seasonStyles.summer.label}
        >
          {seasonLabels.summer.text}
        </SvgText>

        {/* Bottom: ҚЫС */}
        <SvgText
          x={seasonLabels.winter.x}
          y={seasonLabels.winter.y}
          textAnchor="middle"
          fontSize={10.5}
          fontWeight="700"
          letterSpacing={1.4}
          fill={seasonStyles.winter.label}
        >
          {seasonLabels.winter.text}
        </SvgText>

        {/* Right: КӨКТЕМ */}
        <SvgText
          x={seasonLabels.spring.x}
          y={seasonLabels.spring.y}
          textAnchor="middle"
          fontSize={10}
          fontWeight="700"
          letterSpacing={1.4}
          fill={seasonStyles.spring.label}
          transform={`rotate(90, ${seasonLabels.spring.x}, ${seasonLabels.spring.y})`}
        >
          {seasonLabels.spring.text}
        </SvgText>

        {/* Left: КҮЗ */}
        <SvgText
          x={seasonLabels.autumn.x}
          y={seasonLabels.autumn.y}
          textAnchor="middle"
          fontSize={10}
          fontWeight="700"
          letterSpacing={1.4}
          fill={seasonStyles.autumn.label}
          transform={`rotate(-90, ${seasonLabels.autumn.x}, ${seasonLabels.autumn.y})`}
        >
          {seasonLabels.autumn.text}
        </SvgText>

        {/* Unified Continuous Racetrack Base Loop */}
        <Path
          d={trackPathD}
          fill={isDark ? '#232B3A' : '#F1F4F9'}
          stroke={trackBorderColor}
          strokeWidth={1}
          fillRule="evenodd"
        />

        {/* 12 Interactive Month Segments with Native Exact Vector Hit-Testing */}
        {segments.map((seg) => {
          const isSelected = seg.monthIndex === selectedMonth;
          const isActualToday = isCurrentYear && seg.monthIndex === actualCurrentMonthIdx;

          const segmentBg = isSelected
            ? colors.today
            : isActualToday
              ? (isDark ? '#202735' : '#F9FAFC')
              : seasonStyles[seg.season].bg;

          const textColor = isSelected
            ? '#FFFFFF'
            : isActualToday
              ? colors.today
              : colors.text;

          return (
            <G
              key={`segment-${seg.monthIndex}`}
              onPress={() => handleMonthPress(seg.monthIndex)}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`${seg.fullName} ${year}`}
            >
              {/* Segment Background / Selection Fill */}
              <Path
                d={seg.pathD}
                fill={segmentBg}
                stroke={
                  isSelected
                    ? (colors.todayDark ?? colors.today)
                    : 'none'
                }
                strokeWidth={isSelected ? 1.5 : 0}
                strokeLinejoin="round"
              />

              {/* Expanded Invisible Hit Path for expanded touch target */}
              <Path
                d={seg.expandedHitPathD}
                fill="rgba(0, 0, 0, 0.001)"
              />

              {/* Small accent dot above label for unselected current month */}
              {isActualToday && !isSelected && (
                <Circle
                  cx={seg.dotX}
                  cy={seg.dotY}
                  r={2}
                  fill={colors.today}
                />
              )}

              {/* Month Text Label */}
              <SvgText
                x={seg.centerX}
                y={seg.centerY + 4.5}
                textAnchor="middle"
                fontSize={13}
                fontWeight={isSelected || isActualToday ? '700' : '600'}
                fill={textColor}
              >
                {seg.shortName}
              </SvgText>
            </G>
          );
        })}

        {/* Subtle Hairline Dividers Between Months */}
        {dividers.map((d, idx) => (
          <Line
            key={`div-${idx}`}
            x1={d.x1}
            y1={d.y1}
            x2={d.x2}
            y2={d.y2}
            stroke={dividerColor}
            strokeWidth={1}
          />
        ))}

        {/* Dedicated Synchronized Inner Year Progress Loop */}
        {/* Subtle Background Track */}
        <Path
          d={fullProgressLoopD}
          fill="none"
          stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}
          strokeWidth={2.5}
        />

        {/* Start Notch on Background Track */}
        {startNotchPathD.length > 0 && (
          <Path
            d={startNotchPathD}
            fill="none"
            stroke={isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.09)'}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}

        {/* Active Year Progress Stroke */}
        {(isCurrentYear || typeof debugProgress === 'number') && activeProgressPathD.length > 0 && (
          <Path
            d={activeProgressPathD}
            fill="none"
            stroke={colors.today}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}

        {/* Active Start Notch at Jan 1st (Forms unified progress bar body) */}
        {(isCurrentYear || typeof debugProgress === 'number') && activeProgressPathD.length > 0 && startNotchPathD.length > 0 && (
          <Path
            d={startNotchPathD}
            fill="none"
            stroke={colors.today}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}

        {/* Subtle Directional Arrowhead at the current progress endpoint */}
        {(isCurrentYear || typeof debugProgress === 'number') && arrowheadPathD.length > 0 && (
          <Path
            d={arrowheadPathD}
            fill="none"
            stroke={colors.today}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </Svg>

      {/* Center Zone: Pure Selected Month Title */}
      <View style={styles.centerContainer} pointerEvents="none">
        <Text style={[styles.centerMonth, { color: colors.text }]}>
          {loc.full[selectedMonth]}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  centerContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerMonth: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
