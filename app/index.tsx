import { format, isToday } from 'date-fns';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  unstable_batchedUpdates,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Mask, Path, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { colors } from '@/constants/colors';
import { usePlanner } from '@/store/planner-store';
import {
  addDays,
  formatWeekRange,
  getMonthGrid,
  getStartOfWeekWith,
  isSameMonth,
  months,
  shortMonths,
  toDateKey,
} from '@/services/date-service';
import { DayCard } from '@/components/day-card';
import { SettingsIcon } from '@/components/settings-icon';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { TaskBottomSheet } from '@/components/TaskBottomSheet';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { BackButton } from '@/components/BackButton';
import { MotivationalHeader } from '@/components/MotivationalHeader';
import { useCardTransition } from '@/components/card-transition-provider';
import { MonthPickerModal } from '@/components/MonthPickerModal';
import { ViewModeModal, type ViewMode } from '@/components/ViewModeModal';
import { CompactWeekStrip } from '@/components/CompactWeekStrip';
import type { Task } from '@/types/task';

const modeLabels: Record<ViewMode, string> = { day: 'Күн', week: 'Апта', month: 'Ай', year: 'Жыл' };

type DayDataItem = {
  date: Date;
  dateKey: string;
  tasks: Task[];
  monthLabel?: string;
};

type SlotData = {
  id: number;
  slotKey: 'prev' | 'curr' | 'next';
  baseX: number;
  dates: Date[];
  days: DayDataItem[];
};

type DerivedWeekData = {
  headerTitle: string;
  activeHeaderDate: Date;
  isFutureWeek: boolean;
  isPastWeek: boolean;
  currSlotDays: DayDataItem[];
  slots: SlotData[];
};

export default function Home() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { openCard } = useCardTransition();
  const { ready, error, tasks, loadRange, create, settings } = usePlanner();
  const firstDay = settings.firstDayOfWeek ?? 'mon';
  const weekStartsOn: 0 | 1 | 6 = firstDay === 'sun' ? 0 : firstDay === 'sat' ? 6 : 1;
  const [weekStart, setWeekStart] = useState(() => getStartOfWeekWith(new Date(), weekStartsOn));

  useEffect(() => {
    setWeekStart((prev) => getStartOfWeekWith(prev, weekStartsOn));
  }, [weekStartsOn]);

  const [dayDate, setDayDate] = useState(new Date());
  const [mode, setMode] = useState<ViewMode>(() => settings.defaultViewMode ?? 'week');
  const modeRef = useRef<ViewMode>(mode);
  modeRef.current = mode;

  // Apply defaultViewMode when settings are loaded from DB or changed in settings
  const appliedDefaultModeRef = useRef<string | null>(settings.defaultViewMode ?? null);
  useEffect(() => {
    if (ready && settings.defaultViewMode) {
      if (appliedDefaultModeRef.current !== settings.defaultViewMode) {
        appliedDefaultModeRef.current = settings.defaultViewMode;
        setMode(settings.defaultViewMode);
      }
    }
  }, [ready, settings.defaultViewMode]);

  const [modePickerOpen, setModePickerOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [month, setMonth] = useState(new Date());
  const [year, setYear] = useState(new Date().getFullYear());
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [fromYearMode, setFromYearMode] = useState(false);

  const handleMonthPickerSelect = useCallback((selectedDate: Date) => {
    setFromYearMode(false);
    if (modeRef.current === 'day') {
      setDayDate(selectedDate);
    } else if (modeRef.current === 'week') {
      setWeekStart(getStartOfWeekWith(selectedDate, weekStartsOn));
    } else if (modeRef.current === 'month') {
      setMonth(selectedDate);
    } else {
      setMonth(selectedDate);
      setYear(selectedDate.getFullYear());
      setMode('month');
    }
  }, [weekStartsOn]);

  // ── Month carousel ──────────────────────────────────────────────
  const monthCarouselAnim = useRef(new Animated.Value(0)).current;
  const isMonthAnimatingRef = useRef(false);
  const pendingMonthResetRef = useRef(false);
  const monthTouchStartX = useRef(0);
  const monthTouchStartY = useRef(0);
  const isMonthHorizontal = useRef(false);
  const monthHasDetermined = useRef(false);

  // ── Year carousel ───────────────────────────────────────────────
  const yearCarouselAnim = useRef(new Animated.Value(0)).current;
  const isYearAnimatingRef = useRef(false);
  const pendingYearResetRef = useRef(false);
  const zoomAnim = useRef(new Animated.Value(0)).current;
  const bottomBarAnim = useRef(new Animated.Value(0)).current;

  const modeButtonRef = useRef<View>(null);
  const [modeButtonBounds, setModeButtonBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const derivedWeekData = useMemo<DerivedWeekData>(() => {
    const currDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const prevDates = currDates.map((d) => addDays(d, -7));
    const nextDates = currDates.map((d) => addDays(d, 7));

    const buildDays = (datesList: Date[]): DayDataItem[] => {
      const monthCounts: Record<number, number> = {};
      datesList.forEach((d) => {
        const m = d.getMonth();
        monthCounts[m] = (monthCounts[m] || 0) + 1;
      });
      let dominantMonth = datesList[0].getMonth();
      let maxCount = 0;
      for (const [m, count] of Object.entries(monthCounts)) {
        if (count > maxCount) {
          maxCount = count;
          dominantMonth = Number(m);
        }
      }

      return datesList.map((date) => {
        const key = toDateKey(date);
        const dayTasks = tasks.filter((t) => t.date === key);
        const isOtherMonth = date.getMonth() !== dominantMonth;
        return {
          date,
          dateKey: key,
          tasks: dayTasks,
          monthLabel: isOtherMonth ? `${shortMonths[date.getMonth()]}.` : undefined,
        };
      });
    };

    const currMonthCounts: Record<number, number> = {};
    currDates.forEach((d) => {
      const m = d.getMonth();
      currMonthCounts[m] = (currMonthCounts[m] || 0) + 1;
    });
    let currDominantMonth = currDates[0].getMonth();
    let currMaxCount = 0;
    for (const [m, count] of Object.entries(currMonthCounts)) {
      if (count > currMaxCount) {
        currMaxCount = count;
        currDominantMonth = Number(m);
      }
    }
    const dominantDate = currDates.find((d) => d.getMonth() === currDominantMonth) ?? currDates[0];

    const headerTitle =
      mode === 'day'
        ? `${months[dayDate.getMonth()][0].toUpperCase()}${months[dayDate.getMonth()].slice(1)} ${dayDate.getFullYear()}`
        : mode === 'week'
        ? `${months[dominantDate.getMonth()][0].toUpperCase()}${months[dominantDate.getMonth()].slice(1)} ${dominantDate.getFullYear()}`
        : mode === 'month'
        ? `${months[month.getMonth()][0].toUpperCase()}${months[month.getMonth()].slice(1)} ${month.getFullYear()}`
        : `${year} жыл`;

    const todayTime = new Date().setHours(0, 0, 0, 0);
    const firstWeekDateTime = currDates[0].getTime();
    const lastWeekDateTime = currDates[6].getTime();
    const isFutureWeek = firstWeekDateTime > todayTime;
    const isPastWeek = lastWeekDateTime < todayTime;

    const currSlotDays = buildDays(currDates);

    const slots: SlotData[] = [
      { id: 0, slotKey: 'prev', baseX: -screenWidth, dates: prevDates, days: buildDays(prevDates) },
      { id: 1, slotKey: 'curr', baseX: 0, dates: currDates, days: currSlotDays },
      { id: 2, slotKey: 'next', baseX: screenWidth, dates: nextDates, days: buildDays(nextDates) },
    ];

    return {
      headerTitle,
      activeHeaderDate: dominantDate,
      isFutureWeek,
      isPastWeek,
      currSlotDays,
      slots,
    };
  }, [weekStart, tasks, screenWidth, mode, month, year, dayDate]);

  // ── Animated.Value for carousel translation ──────────────────────
  const carouselAnim = useRef(new Animated.Value(0)).current;
  const isAnimatingRef = useRef(false);

  // ── Week expand/collapse ────────────────────────────────────────
  const isDefaultExpanded = settings.lastDayVisibility !== 'hidden';
  const weekProgress = useRef(new Animated.Value(isDefaultExpanded ? 1 : 0)).current;
  const isExpandedRef = useRef(isDefaultExpanded);
  const userSundayStateRef = useRef<'expanded' | 'collapsed' | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // ── Motivational Header reveal ──────────────────────────────────
  const motivationalAnim = useRef(new Animated.Value(0)).current;
  const isMotivationalOpenRef = useRef(false);
  const [isMotivationalOpen, setIsMotivationalOpen] = useState(false);

  const openMotivationalHeader = useCallback(() => {
    isMotivationalOpenRef.current = true;
    setIsMotivationalOpen(true);
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Animated.spring(motivationalAnim, {
      toValue: 1,
      tension: 175,
      friction: 17,
      useNativeDriver: false,
    }).start();
  }, [motivationalAnim]);

  const closeMotivationalHeader = useCallback(() => {
    isMotivationalOpenRef.current = false;
    setIsMotivationalOpen(false);
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.spring(motivationalAnim, {
      toValue: 0,
      tension: 195,
      friction: 20,
      useNativeDriver: false,
    }).start();
  }, [motivationalAnim]);

  const toggleMotivationalHeader = useCallback(() => {
    if (isMotivationalOpenRef.current) {
      closeMotivationalHeader();
    } else {
      openMotivationalHeader();
    }
  }, [openMotivationalHeader, closeMotivationalHeader]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion).catch(() => {});
    const l = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => l.remove();
  }, []);

  useEffect(() => {
    const dates = derivedWeekData.slots[1].dates;
    if (ready && dates.length > 0) {
      // Load the surrounding weeks as well so adjacent carousel slots have
      // data immediately and swiping never shows an empty/stale week.
      void loadRange(toDateKey(addDays(dates[0], -7)), toDateKey(addDays(dates[6], 7)));
      const defaultExpanded = settings.lastDayVisibility !== 'hidden';
      const target =
        userSundayStateRef.current === 'expanded' ? 1
        : userSundayStateRef.current === 'collapsed' ? 0
        : defaultExpanded ? 1 : 0;
      isExpandedRef.current = target === 1;
      Animated.timing(weekProgress, { toValue: target, duration: 180, useNativeDriver: false }).start();
    }
  }, [ready, derivedWeekData.slots, loadRange, weekProgress, settings.lastDayVisibility]);

  useEffect(() => {
    userSundayStateRef.current = null;
    const defaultExpanded = settings.lastDayVisibility !== 'hidden';
    const target = defaultExpanded ? 1 : 0;
    isExpandedRef.current = target === 1;
    Animated.timing(weekProgress, { toValue: target, duration: 200, useNativeDriver: false }).start();
  }, [settings.lastDayVisibility, weekProgress]);

  // ── Month data load ─────────────────────────────────────────────
  useEffect(() => {
    if (!ready || mode !== 'month') return;
    const from = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 2, 0);
    void loadRange(toDateKey(from), toDateKey(to));
  }, [ready, month, mode, loadRange]);

  // The year carousel renders the previous and next year as well, so keep
  // all three years in memory. This also makes task markers appear after a
  // direct switch to the year view.
  useEffect(() => {
    if (!ready || mode !== 'year') return;
    const from = new Date(year - 1, 0, 1);
    const to = new Date(year + 2, 0, 0);
    void loadRange(toDateKey(from), toDateKey(to));
  }, [ready, year, mode, loadRange]);

  const collapseWeek = useCallback(() => {
    userSundayStateRef.current = 'collapsed';
    isExpandedRef.current = false;
    Animated.spring(weekProgress, { toValue: 0, tension: 180, friction: 18, useNativeDriver: false }).start();
  }, [weekProgress]);

  const expandWeek = useCallback(() => {
    userSundayStateRef.current = 'expanded';
    isExpandedRef.current = true;
    Animated.spring(weekProgress, { toValue: 1, tension: 180, friction: 18, useNativeDriver: false }).start();
  }, [weekProgress]);

  const openModePicker = useCallback(() => {
    collapseWeek();
    if (modeButtonRef.current) {
      modeButtonRef.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          setModeButtonBounds({ x, y, width, height });
        }
        setModePickerOpen(true);
      });
    } else {
      setModePickerOpen(true);
    }
  }, [collapseWeek]);

  // ── Touch handlers ───────────────────────────────────────────────
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const yearTouchStartX = useRef(0);
  const yearTouchStartY = useRef(0);
  const isYearHorizontal = useRef(false);
  const yearHasDetermined = useRef(false);
  const isHorizontalGesture = useRef(false);
  const hasDetermined = useRef(false);
  const isSwipingRef = useRef(false);



  const pendingResetRef = useRef(false);

  useEffect(() => {
    if (pendingResetRef.current) {
      carouselAnim.setValue(0);
      pendingResetRef.current = false;
      isAnimatingRef.current = false;
      setTimeout(() => {
        isSwipingRef.current = false;
      }, 50);
    }
  }, [weekStart, carouselAnim]);

  const onSwipeComplete = useCallback((direction: -1 | 1) => {
    isAnimatingRef.current = true;
    isSwipingRef.current = true;

    const targetVal = direction * screenWidth;

    Animated.spring(carouselAnim, {
      toValue: targetVal,
      tension: 450,
      friction: 32,
      useNativeDriver: true,
    }).start(() => {
      pendingResetRef.current = true;
      setWeekStart((d) => addDays(d, -direction * 7));
    });
  }, [carouselAnim, screenWidth]);

  const resetToCurrentWeek = useCallback(() => {
    if (isAnimatingRef.current) return;
    setWeekStart(getStartOfWeekWith(new Date(), weekStartsOn));
    carouselAnim.setValue(0);
  }, [carouselAnim, weekStartsOn]);

  const resetToCurrentMonth = useCallback(() => {
    if (isMonthAnimatingRef.current) return;
    setMonth(new Date());
    monthCarouselAnim.setValue(0);
  }, [monthCarouselAnim]);

  // ── Day carousel ────────────────────────────────────────────────
  const dayCarouselAnim = useRef(new Animated.Value(0)).current;
  const isDayAnimatingRef = useRef(false);
  const pendingDayResetRef = useRef(false);
  const dayTouchStartX = useRef(0);
  const dayTouchStartY = useRef(0);
  const isDayHorizontal = useRef(false);
  const dayHasDetermined = useRef(false);

  useEffect(() => {
    if (pendingDayResetRef.current) {
      dayCarouselAnim.setValue(0);
      pendingDayResetRef.current = false;
      isDayAnimatingRef.current = false;
      setTimeout(() => {
        isSwipingRef.current = false;
      }, 50);
    }
  }, [dayDate, dayCarouselAnim]);

  const onDaySwipeComplete = useCallback((direction: -1 | 1) => {
    isDayAnimatingRef.current = true;
    isSwipingRef.current = true;
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.spring(dayCarouselAnim, {
      toValue: direction * screenWidth,
      tension: 450,
      friction: 32,
      useNativeDriver: true,
    }).start(() => {
      pendingDayResetRef.current = true;
      setDayDate((d) => addDays(d, -direction));
    });
  }, [dayCarouselAnim, screenWidth]);

  useEffect(() => {
    if (pendingMonthResetRef.current) {
      monthCarouselAnim.setValue(0);
      pendingMonthResetRef.current = false;
      isMonthAnimatingRef.current = false;
      setTimeout(() => {
        isSwipingRef.current = false;
      }, 50);
    }
  }, [month, monthCarouselAnim]);

  const onMonthSwipeComplete = useCallback((direction: -1 | 1) => {
    isMonthAnimatingRef.current = true;
    isSwipingRef.current = true;
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.spring(monthCarouselAnim, {
      toValue: direction * screenWidth,
      tension: 450,
      friction: 32,
      useNativeDriver: true,
    }).start(() => {
      pendingMonthResetRef.current = true;
      setMonth((m) => new Date(m.getFullYear(), m.getMonth() - direction, 1));
    });
  }, [monthCarouselAnim, screenWidth]);

  const dayScrollYRef = useRef(0);
  const dayGestureHandlers = {
    onTouchStart: (e: { nativeEvent: { pageX: number; pageY: number } }) => {
      if (isDayAnimatingRef.current) return;
      dayTouchStartX.current = e.nativeEvent.pageX;
      dayTouchStartY.current = e.nativeEvent.pageY;
      isDayHorizontal.current = false;
      dayHasDetermined.current = false;
      dayCarouselAnim.stopAnimation();
    },
    onTouchMove: (e: { nativeEvent: { pageX: number; pageY: number } }) => {
      if (isDayAnimatingRef.current) return;
      const dx = e.nativeEvent.pageX - dayTouchStartX.current;
      const dy = e.nativeEvent.pageY - dayTouchStartY.current;
      if (!dayHasDetermined.current) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        isDayHorizontal.current = Math.abs(dx) > Math.abs(dy) * 1.5;
        dayHasDetermined.current = true;
      }
      if (isDayHorizontal.current) {
        isSwipingRef.current = true;
        dayCarouselAnim.setValue(dx);
      }
    },
    onTouchEnd: (e: { nativeEvent: { pageX: number; pageY: number } }) => {
      if (!dayHasDetermined.current || isDayAnimatingRef.current) return;
      if (isDayHorizontal.current) {
        isSwipingRef.current = true;
        const dx = e.nativeEvent.pageX - dayTouchStartX.current;
        const threshold = screenWidth * 0.15;
        if (Math.abs(dx) > threshold) {
          onDaySwipeComplete(dx < 0 ? -1 : 1);
        } else {
          isDayAnimatingRef.current = true;
          Animated.spring(dayCarouselAnim, {
            toValue: 0, tension: 420, friction: 30, useNativeDriver: true,
          }).start(() => {
            isDayAnimatingRef.current = false;
            setTimeout(() => { isSwipingRef.current = false; }, 150);
          });
        }
      } else {
        setTimeout(() => { isSwipingRef.current = false; }, 150);
      }
    },
    onTouchCancel: () => {
      if (dayHasDetermined.current && isDayHorizontal.current) {
        isDayAnimatingRef.current = true;
        Animated.spring(dayCarouselAnim, {
          toValue: 0, tension: 420, friction: 30, useNativeDriver: true,
        }).start(() => {
          isDayAnimatingRef.current = false;
          setTimeout(() => { isSwipingRef.current = false; }, 150);
        });
      }
    },
  };

  const monthGestureHandlers = {
    onTouchStart: (e: { nativeEvent: { pageX: number; pageY: number } }) => {
      if (isMonthAnimatingRef.current) return;
      monthTouchStartX.current = e.nativeEvent.pageX;
      monthTouchStartY.current = e.nativeEvent.pageY;
      isMonthHorizontal.current = false;
      monthHasDetermined.current = false;
      monthCarouselAnim.stopAnimation();
    },
    onTouchMove: (e: { nativeEvent: { pageX: number; pageY: number } }) => {
      if (isMonthAnimatingRef.current) return;
      const dx = e.nativeEvent.pageX - monthTouchStartX.current;
      const dy = e.nativeEvent.pageY - monthTouchStartY.current;
      if (!monthHasDetermined.current) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        isMonthHorizontal.current = Math.abs(dx) > Math.abs(dy) * 1.2;
        monthHasDetermined.current = true;
      }
      if (isMonthHorizontal.current) {
        isSwipingRef.current = true;
        monthCarouselAnim.setValue(dx);
      } else {
        if (isMotivationalOpenRef.current) {
          if (dy < 0) {
            const val = Math.max(0, 1 + dy / 130);
            motivationalAnim.setValue(val);
          }
        } else {
          if (dy > 0) {
            const val = Math.min(1, dy / 130);
            motivationalAnim.setValue(val);
          }
        }
      }
    },
    onTouchEnd: (e: { nativeEvent: { pageX: number; pageY: number } }) => {
      if (!monthHasDetermined.current || isMonthAnimatingRef.current) return;
      if (isMonthHorizontal.current) {
        isSwipingRef.current = true;
        const dx = e.nativeEvent.pageX - monthTouchStartX.current;
        const threshold = screenWidth * 0.1;
        if (Math.abs(dx) > threshold) {
          onMonthSwipeComplete(dx < 0 ? -1 : 1);
        } else {
          isMonthAnimatingRef.current = true;
          Animated.spring(monthCarouselAnim, {
            toValue: 0, tension: 420, friction: 30, useNativeDriver: true,
          }).start(() => {
            isMonthAnimatingRef.current = false;
            setTimeout(() => { isSwipingRef.current = false; }, 150);
          });
        }
      } else {
        const dy = e.nativeEvent.pageY - monthTouchStartY.current;
        if (isMotivationalOpenRef.current) {
          if (dy < -15) {
            closeMotivationalHeader();
          } else {
            openMotivationalHeader();
          }
        } else {
          if (dy > 15) {
            openMotivationalHeader();
          } else {
            closeMotivationalHeader();
          }
        }
        setTimeout(() => { isSwipingRef.current = false; }, 150);
      }
    },
    onTouchCancel: () => {
      if (monthHasDetermined.current) {
        if (isMonthHorizontal.current) {
          isMonthAnimatingRef.current = true;
          Animated.spring(monthCarouselAnim, {
            toValue: 0, tension: 320, friction: 36, useNativeDriver: true,
          }).start(() => {
            isMonthAnimatingRef.current = false;
            setTimeout(() => { isSwipingRef.current = false; }, 150);
          });
        } else {
          if (isMotivationalOpenRef.current) openMotivationalHeader();
          else closeMotivationalHeader();
          setTimeout(() => { isSwipingRef.current = false; }, 150);
        }
      }
    },
  };

  useEffect(() => {
    if (pendingYearResetRef.current) {
      yearCarouselAnim.setValue(0);
      pendingYearResetRef.current = false;
      isYearAnimatingRef.current = false;
      setTimeout(() => {
        isSwipingRef.current = false;
      }, 50);
    }
  }, [year, yearCarouselAnim]);

  const onYearSwipeComplete = useCallback((direction: -1 | 1) => {
    isYearAnimatingRef.current = true;
    isSwipingRef.current = true;
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.spring(yearCarouselAnim, {
      toValue: direction * screenWidth,
      tension: 450,
      friction: 32,
      useNativeDriver: true,
    }).start(() => {
      pendingYearResetRef.current = true;
      setYear((y) => y - direction);
    });
  }, [yearCarouselAnim, screenWidth]);

  const yearGestureHandlers = {
    onTouchStart: (e: { nativeEvent: { pageX: number; pageY: number } }) => {
      if (isYearAnimatingRef.current) return;
      yearTouchStartX.current = e.nativeEvent.pageX;
      yearTouchStartY.current = e.nativeEvent.pageY;
      isYearHorizontal.current = false;
      yearHasDetermined.current = false;
      yearCarouselAnim.stopAnimation();
    },
    onTouchMove: (e: { nativeEvent: { pageX: number; pageY: number } }) => {
      if (isYearAnimatingRef.current) return;
      const dx = e.nativeEvent.pageX - yearTouchStartX.current;
      const dy = e.nativeEvent.pageY - yearTouchStartY.current;
      if (!yearHasDetermined.current) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        isYearHorizontal.current = Math.abs(dx) > Math.abs(dy) * 1.2;
        yearHasDetermined.current = true;
      }
      if (isYearHorizontal.current) {
        isSwipingRef.current = true;
        yearCarouselAnim.setValue(dx);
      } else {
        if (isMotivationalOpenRef.current) {
          if (dy < 0) {
            const val = Math.max(0, 1 + dy / 130);
            motivationalAnim.setValue(val);
          }
        } else {
          if (dy > 0) {
            const val = Math.min(1, dy / 130);
            motivationalAnim.setValue(val);
          }
        }
      }
    },
    onTouchEnd: (e: { nativeEvent: { pageX: number; pageY: number } }) => {
      if (!yearHasDetermined.current || isYearAnimatingRef.current) return;
      if (isYearHorizontal.current) {
        isSwipingRef.current = true;
        const dx = e.nativeEvent.pageX - yearTouchStartX.current;
        const threshold = screenWidth * 0.1;
        if (Math.abs(dx) > threshold) {
          onYearSwipeComplete(dx < 0 ? -1 : 1);
        } else {
          isYearAnimatingRef.current = true;
          Animated.spring(yearCarouselAnim, {
            toValue: 0, tension: 420, friction: 30, useNativeDriver: true,
          }).start(() => {
            isYearAnimatingRef.current = false;
            setTimeout(() => { isSwipingRef.current = false; }, 150);
          });
        }
      } else {
        const dy = e.nativeEvent.pageY - yearTouchStartY.current;
        if (isMotivationalOpenRef.current) {
          if (dy < -15) {
            closeMotivationalHeader();
          } else {
            openMotivationalHeader();
          }
        } else {
          if (dy > 15) {
            openMotivationalHeader();
          } else {
            closeMotivationalHeader();
          }
        }
        setTimeout(() => { isSwipingRef.current = false; }, 150);
      }
    },
    onTouchCancel: () => {
      if (yearHasDetermined.current) {
        if (isYearHorizontal.current) {
          isYearAnimatingRef.current = true;
          Animated.spring(yearCarouselAnim, {
            toValue: 0, tension: 320, friction: 36, useNativeDriver: true,
          }).start(() => {
            isYearAnimatingRef.current = false;
            setTimeout(() => { isSwipingRef.current = false; }, 150);
          });
        } else {
          if (isMotivationalOpenRef.current) openMotivationalHeader();
          else closeMotivationalHeader();
          setTimeout(() => { isSwipingRef.current = false; }, 150);
        }
      }
    },
  };

  const gestureHandlers = {
    onTouchStart: (e: { nativeEvent: { pageX: number; pageY: number } }) => {
      if (modeRef.current !== 'week' || isAnimatingRef.current || isSwipingRef.current) return;
      touchStartX.current = e.nativeEvent.pageX;
      touchStartY.current = e.nativeEvent.pageY;
      isHorizontalGesture.current = false;
      hasDetermined.current = false;
      carouselAnim.stopAnimation();
    },
    onTouchMove: (e: { nativeEvent: { pageX: number; pageY: number } }) => {
      if (modeRef.current !== 'week' || isAnimatingRef.current || isSwipingRef.current) return;
      const dx = e.nativeEvent.pageX - touchStartX.current;
      const dy = e.nativeEvent.pageY - touchStartY.current;

      if (!hasDetermined.current) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        isHorizontalGesture.current = Math.abs(dx) > Math.abs(dy) * 1.1;
        hasDetermined.current = true;
      }

      if (isHorizontalGesture.current) {
        carouselAnim.setValue(dx);
      } else {
        if (isMotivationalOpenRef.current) {
          if (dy < 0) {
            const val = Math.max(0, 1 + dy / 130);
            motivationalAnim.setValue(val);
          }
        } else if (isExpandedRef.current) {
          if (dy > 0) {
            const delta = -dy / 160;
            const newVal = Math.max(0, Math.min(1, 1 + delta));
            weekProgress.setValue(newVal);
          }
        } else {
          if (dy > 0) {
            const val = Math.min(1, dy / 130);
            motivationalAnim.setValue(val);
          } else {
            const delta = -dy / 160;
            const newVal = Math.max(0, Math.min(1, delta));
            weekProgress.setValue(newVal);
          }
        }
      }
    },
    onTouchEnd: (e: { nativeEvent: { pageX: number; pageY: number } }) => {
      if (modeRef.current !== 'week' || !hasDetermined.current || isAnimatingRef.current || isSwipingRef.current) return;
      if (isHorizontalGesture.current) {
        const dx = e.nativeEvent.pageX - touchStartX.current;
        const threshold = screenWidth * 0.22;

        if (Math.abs(dx) > threshold) {
          const direction = dx < 0 ? -1 : 1;
          onSwipeComplete(direction);
        } else {
          isAnimatingRef.current = true;
          Animated.spring(carouselAnim, {
            toValue: 0,
            tension: 420,
            friction: 30,
            useNativeDriver: true,
          }).start(() => {
            isAnimatingRef.current = false;
          });
        }
      } else {
        const dy = e.nativeEvent.pageY - touchStartY.current;

        if (isMotivationalOpenRef.current) {
          if (dy < -15) {
            closeMotivationalHeader();
          } else {
            openMotivationalHeader();
          }
        } else if (isExpandedRef.current) {
          if (dy > 25) {
            collapseWeek();
          } else {
            expandWeek();
          }
        } else {
          if (dy > 15) {
            openMotivationalHeader();
          } else if (dy < -25) {
            closeMotivationalHeader();
            expandWeek();
          } else {
            closeMotivationalHeader();
            collapseWeek();
          }
        }

        setTimeout(() => {
          isSwipingRef.current = false;
        }, 180);
      }
    },
    onTouchCancel: () => {
      if (modeRef.current !== 'week') return;
      if (isHorizontalGesture.current) {
        isAnimatingRef.current = true;
        Animated.spring(carouselAnim, {
          toValue: 0,
          tension: 320,
          friction: 36,
          useNativeDriver: true,
        }).start(() => {
          isAnimatingRef.current = false;
          setTimeout(() => {
            isSwipingRef.current = false;
          }, 180);
        });
      } else {
        if (isMotivationalOpenRef.current) {
          openMotivationalHeader();
        } else {
          closeMotivationalHeader();
        }
        if (isExpandedRef.current) expandWeek();
        else collapseWeek();
        setTimeout(() => {
          isSwipingRef.current = false;
        }, 180);
      }
    },
  };

  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', collapseWeek);
    return () => sub.remove();
  }, [collapseWeek]);

  // ── FlyingTask ──────────────────────────────────────────────────
  const cardLayoutsRef = useRef<{ [key: string]: { x: number; y: number; width: number; height: number } }>({});
  const [flyingTask, setFlyingTask] = useState<{ task: Task; targetLayout: { x: number; y: number; width: number; height: number } } | null>(null);

  const handleCardLayoutMeasured = useCallback((dateKey: string, layout: { x: number; y: number; width: number; height: number }) => {
    cardLayoutsRef.current[dateKey] = layout;
  }, []);

  const handleTaskSaved = useCallback((createdTask: Task) => {
    const currDates = derivedWeekData.slots[1].dates;
    const inCurr = currDates.some((d: Date) => toDateKey(d) === createdTask.date);
    if (inCurr && cardLayoutsRef.current[createdTask.date]) {
      setFlyingTask({ task: createdTask, targetLayout: cardLayoutsRef.current[createdTask.date] });
    }
  }, [derivedWeekData.slots]);

  // ── Layout metrics ──────────────────────────────────────
  const currDates = derivedWeekData.slots[1].dates;
  
  const headerSpace = insets.top + 68;
  const bottomBarSpace = Math.max(insets.bottom + 8, 16) + 60;
  const availableHeight = screenHeight - headerSpace - bottomBarSpace;
  // Month grid uses the same available height as week view
  const monthGridAvailH = availableHeight;
  const collapsedBodyHeight = Math.max(120, Math.floor((availableHeight - 16 - 3 * 31) / 3));
  const expandedBodyHeight = Math.max(70, Math.floor((availableHeight - 24 - 156 - 3 * 31) / 3));
  const expandedSundayHeight = 156;
  const cardGridBottomPadding = bottomBarSpace;
  const title = derivedWeekData.headerTitle;
  const isFutureWeek = derivedWeekData.isFutureWeek;
  const isPastWeek = derivedWeekData.isPastWeek;

  const handleSelectMonthFromYear = useCallback((monthIndex: number, slotYear: number) => {
    isYearAnimatingRef.current = true;

    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setMonth(new Date(slotYear, monthIndex, 1));
    setYear(slotYear);
    setFromYearMode(true);
    setMode('month');

    zoomAnim.setValue(0);
    bottomBarAnim.setValue(0);

    Animated.parallel([
      Animated.spring(zoomAnim, {
        toValue: 1,
        tension: 420,
        friction: 32,
        useNativeDriver: true,
      }),
      Animated.timing(bottomBarAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: false,
      }),
    ]).start(() => {
      isYearAnimatingRef.current = false;
    });
  }, [bottomBarAnim, zoomAnim]);

  const handleBackToYearFromMonth = useCallback(() => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Animated.parallel([
      Animated.spring(zoomAnim, {
        toValue: 0,
        tension: 440,
        friction: 34,
        useNativeDriver: true,
      }),
      Animated.timing(bottomBarAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: false,
      }),
    ]).start(() => {
      setMode('year');
      setFromYearMode(false);
      isYearAnimatingRef.current = false;
    });
  }, [bottomBarAnim, zoomAnim]);

  const selectMode = (nextMode: ViewMode) => {
    collapseWeek();
    setFromYearMode(false);
    zoomAnim.setValue(0);
    bottomBarAnim.setValue(0);
    if (nextMode === 'day') {
      const targetDate = mode === 'month' ? month : derivedWeekData.activeHeaderDate;
      setDayDate(targetDate);
    } else if (nextMode === 'year') {
      const nextYear = mode === 'month' ? month.getFullYear() : derivedWeekData.activeHeaderDate.getFullYear();
      setYear(nextYear);
    }
    setMode(nextMode);
    setModePickerOpen(false);
  };

  // ── Spatial Zoom Calculations ────────────────────────────────────
  const zoomMonthIndex = month.getMonth();
  const zoomCol = zoomMonthIndex % 3;
  const zoomRow = Math.floor(zoomMonthIndex / 3);

  const monthBlockW = (screenWidth - 32 - 20) / 3;
  const monthBlockH = Math.max(110, Math.floor((availableHeight - 3 * 10 - 16) / 4));

  const initialCenterX = 16 + zoomCol * (monthBlockW + 10) + monthBlockW / 2;
  const initialCenterY = headerSpace + 8 + zoomRow * (monthBlockH + 10) + monthBlockH / 2;

  const targetCenterX = screenWidth / 2;
  const targetCenterY = headerSpace + monthGridAvailH / 2;

  const zoomScaleX = zoomAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [monthBlockW / screenWidth, 1],
    extrapolate: 'clamp',
  });
  const zoomScaleY = zoomAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [monthBlockH / Math.max(1, monthGridAvailH), 1],
    extrapolate: 'clamp',
  });
  const zoomTranslateX = zoomAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [initialCenterX - targetCenterX, 0],
    extrapolate: 'clamp',
  });
  const zoomTranslateY = zoomAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [initialCenterY - targetCenterY, 0],
    extrapolate: 'clamp',
  });
  const yearFadeOpacity = zoomAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const yearBackScale = zoomAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.94],
    extrapolate: 'clamp',
  });
  const monthBorderRadius = zoomAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
    extrapolate: 'clamp',
  });

  const resetYearToCurrent = useCallback(() => {
    const currentYear = new Date().getFullYear();
    if (isYearAnimatingRef.current) return;

    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (year === currentYear) {
      yearCarouselAnim.stopAnimation();
      Animated.sequence([
        Animated.timing(yearCarouselAnim, {
          toValue: 10,
          duration: 80,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(yearCarouselAnim, {
          toValue: 0,
          tension: 500,
          friction: 24,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    const startOffset = currentYear > year ? screenWidth : -screenWidth;
    isYearAnimatingRef.current = true;
    yearCarouselAnim.stopAnimation();

    setYear(currentYear);
    requestAnimationFrame(() => {
      yearCarouselAnim.setValue(startOffset);
      Animated.spring(yearCarouselAnim, {
        toValue: 0,
        tension: 450,
        friction: 32,
        useNativeDriver: true,
      }).start(() => {
        isYearAnimatingRef.current = false;
      });
    });
  }, [screenWidth, year, yearCarouselAnim]);

  if (error)
    return (
      <Center>
        <Text style={{ fontSize: 19 }}>Деректер ашылмады</Text>
        <Text style={{ color: colors.secondary }}>{error}</Text>
      </Center>
    );
  if (!ready)
    return (
      <Center>
        <ActivityIndicator color={colors.today} />
        <Text>Жоспар жүктелуде…</Text>
      </Center>
    );

  return (
    <View style={{ flex: 1, backgroundColor: '#18181A' }}>
      <StatusBar style={isMotivationalOpen ? 'light' : 'dark'} animated />
      {/* ── Dark Motivational Header Reveal ────────────────────────── */}
      <Animated.View
        style={{
          overflow: 'hidden',
          maxHeight: motivationalAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 360],
          }),
          opacity: motivationalAnim,
          zIndex: 30,
        }}
      >
        <MotivationalHeader
          tasks={tasks}
          insetsTop={insets.top}
          onClose={closeMotivationalHeader}
          anim={motivationalAnim}
        />
      </Animated.View>

      {/* ── Main Content Sheet ──────────────────────────────── */}
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          borderTopLeftRadius: motivationalAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 32],
          }),
          borderTopRightRadius: motivationalAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 32],
          }),
          borderCurve: 'continuous',
          overflow: 'hidden',
        }}
        {...gestureHandlers}
      >
        {/* ── Header ───────────────────────────────────────────────── */}
        <Animated.View
          style={{
            paddingTop: motivationalAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [insets.top + 8, 16],
            }),
            paddingHorizontal: 16,
            paddingBottom: 4,
            backgroundColor: colors.background,
            zIndex: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {/* Left Title & Metrics Column */}
            <View style={{ flex: 1 }}>
              {mode === 'year' || fromYearMode ? (
                <View style={{ height: screenWidth < 380 ? 38 : 44, justifyContent: 'center' }}>
                  {/* Year Title */}
                  <Animated.View
                    style={{
                      position: 'absolute',
                      left: 0,
                      opacity: fromYearMode
                        ? zoomAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
                        : 1,
                    }}
                    pointerEvents={mode === 'year' && !fromYearMode ? 'auto' : 'none'}
                  >
                    <Pressable onPress={resetYearToCurrent} hitSlop={8}>
                      <AnimatedYearTitle
                        year={year}
                        carouselAnim={yearCarouselAnim}
                        screenWidth={screenWidth}
                        small={screenWidth < 380}
                      />
                    </Pressable>
                  </Animated.View>

                  {/* Month Title */}
                  <Animated.View
                    style={{
                      position: 'absolute',
                      left: 0,
                      opacity: fromYearMode ? zoomAnim : 0,
                    }}
                    pointerEvents={mode === 'month' ? 'auto' : 'none'}
                  >
                    <Pressable onPress={() => setMonthPickerOpen(true)} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Text numberOfLines={1} style={{ fontSize: screenWidth < 380 ? 17 : 19, fontWeight: '700', letterSpacing: -0.4, color: colors.text, fontVariant: ['tabular-nums'] }}>
                        {title}
                      </Text>
                      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                        <Path d="M6 9l6 6 6-6" stroke={colors.secondary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    </Pressable>
                  </Animated.View>
                </View>
              ) : (
                <Pressable onPress={() => setMonthPickerOpen(true)} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Text numberOfLines={1} style={{ fontSize: screenWidth < 380 ? 17 : 19, fontWeight: '700', letterSpacing: -0.4, color: colors.text, fontVariant: ['tabular-nums'] }}>
                    {title}
                  </Text>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Path d="M6 9l6 6 6-6" stroke={colors.secondary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </Pressable>
              )}

            {mode === 'week' && (() => {
              const days = derivedWeekData.currSlotDays;
              const wTasks = days.flatMap((d) => d.tasks);
              const total = wTasks.length;
              const done = wTasks.filter((t) => t.isCompleted).length;

              if (total === 0) {
                return (
                  <Text style={{ fontSize: 13, fontWeight: '500', color: colors.secondary, marginTop: 2 }}>
                    Тапсырма жоқ
                  </Text>
                );
              }

              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: colors.secondary, fontVariant: ['tabular-nums'] }}>
                    {done}/{total} орындалды
                  </Text>
                  {done === total && total > 0 && (
                    <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#E6F9F0', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 9, color: '#059669', fontWeight: '800' }}>✓</Text>
                    </View>
                  )}
                </View>
              );
            })()}
          </View>

          {/* iOS-Grade Unified Pill Controls (View Mode & Settings) */}
          <View
            ref={modeButtonRef}
            collapsable={false}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.inputBg,
              borderRadius: 20,
              padding: 3,
              borderWidth: 1,
              borderColor: colors.inputBorder,
            }}
          >
            {/* View Mode Segment */}
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Режим таңдау"
              onPress={openModePicker}
              activeScale={0.93}
              style={{
                height: 32,
                paddingHorizontal: 10,
                borderRadius: 16,
                backgroundColor: colors.card,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <CalendarIcon color={colors.text} />
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', letterSpacing: -0.2 }}>
                {modeLabels[mode]}
              </Text>
              <SelectorChevronIcon color={colors.secondary} />
            </AnimatedPressable>

            {/* Divider */}
            <View style={{ width: 1, height: 16, backgroundColor: colors.inputBorder, marginHorizontal: 3 }} />

            {/* Settings Segment */}
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Баптаулар"
              onPress={() => { collapseWeek(); router.push('/settings'); }}
              activeScale={0.90}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SettingsIcon color={colors.text} />
            </AnimatedPressable>
          </View>
        </View>
      </Animated.View>

      {/* ── Day / Week / Month / Year Views ──────────────────────────────── */}
      {mode === 'day' ? (
        <View style={{ flex: 1, overflow: 'hidden' }} {...dayGestureHandlers}>
          {([-1, 0, 1] as const).map((offset) => {
            const slotDate = addDays(dayDate, offset);
            const slotKey = toDateKey(slotDate);
            const slotTasks = tasks.filter((t) => t.date === slotKey);
            const baseX = offset * screenWidth;
            const translateX = dayCarouselAnim.interpolate({
              inputRange: [-screenWidth, 0, screenWidth],
              outputRange: [baseX - screenWidth, baseX, baseX + screenWidth],
            });
            const maxDayCardH = Math.max(260, availableHeight - 12);
            const defaultEmptyCardH = Math.round(screenHeight * 0.42);
            const taskContentH = 35 + 16 + (slotTasks.length > 0 ? slotTasks.length * 48 : 80);
            const dayCardH = Math.min(maxDayCardH, Math.max(defaultEmptyCardH, taskContentH));
            return (
              <Animated.View
                key={offset}
                pointerEvents={offset === 0 ? 'auto' : 'none'}
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  paddingHorizontal: 16,
                  transform: [{ translateX }],
                }}
              >
                <DayCard
                  date={slotDate}
                  tasks={slotTasks}
                  wide={true}
                  disableOpen={true}
                  expandedSundayHeight={dayCardH}
                  collapsedBodyHeight={dayCardH - 35}
                  scrollEnabled={!isMotivationalOpen}
                  onScrollYChange={(y) => {
                    if (offset === 0) dayScrollYRef.current = y;
                  }}
                />
              </Animated.View>
            );
          })}
        </View>
      ) : mode === 'week' ? (
        <View style={{ flex: 1, overflow: 'hidden' }}>
          {derivedWeekData.slots.map((slot) => {
            const translateX = carouselAnim.interpolate({
              inputRange: [-screenWidth, 0, screenWidth],
              outputRange: [slot.baseX - screenWidth, slot.baseX, slot.baseX + screenWidth],
            });
            return (
              <Animated.View
                key={slot.slotKey}
                pointerEvents={slot.baseX === 0 ? 'auto' : 'none'}
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  paddingHorizontal: 16,
                  paddingBottom: cardGridBottomPadding,
                  transform: [{ translateX }],
                }}
              >
                <WeekView
                  days={slot.days}
                  progress={weekProgress}
                  collapsedBodyHeight={collapsedBodyHeight}
                  expandedBodyHeight={expandedBodyHeight}
                  expandedSundayHeight={expandedSundayHeight}
                  onLayoutMeasured={slot.baseX === 0 ? handleCardLayoutMeasured : undefined}
                  isSwipingRef={isSwipingRef}
                />
              </Animated.View>
            );
          })}
        </View>
      ) : (
        <View style={{ flex: 1, overflow: 'hidden' }}>
          {/* Year View Background */}
          {(mode === 'year' || fromYearMode) && (
            <Animated.View
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                opacity: fromYearMode ? yearFadeOpacity : 1,
                transform: [{ scale: fromYearMode ? yearBackScale : 1 }],
              }}
              pointerEvents={mode === 'year' ? 'auto' : 'none'}
              {...yearGestureHandlers}
            >
              {([-1, 0, 1] as const).map((offset) => {
                const slotYear = year + offset;
                const baseX = offset * screenWidth;
                const translateX = yearCarouselAnim.interpolate({
                  inputRange: [-screenWidth, 0, screenWidth],
                  outputRange: [baseX - screenWidth, baseX, baseX + screenWidth],
                });
                return (
                  <Animated.View
                    key={slotYear}
                    pointerEvents={offset === 0 ? 'auto' : 'none'}
                    style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      transform: [{ translateX }],
                    }}
                  >
                    <YearView
                      year={slotYear}
                      tasks={tasks}
                      availableHeight={availableHeight}
                      onSelect={(i) => handleSelectMonthFromYear(i, slotYear)}
                      isSwipingRef={isSwipingRef}
                    />
                  </Animated.View>
                );
              })}
            </Animated.View>
          )}

          {/* Month View Foreground with Zoom */}
          {(mode === 'month' || fromYearMode) && (
            <Animated.View
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: '#FFFFFF',
                overflow: 'hidden',
                ...(fromYearMode
                  ? {
                      opacity: zoomAnim,
                      borderRadius: monthBorderRadius,
                      transform: [
                        { translateX: zoomTranslateX },
                        { translateY: zoomTranslateY },
                        { scaleX: zoomScaleX },
                        { scaleY: zoomScaleY },
                      ],
                    }
                  : {}),
              }}
              pointerEvents={mode === 'month' ? 'auto' : 'none'}
              {...monthGestureHandlers}
            >
              {([-1, 0, 1] as const).map((offset) => {
                const slotDate = new Date(month.getFullYear(), month.getMonth() + offset, 1);
                const baseX = offset * screenWidth;
                const translateX = monthCarouselAnim.interpolate({
                  inputRange: [-screenWidth, 0, screenWidth],
                  outputRange: [baseX - screenWidth, baseX, baseX + screenWidth],
                });
                return (
                  <Animated.View
                    key={offset}
                    pointerEvents={offset === 0 ? 'auto' : 'none'}
                    style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      transform: [{ translateX }],
                    }}
                  >
                    <MonthGrid date={slotDate} tasks={tasks} availableHeight={monthGridAvailH} bottomPadding={bottomBarSpace} />
                  </Animated.View>
                );
              })}
            </Animated.View>
          )}
        </View>
      )}

      {/* ── Floating input & Pure White Gradient Overlay ─────────── */}
      {(mode === 'day' || mode === 'week' || mode === 'month' || mode === 'year') && (
        <>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: Math.max(insets.bottom + 8, 16) + 54,
              zIndex: 25,
            }}
          >
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="bottomFadeGradientIndex" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
                  <Stop offset="0.2" stopColor="#FFFFFF" stopOpacity="0.7" />
                  <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity="1" />
                  <Stop offset="1" stopColor="#FFFFFF" stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#bottomFadeGradientIndex)" />
            </Svg>
          </View>

          <View style={{ position: 'absolute', left: 16, right: 16, bottom: Math.max(insets.bottom + 8, 16), zIndex: 30, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {fromYearMode && mode === 'month' && (
              <BackButton
                accessibilityLabel="Жыл режиміне қайту"
                onPress={handleBackToYearFromMonth}
              />
            )}
            <View style={{ flex: 1 }}>
              <BottomTaskInput onInteraction={collapseWeek} onAddTask={() => { collapseWeek(); setShowBottomSheet(true); }} />
            </View>
            {!fromYearMode && (
              ((mode as ViewMode) === 'day' && !isToday(dayDate)) ||
              ((mode as ViewMode) === 'week' && (isFutureWeek || isPastWeek)) ||
              ((mode as ViewMode) === 'month' && !isSameMonth(month, new Date()))
            ) && (
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel="Ағымдағы мезгілге қайту"
                onPress={
                  (mode as ViewMode) === 'day'
                    ? () => setDayDate(new Date())
                    : (mode as ViewMode) === 'month'
                    ? resetToCurrentMonth
                    : resetToCurrentWeek
                }
                activeScale={0.93}
                style={{
                  height: 48,
                  borderRadius: 24,
                  paddingHorizontal: 14,
                  backgroundColor: colors.today,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                }}
              >
                {(((mode as ViewMode) === 'day' && dayDate > new Date()) || ((mode as ViewMode) === 'week' && isFutureWeek) || ((mode as ViewMode) === 'month' && month > new Date())) && (
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                    <Path d="M9 14L4 9l5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M4 9h11a5 5 0 0 1 5 5v2" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                )}
                <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>
                  {`${format(new Date(), 'dd')} ${months[new Date().getMonth()].slice(0, 3)}.`}
                </Text>
                {(((mode as ViewMode) === 'day' && dayDate < new Date()) || ((mode as ViewMode) === 'week' && isPastWeek) || ((mode as ViewMode) === 'month' && month < new Date())) && (
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                    <Path d="M15 14l5-5-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M20 9H9a5 5 0 0 0-5 5v2" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                )}
              </AnimatedPressable>
            )}
          </View>
        </>
      )}
      </Animated.View>

      <TaskBottomSheet visible={showBottomSheet} onClose={() => setShowBottomSheet(false)} onTaskSaved={handleTaskSaved} />
      <FlyingTaskOverlay flyingTask={flyingTask} onComplete={() => setFlyingTask(null)} />
      <MonthPickerModal
        visible={monthPickerOpen}
        currentDate={mode === 'month' ? month : weekStart}
        onSelectMonth={handleMonthPickerSelect}
        onClose={() => setMonthPickerOpen(false)}
      />

      <ViewModeModal
        visible={modePickerOpen}
        currentMode={mode}
        onSelectMode={selectMode}
        onClose={() => setModePickerOpen(false)}
        buttonBounds={modeButtonBounds}
        topOffset={insets.top + 46}
      />
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function FlyingTaskOverlay({ flyingTask, onComplete }: { flyingTask: { task: Task; targetLayout: { x: number; y: number; width: number; height: number } } | null; onComplete: () => void }) {
  const { width: sw, height: sh } = useWindowDimensions();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (flyingTask) {
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 480, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: false }).start(() => {
        onComplete();
        if (Platform.OS === 'ios') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      });
    }
  }, [flyingTask, anim, onComplete]);

  if (!flyingTask) return null;
  const { task, targetLayout } = flyingTask;
  const sx = sw / 2 - 90, sy = sh - 160;
  const tx = targetLayout.x + targetLayout.width / 2 - 90;
  const ty = targetLayout.y + targetLayout.height / 2 - 18;
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, zIndex: 99999, width: 180, opacity: anim.interpolate({ inputRange: [0, 0.08, 0.82, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [sx, tx] }) }, { translateY: anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [sy, Math.min(sy, ty) - 36, ty] }) }, { scale: anim.interpolate({ inputRange: [0, 0.35, 0.8, 1], outputRange: [0.95, 1.05, 0.65, 0.3] }) }, { rotate: anim.interpolate({ inputRange: [0, 0.4, 0.8, 1], outputRange: ['-6deg', '-2deg', '4deg', '0deg'] }) }] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
        <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 2, borderColor: '#9CA3AF' }} />
        <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: '#1F2937', flex: 1 }}>{task.title}</Text>
      </View>
    </Animated.View>
  );
}

function CalendarIcon({ color = colors.text }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="17" rx="3" stroke={color} strokeWidth="2" />
      <Path d="M3 9h18M8 2v4M16 2v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M7 14h2M11 14h2M15 14h2" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function SelectorChevronIcon({ color = colors.today }: { color?: string }) {
  return (
    <Svg width={12} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M7 9l5-5 5 5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 15l5 5 5-5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const WeekView = memo(function WeekViewComponent({ days, progress, onInteraction, collapsedBodyHeight = 138, expandedBodyHeight = 88, expandedSundayHeight = 159, onLayoutMeasured, isSwipingRef }: {
  days: DayDataItem[]; progress: Animated.Value;
  onInteraction?: () => void; collapsedBodyHeight?: number; expandedBodyHeight?: number;
  expandedSundayHeight?: number; onLayoutMeasured?: (dateKey: string, layout: { x: number; y: number; width: number; height: number }) => void;
  isSwipingRef?: React.RefObject<boolean>;
}) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1, gap: 8 }}>
          {days.slice(0, 3).map((day) => (
            <DayCard key={day.dateKey} date={day.date} tasks={day.tasks} monthLabel={day.monthLabel} progress={progress} onInteraction={onInteraction} collapsedBodyHeight={collapsedBodyHeight} expandedBodyHeight={expandedBodyHeight} onLayoutMeasured={onLayoutMeasured} isSwipingRef={isSwipingRef} />
          ))}
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          {days.slice(3, 6).map((day) => (
            <DayCard key={day.dateKey} date={day.date} tasks={day.tasks} monthLabel={day.monthLabel} progress={progress} onInteraction={onInteraction} collapsedBodyHeight={collapsedBodyHeight} expandedBodyHeight={expandedBodyHeight} onLayoutMeasured={onLayoutMeasured} isSwipingRef={isSwipingRef} />
          ))}
        </View>
      </View>
      {days[6] && (
        <DayCard key={days[6].dateKey} date={days[6].date} tasks={days[6].tasks} monthLabel={days[6].monthLabel} wide progress={progress} onInteraction={onInteraction} expandedSundayHeight={expandedSundayHeight} onLayoutMeasured={onLayoutMeasured} isSwipingRef={isSwipingRef} />
      )}
    </View>
  );
});

function BottomTaskInput({ onInteraction, onAddTask }: { onInteraction?: () => void; onAddTask: () => void }) {
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="Жаңа тапсырма қосу"
      onPress={() => { onInteraction?.(); onAddTask(); }}
      activeScale={0.97}
      style={{
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        backgroundColor: colors.inputBg,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 10,
      }}
    >
      <Text style={{ color: colors.inputPlusIcon, fontSize: 20, lineHeight: 22, fontWeight: '300' }}>+</Text>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: colors.inputPlaceholder }}>Тапсырма қосу</Text>
    </AnimatedPressable>
  );
}

const MonthGrid = memo(function MonthGridComponent({
  date,
  tasks,
  availableHeight,
  bottomPadding,
}: {
  date: Date;
  tasks: Task[];
  availableHeight: number;
  bottomPadding: number;
}) {
  const { settings } = usePlanner();
  const firstDay = settings.firstDayOfWeek ?? 'mon';
  const weekStartsOn: 0 | 1 | 6 = firstDay === 'sun' ? 0 : firstDay === 'sat' ? 6 : 1;

  const grid = useMemo(() => getMonthGrid(date, weekStartsOn), [date, weekStartsOn]);
  const todayKey = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return toDateKey(t);
  }, []);

  const taskMap = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    }
    return map;
  }, [tasks]);

  const weeks: Date[][] = useMemo(() => {
    const w: Date[][] = [];
    for (let i = 0; i < grid.length; i += 7) w.push(grid.slice(i, i + 7));
    return w;
  }, [grid]);

  const todayWeekIdx = useMemo(() => {
    return weeks.findIndex((week) =>
      week.some((d) => toDateKey(d) === todayKey)
    );
  }, [weeks, todayKey]);

  const H_PAD = 12;
  const CELL_GAP = 3.5;
  const ROW_GAP = 3.5;
  const DAY_LABEL_H = 26;
  const TOP_PAD = 4;
  const numWeeks = weeks.length;

  const rawCellH = Math.floor(
    (availableHeight - DAY_LABEL_H - ROW_GAP * (numWeeks - 1) - TOP_PAD) / numWeeks
  );
  const cellH = Math.min(86, Math.max(64, rawCellH));

  const DAY_LABELS = useMemo(() => {
    if (firstDay === 'sun') return ['Жс', 'Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб'];
    if (firstDay === 'sat') return ['Сб', 'Жс', 'Дс', 'Сс', 'Ср', 'Бс', 'Жм'];
    return ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс'];
  }, [firstDay]);

  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: H_PAD,
        paddingTop: TOP_PAD,
        paddingBottom: bottomPadding,
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* ── Day-of-week labels */}
      <View style={{ flexDirection: 'row', height: DAY_LABEL_H, alignItems: 'center', marginBottom: 3 }}>
        {DAY_LABELS.map((label, i) => (
          <Text
            key={label}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 0.1,
              color: i >= 5 ? '#FF5959' : '#94A3B8',
            }}
          >
            {label}
          </Text>
        ))}
      </View>

      {/* ── Week rows */}
      <View style={{ gap: ROW_GAP }}>
        {weeks.map((week, weekIdx) => {
          const isCurrentWeek = weekIdx === todayWeekIdx;
          return (
            <View
              key={weekIdx}
              style={[
                { flexDirection: 'row', gap: CELL_GAP },
                isCurrentWeek && {
                  padding: 2,
                  marginHorizontal: -2,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                },
              ]}
            >
              {week.map((day) => {
                const key = toDateKey(day);
                const dt = taskMap[key] || [];
                return (
                  <MonthDayCell
                    key={key}
                    day={day}
                    date={date}
                    dayTasks={dt}
                    cellH={isCurrentWeek ? cellH - 4 : cellH}
                    todayKey={todayKey}
                  />
                );
              })}
            </View>
          );
        })}
      </View>
    </View>
  );
});

const MonthDayCell = memo(function MonthDayCellComponent({
  day,
  date,
  dayTasks,
  cellH,
  todayKey,
}: {
  day: Date;
  date: Date;
  dayTasks: Task[];
  cellH: number;
  todayKey: string;
}) {
  const { openCard } = useCardTransition();
  const cellRef = useRef<View>(null);
  const key = toDateKey(day);
  const isToday = key === todayKey;
  const isOffMonth = !isSameMonth(day, date);
  const isWeekend = day.getDay() === 0 || day.getDay() === 6;

  const maxSlots = Math.max(1, Math.floor((cellH - 26) / 13));
  const hasOverflow = dayTasks.length > maxSlots;
  const visibleCount = hasOverflow ? Math.max(1, maxSlots - 1) : maxSlots;
  const visible = dayTasks.slice(0, visibleCount);
  const overflow = dayTasks.length - visible.length;

  const handlePress = () => {
    if (cellRef.current) {
      cellRef.current.measureInWindow((x, y, w, h) => {
        if (typeof x === 'number' && !isNaN(x) && w > 0 && h > 0 && y > 0) {
          openCard(day, dayTasks, { x, y, width: w, height: h });
        } else {
          openCard(day, dayTasks, { x: 16, y: 120, width: 300, height: 400 });
        }
      });
    } else {
      openCard(day, dayTasks, { x: 16, y: 120, width: 300, height: 400 });
    }
  };

  const cellBg = isToday
    ? '#E5F6FD'
    : isWeekend
    ? isOffMonth
      ? '#FFF8F7'
      : '#FFF3F2'
    : isOffMonth
    ? '#FAFBFC'
    : '#F6F8FA';

  const cellBorderColor = isToday
    ? colors.today
    : isWeekend
    ? '#FFE0DC'
    : '#E8EDF3';

  return (
    <Pressable
      ref={cellRef}
      onPress={handlePress}
      style={{
        flex: 1,
        height: cellH,
        backgroundColor: cellBg,
        borderRadius: 8,
        borderWidth: isToday ? 1.5 : 0.5,
        borderColor: cellBorderColor,
        paddingHorizontal: 4,
        paddingVertical: 4,
        opacity: isOffMonth ? 0.35 : 1,
        overflow: 'hidden',
      }}
    >
      {/* Date number — clean accent only, no circle/pill wrapper */}
      <Text
        style={{
          fontSize: isToday ? 13 : 12,
          fontWeight: isToday ? '800' : '600',
          lineHeight: 16,
          color: isToday ? colors.today : isWeekend ? colors.weekend : '#2D3748',
          fontVariant: ['tabular-nums'],
          textAlign: 'center',
          marginBottom: 2,
        }}
      >
        {day.getDate()}
      </Text>

      {/* Tasks */}
      <View style={{ gap: 1, flex: 1, overflow: 'hidden' }}>
        {visible.map((task) => (
          <Text
            key={task.id}
            numberOfLines={1}
            style={{
              fontSize: 9,
              fontWeight: '400',
              lineHeight: 12,
              color: task.isCompleted ? '#A0AEC0' : '#4A5568',
              textDecorationLine: task.isCompleted ? 'line-through' : 'none',
            }}
          >
            {task.title}
          </Text>
        ))}
        {overflow > 0 && (
          <View
            style={{
              backgroundColor: isToday ? `${colors.today}25` : '#E2E8F0',
              borderRadius: 3.5,
              paddingHorizontal: 3.5,
              paddingVertical: 0.5,
              alignSelf: 'flex-start',
              marginTop: 1,
            }}
          >
            <Text
              style={{
                fontSize: 8.5,
                fontWeight: '700',
                lineHeight: 11,
                color: isToday ? colors.today : '#4A5568',
                fontVariant: ['tabular-nums'],
              }}
            >
              +{overflow}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
});

const YearView = memo(function YearViewComponent({
  year,
  tasks,
  availableHeight,
  onSelect,
  isSwipingRef,
}: {
  year: number;
  tasks: Task[];
  availableHeight: number;
  onSelect: (i: number) => void;
  isSwipingRef?: React.RefObject<boolean>;
}) {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(today), [today]);

  const taskDateSet = useMemo(() => {
    const s = new Set<string>();
    for (let i = 0; i < tasks.length; i++) s.add(tasks[i].date);
    return s;
  }, [tasks]);

  const MONTH_COLS = 3;
  const rows: number[][] = useMemo(() => {
    const r: number[][] = [];
    for (let i = 0; i < 12; i += MONTH_COLS) {
      r.push([i, i + 1, i + 2].filter((x) => x < 12));
    }
    return r;
  }, []);

  const DOW_LABELS = ['Д', 'С', 'С', 'Б', 'Ж', 'С', 'Ж'];
  const monthBlockHeight = Math.max(106, Math.floor((availableHeight - 3 * 8 - 16) / 4));

  return (
    <ScrollView
      scrollEnabled={false}
      style={{ height: availableHeight }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 8, paddingTop: 6 }}
    >
      {rows.map((row) => (
        <View key={row[0]} style={yearStyles.row}>
          {row.map((monthIndex) => {
            const isCurrentMonth =
              today.getFullYear() === year && today.getMonth() === monthIndex;

            // Build grid: 7 columns (Mon–Sun), up to 6 rows
            const firstDay = new Date(year, monthIndex, 1);
            const lastDay = new Date(year, monthIndex + 1, 0);
            const startDow = (firstDay.getDay() + 6) % 7; // 0=Mon
            const totalDays = lastDay.getDate();

            const cells: (number | null)[] = [];
            for (let e = 0; e < startDow; e++) cells.push(null);
            for (let d = 1; d <= totalDays; d++) cells.push(d);
            while (cells.length % 7 !== 0) cells.push(null);

            const weeks: (number | null)[][] = [];
            for (let i = 0; i < cells.length; i += 7) {
              weeks.push(cells.slice(i, i + 7));
            }

            return (
              <Pressable
                key={monthIndex}
                style={[
                  yearStyles.monthBlock,
                  { height: monthBlockHeight },
                  isCurrentMonth && yearStyles.monthBlockActive,
                ]}
                onPress={() => {
                  if (isSwipingRef?.current) return;
                  onSelect(monthIndex);
                }}
              >
                {/* Month name */}
                <Text style={[yearStyles.monthName, isCurrentMonth && yearStyles.monthNameActive]}>
                  {months[monthIndex][0].toUpperCase() + months[monthIndex].slice(1)}
                </Text>

                <View style={yearStyles.dowRow}>
                  {DOW_LABELS.map((d, i) => (
                    <Text
                      key={i}
                      style={[
                        yearStyles.dowLabel,
                        i >= 5 && { color: '#FF7B75' },
                      ]}
                    >
                      {d}
                    </Text>
                  ))}
                </View>

                {/* Weeks */}
                {weeks.map((week, wi) => (
                  <View key={wi} style={yearStyles.weekRow}>
                    {week.map((day, di) => {
                      if (!day) return <View key={di} style={yearStyles.dayCell} />;
                      const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isT = dateKey === todayKey;
                      const hasTasks = taskDateSet.has(dateKey);
                      const isWeekend = di >= 5;
                      return (
                        <View key={di} style={yearStyles.dayCell}>
                          <View style={[
                            yearStyles.dayInner,
                            isT && yearStyles.todayCircle,
                          ]}>
                            <Text style={[
                              yearStyles.dayNum,
                              isT ? yearStyles.todayNum
                              : isWeekend ? { color: '#FF6B6B' }
                              : hasTasks ? { color: colors.today, fontWeight: '700' }
                              : undefined,
                            ]}>
                              {day}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </Pressable>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}, (prev, next) => {
  if (prev.year !== next.year) return false;
  if (prev.availableHeight !== next.availableHeight) return false;
  if (prev.tasks.length !== next.tasks.length) return false;
  for (let i = 0; i < prev.tasks.length; i++) {
    const p = prev.tasks[i];
    const n = next.tasks[i];
    if (p.id !== n.id || p.isCompleted !== n.isCompleted || p.title !== n.title || p.date !== n.date) {
      return false;
    }
  }
  return true;
});

const yearStyles = StyleSheet.create({
  yearTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.today,
    letterSpacing: -1,
    marginBottom: 16,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  monthBlock: {
    flex: 1,
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#D8DEE8',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  monthBlockActive: {
    borderWidth: 1.5,
    borderColor: colors.today,
  },
  monthName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  monthNameActive: {
    color: colors.today,
  },
  dowRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  dowLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 7.5,
    lineHeight: 9,
    fontWeight: '500',
    color: '#8A94A6',
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 0.5,
  },
  dayInner: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: {
    backgroundColor: colors.today,
  },
  dayNum: {
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '500',
    color: '#334155',
    textAlign: 'center',
  },
  todayNum: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});


function Center({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.background, padding: 24 }}>
      {children}
    </View>
  );
}

function AnimatedYearTitle({
  year,
  carouselAnim,
  screenWidth,
  small,
}: {
  year: number;
  carouselAnim: Animated.Value;
  screenWidth: number;
  small: boolean;
}) {
  const fontSize = small ? 32 : 38;
  const lineHeight = small ? 38 : 44;
  const slideOffset = small ? 95 : 115;

  const currentYearText = String(year);
  const nextYearText = String(year + 1);
  const prevYearText = String(year - 1);

  // Current year (center)
  const currentTranslateX = carouselAnim.interpolate({
    inputRange: [-screenWidth, 0, screenWidth],
    outputRange: [-slideOffset, 0, slideOffset],
    extrapolate: 'clamp',
  });
  const currentOpacity = carouselAnim.interpolate({
    inputRange: [-screenWidth, 0, screenWidth],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });

  // Next year (slides in from right during left swipe)
  const nextTranslateX = carouselAnim.interpolate({
    inputRange: [-screenWidth, 0],
    outputRange: [0, slideOffset],
    extrapolate: 'clamp',
  });
  const nextOpacity = carouselAnim.interpolate({
    inputRange: [-screenWidth, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Previous year (slides in from left during right swipe)
  const prevTranslateX = carouselAnim.interpolate({
    inputRange: [0, screenWidth],
    outputRange: [-slideOffset, 0],
    extrapolate: 'clamp',
  });
  const prevOpacity = carouselAnim.interpolate({
    inputRange: [0, screenWidth],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const textStyle = {
    fontSize,
    lineHeight,
    fontWeight: '800' as const,
    letterSpacing: -1.5,
    color: colors.today,
    fontVariant: ['tabular-nums' as const],
  };

  return (
    <View style={{ height: lineHeight, width: slideOffset + 20, justifyContent: 'center' }}>
      {/* Current Year */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          opacity: currentOpacity,
          transform: [{ translateX: currentTranslateX }],
        }}
      >
        <Text numberOfLines={1} style={textStyle}>
          {currentYearText}
        </Text>
      </Animated.View>

      {/* Next Year */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          opacity: nextOpacity,
          transform: [{ translateX: nextTranslateX }],
        }}
      >
        <Text numberOfLines={1} style={textStyle}>
          {nextYearText}
        </Text>
      </Animated.View>

      {/* Previous Year */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          opacity: prevOpacity,
          transform: [{ translateX: prevTranslateX }],
        }}
      >
        <Text numberOfLines={1} style={textStyle}>
          {prevYearText}
        </Text>
      </Animated.View>
    </View>
  );
}
