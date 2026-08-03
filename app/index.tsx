import { format, isToday } from 'date-fns';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Mask, Path, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '@/constants/colors';
import { usePlanner } from '@/store/planner-store';
import { useWeek } from '@/hooks/use-week';
import {
  addDays,
  formatWeekRange,
  getMonthGrid,
  getStartOfWeek,
  getWeekDates,
  isSameMonth,
  months,
  toDateKey,
} from '@/services/date-service';
import { DayCard } from '@/components/day-card';
import { SettingsIcon } from '@/components/settings-icon';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { TaskBottomSheet } from '@/components/TaskBottomSheet';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { MotivationalHeader } from '@/components/MotivationalHeader';
import { useCardTransition } from '@/components/card-transition-provider';
import { MonthPickerModal } from '@/components/MonthPickerModal';
import type { Task } from '@/types/task';

type ViewMode = 'week' | 'month' | 'year';
const modeLabels: Record<ViewMode, string> = { week: 'Апта', month: 'Ай', year: 'Жыл' };

type DayDataItem = {
  date: Date;
  dateKey: string;
  tasks: Task[];
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
  const { ready, error, tasks, loadRange, create } = usePlanner();
  const [weekStart, setWeekStart] = useState(() => getStartOfWeek(new Date()));

  const [mode, setMode] = useState<ViewMode>('week');
  const modeRef = useRef<ViewMode>('week');
  modeRef.current = mode;

  const [modePickerOpen, setModePickerOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [month, setMonth] = useState(new Date());
  const [year, setYear] = useState(new Date().getFullYear());
  const [showBottomSheet, setShowBottomSheet] = useState(false);

  const handleMonthPickerSelect = useCallback((selectedDate: Date) => {
    if (modeRef.current === 'week') {
      setWeekStart(getStartOfWeek(selectedDate));
    } else if (modeRef.current === 'month') {
      setMonth(selectedDate);
    } else {
      setMonth(selectedDate);
      setYear(selectedDate.getFullYear());
      setMode('month');
    }
  }, []);

  // ── Month carousel ──────────────────────────────────────────────
  const monthCarouselAnim = useRef(new Animated.Value(0)).current;
  const isMonthAnimatingRef = useRef(false);
  const pendingMonthResetRef = useRef(false);
  const monthTouchStartX = useRef(0);
  const monthTouchStartY = useRef(0);
  const isMonthHorizontal = useRef(false);
  const monthHasDetermined = useRef(false);

  const derivedWeekData = useMemo<DerivedWeekData>(() => {
    const currDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const prevDates = currDates.map((d) => addDays(d, -7));
    const nextDates = currDates.map((d) => addDays(d, 7));

    const buildDays = (datesList: Date[]): DayDataItem[] => {
      return datesList.map((date) => {
        const key = toDateKey(date);
        const dayTasks = tasks.filter((t) => t.date === key);
        return {
          date,
          dateKey: key,
          tasks: dayTasks,
        };
      });
    };

    const activeHeaderDate = currDates.find((d) => isToday(d)) ?? currDates[0];
    const headerTitle =
      mode === 'week'
        ? `${months[activeHeaderDate.getMonth()][0].toUpperCase()}${months[activeHeaderDate.getMonth()].slice(1)} ${activeHeaderDate.getFullYear()}`
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
      activeHeaderDate,
      isFutureWeek,
      isPastWeek,
      currSlotDays,
      slots,
    };
  }, [weekStart, tasks, screenWidth, mode, month, year]);

  // ── Animated.Value for carousel translation ──────────────────────
  const carouselAnim = useRef(new Animated.Value(0)).current;
  const isAnimatingRef = useRef(false);

  // ── Week expand/collapse ────────────────────────────────────────
  const weekProgress = useRef(new Animated.Value(0)).current;
  const isExpandedRef = useRef(false);
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
      tension: 200,
      friction: 20,
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
      tension: 220,
      friction: 22,
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
      void loadRange(toDateKey(dates[0]), toDateKey(dates[6]));
      const target =
        userSundayStateRef.current === 'expanded' ? 1
        : userSundayStateRef.current === 'collapsed' ? 0
        : 1;
      isExpandedRef.current = target === 1;
      Animated.timing(weekProgress, { toValue: target, duration: 180, useNativeDriver: false }).start();
    }
  }, [ready, derivedWeekData.slots, loadRange, weekProgress]);

  // ── Month data load ─────────────────────────────────────────────
  useEffect(() => {
    if (!ready || mode !== 'month') return;
    const from = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 2, 0);
    void loadRange(toDateKey(from), toDateKey(to));
  }, [ready, month, mode, loadRange]);

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

  // ── Touch handlers ───────────────────────────────────────────────
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalGesture = useRef(false);
  const hasDetermined = useRef(false);
  const isSwipingRef = useRef(false);

  const pendingResetRef = useRef(false);

  useEffect(() => {
    if (pendingResetRef.current) {
      const now = Date.now();
      console.log(now, '[ReactCommit] React committed new weekStart data. Resetting carousel position to 0');
      carouselAnim.setValue(0);
      pendingResetRef.current = false;
      isAnimatingRef.current = false;
      setTimeout(() => {
        isSwipingRef.current = false;
      }, 50);
    }
  }, [weekStart, carouselAnim]);

  // ── Month carousel reset ─────────────────────────────────────────
  useEffect(() => {
    if (pendingMonthResetRef.current) {
      monthCarouselAnim.setValue(0);
      pendingMonthResetRef.current = false;
      isMonthAnimatingRef.current = false;
    }
  }, [month, monthCarouselAnim]);

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
      const now = Date.now();
      console.log(now, '[SwipeComplete] Native animation finished. Scheduling setWeekStart');
      pendingResetRef.current = true;
      setWeekStart((d) => addDays(d, -direction * 7));
    });
  }, [carouselAnim, screenWidth]);

  const resetToCurrentWeek = useCallback(() => {
    if (isAnimatingRef.current) return;
    setWeekStart(getStartOfWeek(new Date()));
    carouselAnim.setValue(0);
  }, [carouselAnim]);

  // ── Month swipe complete ─────────────────────────────────────────
  const onMonthSwipeComplete = useCallback((direction: -1 | 1) => {
    isMonthAnimatingRef.current = true;
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

  const monthGestureHandlers = {
    onTouchStart: (e: { nativeEvent: { pageX: number; pageY: number } }) => {
      if (isMonthAnimatingRef.current || isSwipingRef.current) return;
      monthTouchStartX.current = e.nativeEvent.pageX;
      monthTouchStartY.current = e.nativeEvent.pageY;
      isMonthHorizontal.current = false;
      monthHasDetermined.current = false;
      monthCarouselAnim.stopAnimation();
    },
    onTouchMove: (e: { nativeEvent: { pageX: number; pageY: number } }) => {
      if (isMonthAnimatingRef.current || isSwipingRef.current) return;
      const dx = e.nativeEvent.pageX - monthTouchStartX.current;
      const dy = e.nativeEvent.pageY - monthTouchStartY.current;
      if (!monthHasDetermined.current) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        isMonthHorizontal.current = Math.abs(dx) > Math.abs(dy) * 1.2;
        monthHasDetermined.current = true;
      }
      if (isMonthHorizontal.current) {
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
      if (!monthHasDetermined.current || isMonthAnimatingRef.current || isSwipingRef.current) return;
      if (isMonthHorizontal.current) {
        const dx = e.nativeEvent.pageX - monthTouchStartX.current;
        const threshold = screenWidth * 0.1;
        if (Math.abs(dx) > threshold) {
          onMonthSwipeComplete(dx < 0 ? -1 : 1);
        } else {
          isMonthAnimatingRef.current = true;
          Animated.spring(monthCarouselAnim, {
            toValue: 0, tension: 420, friction: 30, useNativeDriver: true,
          }).start(() => { isMonthAnimatingRef.current = false; });
        }
      } else {
        const dy = e.nativeEvent.pageY - monthTouchStartY.current;
        if (isMotivationalOpenRef.current) {
          if (dy < -25) {
            closeMotivationalHeader();
          } else {
            openMotivationalHeader();
          }
        } else {
          if (dy > 35) {
            openMotivationalHeader();
          } else {
            closeMotivationalHeader();
          }
        }
      }
    },
    onTouchCancel: () => {
      if (monthHasDetermined.current && !isSwipingRef.current) {
        if (isMonthHorizontal.current) {
          isMonthAnimatingRef.current = true;
          Animated.spring(monthCarouselAnim, {
            toValue: 0, tension: 320, friction: 36, useNativeDriver: true,
          }).start(() => { isMonthAnimatingRef.current = false; });
        } else {
          if (isMotivationalOpenRef.current) openMotivationalHeader();
          else closeMotivationalHeader();
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
          if (dy < -25) {
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
          if (dy > 40) {
            openMotivationalHeader();
          } else if (dy < -25) {
            expandWeek();
          } else {
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

  const selectMode = (nextMode: ViewMode) => {
    collapseWeek();
    setMode(nextMode);
    setModePickerOpen(false);
  };

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
          opacity: motivationalAnim.interpolate({
            inputRange: [0, 0.15, 1],
            outputRange: [0, 1, 1],
          }),
          transform: [
            {
              translateY: motivationalAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-25, 0],
              }),
            },
          ],
          zIndex: 30,
        }}
      >
        <MotivationalHeader
          tasks={tasks}
          insetsTop={insets.top}
          onClose={closeMotivationalHeader}
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
              <Pressable onPress={() => setMonthPickerOpen(true)} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                {/* Month & Year Title */}
                <Text numberOfLines={1} style={{ fontSize: screenWidth < 380 ? 17 : 19, fontWeight: '700', letterSpacing: -0.4, color: colors.text, fontVariant: ['tabular-nums'] }}>
                  {title}
                </Text>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M6 9l6 6 6-6" stroke={colors.secondary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </Pressable>

            {mode === 'week' && (() => {
              const wTasks = derivedWeekData.currSlotDays.flatMap((d) => d.tasks);
              const total = wTasks.length;
              const done = wTasks.filter((t) => t.isCompleted).length;
              const pending = total - done;

              if (total === 0) {
                return (
                  <Text style={{ fontSize: 13, fontWeight: '500', color: colors.secondary, marginTop: 2 }}>
                    Тапсырма жоқ
                  </Text>
                );
              }

              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 3 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.secondary }}>
                    Осы апта:
                  </Text>

                  {/* Done Count Badge */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                      <Rect x="2" y="2" width="20" height="20" rx="5" fill="#10B981" />
                      <Path d="M7 12l3.5 3.5L17 8" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#059669', fontVariant: ['tabular-nums'] }}>
                      {done}
                    </Text>
                  </View>

                  {/* Pending Count Badge */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                      <Rect x="2.5" y="2.5" width="19" height="19" rx="5" stroke="#9CA3AF" strokeWidth="2.5" />
                    </Svg>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.secondary, fontVariant: ['tabular-nums'] }}>
                      {pending}
                    </Text>
                  </View>
                </View>
              );
            })()}
          </View>

          {/* Toggle: Апта ↔ Ай */}
          <AnimatedPressable
            accessibilityRole="button"
            onPress={() => {
              const next: ViewMode = mode === 'week' ? 'month' : 'week';
              collapseWeek();
              setMode(next);
              setModePickerOpen(false);
            }}
            activeScale={0.94}
            style={{ height: 38, borderRadius: 19, paddingHorizontal: 12, gap: 6, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.control }}
          >
            <CalendarIcon />
            <Text style={{ color: '#333C4E', fontSize: 14, fontWeight: '600' }}>{modeLabels[mode]}</Text>
          </AnimatedPressable>

          <AnimatedPressable accessibilityRole="button" onPress={() => { collapseWeek(); router.push('/settings'); }} activeScale={0.92}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' }}>
            <SettingsIcon />
          </AnimatedPressable>
        </View>
      </Animated.View>

      {/* ── Carousel or Month/Year ──────────────────────────────── */}
      {mode === 'week' ? (
        <View style={{ flex: 1, overflow: 'hidden' }}>
          {derivedWeekData.slots.map((slot) => {
            const translateX = carouselAnim.interpolate({
              inputRange: [-screenWidth, 0, screenWidth],
              outputRange: [slot.baseX - screenWidth, slot.baseX, slot.baseX + screenWidth],
            });
            return (
              <Animated.View
                key={slot.slotKey}
                pointerEvents={slot.id === 1 ? 'auto' : 'none'}
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
                  onInteraction={collapseWeek}
                  collapsedBodyHeight={collapsedBodyHeight}
                  expandedBodyHeight={expandedBodyHeight}
                  expandedSundayHeight={expandedSundayHeight}
                  onLayoutMeasured={slot.id === 1 ? handleCardLayoutMeasured : undefined}
                  isSwipingRef={isSwipingRef}
                />
              </Animated.View>
            );
          })}
        </View>
      ) : mode === 'month' ? (
        <View
          style={{
            flex: 1,
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
          }}
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
        </View>
      ) : (
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 4 }}
        >
          <YearView year={year} tasks={tasks} onSelect={(i) => { setMonth(new Date(year, i, 1)); setMode('month'); }} />
        </ScrollView>
      )}

      {/* ── Floating input ───────────────────────────────────────── */}
      {(mode === 'week' || mode === 'month') && (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: Math.max(insets.bottom + 8, 16), zIndex: 30, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <BottomTaskInput onInteraction={collapseWeek} onAddTask={() => { collapseWeek(); setShowBottomSheet(true); }} />
          </View>
          {(isFutureWeek || isPastWeek) && (
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Бүгінгі күнге қайту"
              onPress={resetToCurrentWeek}
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
                shadowColor: colors.today,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.28,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              {isFutureWeek && (
                <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                  <Path d="M9 14L4 9l5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M4 9h11a5 5 0 0 1 5 5v2" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              )}
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>
                {`${format(new Date(), 'dd')} ${months[new Date().getMonth()].slice(0, 3)}.`}
              </Text>
              {isPastWeek && (
                <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                  <Path d="M15 14l5-5-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M20 9H9a5 5 0 0 0-5 5v2" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              )}
            </AnimatedPressable>
          )}
        </View>
      )}
      </Animated.View>

      <TaskBottomSheet visible={showBottomSheet} onClose={() => setShowBottomSheet(false)} onTaskSaved={handleTaskSaved} />
      <FlyingTaskOverlay flyingTask={flyingTask} onComplete={() => setFlyingTask(null)} />
      <MonthPickerModal
        visible={monthPickerOpen}
        currentDate={mode === 'week' ? derivedWeekData.activeHeaderDate : mode === 'month' ? month : new Date(year, 0, 1)}
        onSelectMonth={handleMonthPickerSelect}
        onClose={() => setMonthPickerOpen(false)}
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

function CalendarIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="5" width="18" height="16" rx="3" stroke="#333C4E" strokeWidth="1.8" />
      <Path d="M7 3v4M17 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" stroke="#333C4E" strokeWidth="1.8" strokeLinecap="round" />
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
            <DayCard key={day.dateKey} date={day.date} tasks={day.tasks} progress={progress} onInteraction={onInteraction} collapsedBodyHeight={collapsedBodyHeight} expandedBodyHeight={expandedBodyHeight} onLayoutMeasured={onLayoutMeasured} isSwipingRef={isSwipingRef} />
          ))}
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          {days.slice(3, 6).map((day) => (
            <DayCard key={day.dateKey} date={day.date} tasks={day.tasks} progress={progress} onInteraction={onInteraction} collapsedBodyHeight={collapsedBodyHeight} expandedBodyHeight={expandedBodyHeight} onLayoutMeasured={onLayoutMeasured} isSwipingRef={isSwipingRef} />
          ))}
        </View>
      </View>
      {days[6] && (
        <DayCard key={days[6].dateKey} date={days[6].date} tasks={days[6].tasks} wide progress={progress} onInteraction={onInteraction} expandedSundayHeight={expandedSundayHeight} onLayoutMeasured={onLayoutMeasured} isSwipingRef={isSwipingRef} />
      )}
    </View>
  );
});

function BottomTaskInput({ onInteraction, onAddTask }: { onInteraction?: () => void; onAddTask: () => void }) {
  return (
    <AnimatedPressable accessibilityRole="button" accessibilityLabel="Жаңа тапсырма қосу" onPress={() => { onInteraction?.(); onAddTask(); }} activeScale={0.97}
      style={{ height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.inputBg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 }}>
      <Text style={{ color: colors.inputPlusIcon, fontSize: 20, lineHeight: 22, fontWeight: '300' }}>+</Text>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: colors.inputPlaceholder }}>Тапсырма қосу</Text>
    </AnimatedPressable>
  );
}

function MonthGrid({
  date,
  tasks,
  availableHeight,
  bottomPadding,
}: {
  date: Date;
  tasks: ReturnType<typeof usePlanner>['tasks'];
  availableHeight: number;
  bottomPadding: number;
}) {
  const grid = getMonthGrid(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toDateKey(today);

  const weeks: Date[][] = [];
  for (let i = 0; i < grid.length; i += 7) weeks.push(grid.slice(i, i + 7));

  const todayWeekIdx = weeks.findIndex((week) =>
    week.some((d) => toDateKey(d) === todayKey)
  );

  const H_PAD = 12;
  const CELL_GAP = 3;
  const ROW_GAP = 4;
  const DAY_LABEL_H = 30;
  const TOP_PAD = 8;
  const numWeeks = weeks.length;

  const rawCellH = Math.floor(
    (availableHeight - DAY_LABEL_H - ROW_GAP * (numWeeks - 1) - TOP_PAD) / numWeeks
  );
  const cellH = Math.min(86, Math.max(64, rawCellH));

  const DAY_LABELS = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс'];

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
      <View style={{ flexDirection: 'row', height: DAY_LABEL_H, alignItems: 'center', marginBottom: 2 }}>
        {DAY_LABELS.map((label, i) => (
          <Text
            key={label}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 0.2,
              color: i >= 5 ? colors.weekend : '#9A9AA0',
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
              style={{
                position: 'relative',
                marginHorizontal: isCurrentWeek ? -4 : 0,
                marginVertical: isCurrentWeek ? 4 : 0,
                paddingHorizontal: isCurrentWeek ? 4 : 0,
              }}
            >
              {/* Current week subtle border */}
              {isCurrentWeek && (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: -5,
                    left: 0,
                    right: 0,
                    bottom: -5,
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: '#01B7FF70',
                    backgroundColor: '#01B7FF06',
                    zIndex: 10,
                  }}
                />
              )}

              {/* Cells row */}
              <View style={{ flexDirection: 'row', gap: CELL_GAP }}>
                {week.map((day) => (
                  <MonthDayCell
                    key={toDateKey(day)}
                    day={day}
                    date={date}
                    tasks={tasks}
                    cellH={cellH}
                    todayKey={todayKey}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function MonthDayCell({
  day,
  date,
  tasks,
  cellH,
  todayKey,
}: {
  day: Date;
  date: Date;
  tasks: Task[];
  cellH: number;
  todayKey: string;
}) {
  const { openCard } = useCardTransition();
  const cellRef = useRef<View>(null);
  const key = toDateKey(day);
  const dt = tasks.filter((t) => t.date === key);
  const isToday = key === todayKey;
  const isOffMonth = !isSameMonth(day, date);
  const isWeekend = day.getDay() === 0 || day.getDay() === 6;

  const maxChips = Math.max(1, Math.floor((cellH - 26) / 15));
  const visible = dt.slice(0, maxChips);
  const overflow = dt.length - maxChips;

  const handlePress = () => {
    if (cellRef.current) {
      cellRef.current.measureInWindow((x, y, w, h) => {
        if (typeof x === 'number' && !isNaN(x) && w > 0 && h > 0 && y > 0) {
          openCard(day, dt, { x, y, width: w, height: h });
        } else {
          openCard(day, dt, { x: 16, y: 120, width: 300, height: 400 });
        }
      });
    } else {
      openCard(day, dt, { x: 16, y: 120, width: 300, height: 400 });
    }
  };

  return (
    <Pressable
      ref={cellRef}
      onPress={handlePress}
      style={{
        flex: 1,
        height: cellH,
        backgroundColor: isToday ? colors.today : '#F6F8FB',
        borderRadius: 10,
        borderWidth: isToday ? 0 : 1,
        borderColor: '#EAEFF5',
        paddingHorizontal: 4,
        paddingVertical: 5,
        opacity: isOffMonth ? 0.3 : 1,
        overflow: 'hidden',
      }}
    >
      {/* Date number */}
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          lineHeight: 18,
          color: isToday ? '#FFFFFF' : isWeekend ? colors.weekend : '#1C1C1E',
          fontVariant: ['tabular-nums'],
          textAlign: 'center',
          marginBottom: 3,
        }}
      >
        {day.getDate()}
      </Text>

      {/* Tasks — plain text, no chip background */}
      <View style={{ gap: 1, flex: 1, overflow: 'hidden' }}>
        {visible.map((task) => (
          <Text
            key={task.id}
            numberOfLines={1}
            style={{
              fontSize: 9.5,
              fontWeight: '500',
              lineHeight: 13,
              color: isToday
                ? 'rgba(255,255,255,0.9)'
                : task.isCompleted
                ? '#ADADB8'
                : '#3A3A3C',
              textDecorationLine: task.isCompleted ? 'line-through' : 'none',
            }}
          >
            {task.title}
          </Text>
        ))}
        {overflow > 0 && (
          <Text
            style={{
              fontSize: 9,
              fontWeight: '600',
              lineHeight: 12,
              color: isToday ? 'rgba(255,255,255,0.6)' : '#ADADB8',
            }}
          >
            +{overflow}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function YearView({ year, tasks, onSelect }: { year: number; tasks: ReturnType<typeof usePlanner>['tasks']; onSelect: (i: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {months.map((m, i) => {
        const prefix = `${year}-${String(i + 1).padStart(2, '0')}`;
        const all = tasks.filter((t) => t.date.startsWith(prefix));
        const done = all.filter((t) => t.isCompleted).length;
        return (
          <Pressable key={m} onPress={() => onSelect(i)} style={{ width: '48%', backgroundColor: 'white', borderRadius: 18, borderCurve: 'continuous', padding: 16, minHeight: 108 }}>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>{m[0].toUpperCase() + m.slice(1)}</Text>
            <Text style={{ color: colors.secondary, marginTop: 14 }}>{all.length} тапсырма</Text>
            <Text style={{ color: colors.todayDark, marginTop: 3 }}>{done} орындалды</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.background, padding: 24 }}>
      {children}
    </View>
  );
}
