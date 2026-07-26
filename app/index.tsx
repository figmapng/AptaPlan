import { isToday } from 'date-fns';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import Svg, { Defs, LinearGradient, Mask, Path, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '@/constants/colors';
import { usePlanner } from '@/store/planner-store';
import { useWeek } from '@/hooks/use-week';
import {
  addDays,
  formatWeekRange,
  getMonthGrid,
  isSameMonth,
  months,
  toDateKey,
} from '@/services/date-service';
import { DayCard } from '@/components/day-card';
import { SettingsIcon } from '@/components/settings-icon';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { TaskBottomSheet } from '@/components/TaskBottomSheet';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import type { Task } from '@/types/task';

type ViewMode = 'week' | 'month' | 'year';
const modeLabels: Record<ViewMode, string> = { week: 'Апта', month: 'Ай', year: 'Жыл' };

type SlotIndex = 0 | 1 | 2;

export default function Home() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { ready, error, tasks, loadRange, create } = usePlanner();
  const week = useWeek();
  const weekRef = useRef(week);
  weekRef.current = week;
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const [mode, setMode] = useState<ViewMode>('week');
  const modeRef = useRef<ViewMode>('week');
  modeRef.current = mode;

  const [modePickerOpen, setModePickerOpen] = useState(false);
  const [month, setMonth] = useState(new Date());
  const [year, setYear] = useState(new Date().getFullYear());
  const [showBottomSheet, setShowBottomSheet] = useState(false);

  // ── Three-slot page buffer ──────────────────────────────────────
  const [currSlot, setCurrSlot] = useState<SlotIndex>(1);
  const currSlotRef = useRef<SlotIndex>(1);
  currSlotRef.current = currSlot;

  const [slotDates, setSlotDates] = useState<Date[][]>(() => {
    const cur = week.dates;
    return [
      cur.map((d) => addDays(d, -7)), // slot 0 = prev
      cur,                             // slot 1 = curr
      cur.map((d) => addDays(d, 7)),  // slot 2 = next
    ];
  });
  const slotDatesRef = useRef(slotDates);
  slotDatesRef.current = slotDates;

  const getSlotTasks = useCallback((dates: Date[]) => {
    if (!dates || dates.length === 0) return [];
    const start = toDateKey(dates[0]);
    const end = toDateKey(dates[6]);
    return tasksRef.current.filter((t) => t.date >= start && t.date <= end);
  }, []);

  // ── Animated.Value for carousel translation ──────────────────────
  // Value 0 = resting (no drag). During drag it equals dx.
  const carouselAnim = useRef(new Animated.Value(0)).current;
  const isAnimatingRef = useRef(false);

  // Animated styles for the three slots
  // slot i visual X = (i - currSlot) * screenWidth + carouselAnim
  // But since currSlot changes at the END of animation,
  // we compute the offset live from currSlotRef inside interpolate.
  // We use three separate Animated.Values to keep it simple.
  // Actually, since Animated.Value is shared, we compute each slot offset as:
  //   translateX = (slotBaseOffset[i]) + carouselAnim
  // where slotBaseOffset[i] = (i - currSlot) * screenWidth (static at render time)
  // This re-renders each time currSlot changes which is fine (after animation).

  const getSlotBaseX = (slotIdx: SlotIndex, cur: SlotIndex) => {
    let diff = slotIdx - cur;
    if (diff > 1) diff -= 3;
    if (diff < -1) diff += 3;
    return diff * screenWidth;
  };

  // ── Week expand/collapse ────────────────────────────────────────
  const weekProgress = useRef(new Animated.Value(0)).current;
  const isExpandedRef = useRef(false);
  const userSundayStateRef = useRef<'expanded' | 'collapsed' | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion).catch(() => {});
    const l = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => l.remove();
  }, []);

  useEffect(() => {
    if (ready && week.dates.length > 0) {
      void loadRange(toDateKey(week.dates[0]), toDateKey(week.dates[6]));
      const target =
        userSundayStateRef.current === 'expanded' ? 1
        : userSundayStateRef.current === 'collapsed' ? 0
        : week.dates.length >= 7 && isToday(week.dates[6]) ? 1 : 0;
      isExpandedRef.current = target === 1;
      Animated.timing(weekProgress, { toValue: target, duration: 180, useNativeDriver: false }).start();
    }
  }, [ready, week.dates, loadRange, weekProgress]);

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

  const onSwipeComplete = useCallback((direction: -1 | 1, currentDx: number) => {
    isAnimatingRef.current = true;
    isSwipingRef.current = true;

    if (direction === -1) weekRef.current.next();
    else weekRef.current.previous();

    const prevSlot = currSlotRef.current;
    const nextSlot = ((prevSlot - direction + 3) % 3) as SlotIndex;

    setCurrSlot(nextSlot);
    setSlotDates((old) => {
      const newCurrDates = old[nextSlot];
      const result: Date[][] = [...old];
      result[((nextSlot + 2) % 3) as SlotIndex] = newCurrDates.map((d) => addDays(d, -7));
      result[((nextSlot + 1) % 3) as SlotIndex] = newCurrDates.map((d) => addDays(d, 7));
      return result;
    });

    const startVal = currentDx - (direction * screenWidth);
    carouselAnim.setValue(startVal);

    Animated.spring(carouselAnim, {
      toValue: 0,
      tension: 320,
      friction: 36,
      useNativeDriver: true,
    }).start(() => {
      isAnimatingRef.current = false;
      setTimeout(() => {
        isSwipingRef.current = false;
      }, 50);
    });
  }, [carouselAnim, screenWidth]);

  const gestureHandlers = {
    onTouchStart: (e: { nativeEvent: { pageX: number; pageY: number } }) => {
      if (modeRef.current !== 'week' || isAnimatingRef.current) return;
      touchStartX.current = e.nativeEvent.pageX;
      touchStartY.current = e.nativeEvent.pageY;
      isHorizontalGesture.current = false;
      hasDetermined.current = false;
      isSwipingRef.current = false;
      carouselAnim.stopAnimation();
    },
    onTouchMove: (e: { nativeEvent: { pageX: number; pageY: number } }) => {
      if (modeRef.current !== 'week' || isAnimatingRef.current) return;
      const dx = e.nativeEvent.pageX - touchStartX.current;
      const dy = e.nativeEvent.pageY - touchStartY.current;

      if (!hasDetermined.current) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        isHorizontalGesture.current = Math.abs(dx) > Math.abs(dy) * 1.1;
        hasDetermined.current = true;
      }

      if (isHorizontalGesture.current) {
        isSwipingRef.current = true;
        carouselAnim.setValue(dx);
      } else {
        const startVal = isExpandedRef.current ? 1 : 0;
        const delta = -dy / 160;
        const newVal = Math.max(0, Math.min(1, startVal + delta));
        weekProgress.setValue(newVal);
      }
    },
    onTouchEnd: (e: { nativeEvent: { pageX: number; pageY: number } }) => {
      if (modeRef.current !== 'week' || !hasDetermined.current || isAnimatingRef.current) return;
      if (isHorizontalGesture.current) {
        const dx = e.nativeEvent.pageX - touchStartX.current;
        const threshold = screenWidth * 0.2;

        if (Math.abs(dx) > threshold) {
          const direction = dx < 0 ? -1 : 1;
          onSwipeComplete(direction, dx);
        } else {
          isAnimatingRef.current = true;
          Animated.spring(carouselAnim, {
            toValue: 0,
            tension: 320,
            friction: 36,
            useNativeDriver: true,
          }).start(() => {
            isAnimatingRef.current = false;
            isSwipingRef.current = false;
          });
        }
      } else {
        const dy = e.nativeEvent.pageY - touchStartY.current;
        if (dy < -20) {
          expandWeek();
        } else if (dy > 20) {
          collapseWeek();
        } else {
          if (isExpandedRef.current) expandWeek();
          else collapseWeek();
        }
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
          isSwipingRef.current = false;
        });
      } else {
        isSwipingRef.current = false;
        if (isExpandedRef.current) expandWeek();
        else collapseWeek();
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
    const currDates = slotDatesRef.current[currSlotRef.current];
    const inCurr = currDates.some((d) => toDateKey(d) === createdTask.date);
    if (inCurr && cardLayoutsRef.current[createdTask.date]) {
      setFlyingTask({ task: createdTask, targetLayout: cardLayoutsRef.current[createdTask.date] });
    }
  }, []);

  // ── Layout metrics ───────────────────────────────────────────────
  const bottomInputOffset = Math.max(insets.bottom + 8, 16);
  const cardGridBottomPadding = bottomInputOffset + 48 + 36;
  const maxGridHeight = Math.max(460, screenHeight - (insets.top + 50) - cardGridBottomPadding);
  const collapsedBodyHeight = Math.max(120, Math.floor((maxGridHeight - 16) / 3) - 34);
  const expandedBodyHeight = Math.max(76, Math.floor((maxGridHeight - 24) / 4.3) - 34);
  const expandedSundayHeight = Math.max(124, maxGridHeight - 3 * (34 + expandedBodyHeight) - 24);

  const currDates = slotDates[currSlot] ?? week.dates;
  const title =
    mode === 'week'
      ? formatWeekRange(currDates[0], currDates[6]).replace('–', ' - ')
      : mode === 'month'
      ? `${months[month.getMonth()][0].toUpperCase()}${months[month.getMonth()].slice(1)} ${month.getFullYear()}`
      : `${year} жыл`;

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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header ───────────────────────────────────────────────── */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 4, backgroundColor: colors.background, zIndex: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: screenWidth < 380 ? 22 : 24, fontWeight: '800', letterSpacing: -0.65, color: colors.text, fontVariant: ['tabular-nums'] }}>
              {title}
            </Text>
            {mode === 'week' && (
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.secondary, marginTop: 2 }}>
                {getSlotTasks(currDates).length} тапсырма бар
              </Text>
            )}
          </View>

          <View style={{ position: 'relative', zIndex: 20 }}>
            <AnimatedPressable
              accessibilityRole="button"
              onPress={() => { collapseWeek(); setModePickerOpen((o) => !o); }}
              activeScale={0.94}
              style={{ height: 38, borderRadius: 19, paddingHorizontal: 12, gap: 6, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.control }}
            >
              <CalendarIcon />
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{modeLabels[mode]}</Text>
            </AnimatedPressable>
            {modePickerOpen && (
              <View style={{ position: 'absolute', right: 0, top: 44, width: 126, padding: 4, gap: 2, backgroundColor: colors.card, borderRadius: 14, borderCurve: 'continuous', boxShadow: '0 6px 16px rgba(31,32,38,0.14)' }}>
                {(Object.keys(modeLabels) as ViewMode[]).map((item) => (
                  <AnimatedPressable key={item} accessibilityRole="button" onPress={() => selectMode(item)} activeScale={0.96}
                    style={{ minHeight: 38, borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center', backgroundColor: mode === item ? colors.control : 'transparent' }}>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: mode === item ? '700' : '500' }}>{modeLabels[item]}</Text>
                  </AnimatedPressable>
                ))}
              </View>
            )}
          </View>

          <AnimatedPressable accessibilityRole="button" onPress={() => { collapseWeek(); router.push('/settings'); }} activeScale={0.92}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' }}>
            <SettingsIcon />
          </AnimatedPressable>
        </View>
      </View>

      {/* ── Carousel or Month/Year ──────────────────────────────── */}
      {mode === 'week' ? (
        <View style={{ flex: 1, overflow: 'hidden' }} {...gestureHandlers}>
          {([0, 1, 2] as SlotIndex[]).map((slotIdx) => {
            const baseX = getSlotBaseX(slotIdx, currSlot);
            const translateX = carouselAnim.interpolate({
              inputRange: [-screenWidth, 0, screenWidth],
              outputRange: [baseX - screenWidth, baseX, baseX + screenWidth],
            });
            const dates = slotDates[slotIdx] ?? week.dates;
            return (
              <Animated.View
                key={slotIdx}
                pointerEvents={slotIdx === currSlot ? 'auto' : 'none'}
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  paddingHorizontal: 16,
                  paddingBottom: cardGridBottomPadding,
                  transform: [{ translateX }],
                }}
              >
                <WeekView
                  dates={dates}
                  tasks={getSlotTasks(dates)}
                  progress={weekProgress}
                  onInteraction={collapseWeek}
                  collapsedBodyHeight={collapsedBodyHeight}
                  expandedBodyHeight={expandedBodyHeight}
                  expandedSundayHeight={expandedSundayHeight}
                  onLayoutMeasured={slotIdx === currSlot ? handleCardLayoutMeasured : undefined}
                  isSwipingRef={isSwipingRef}
                />
              </Animated.View>
            );
          })}
        </View>
      ) : (
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 4 }}
        >
          {mode === 'month' ? (
            <MonthView date={month} tasks={tasks} />
          ) : (
            <YearView year={year} tasks={tasks} onSelect={(i) => { setMonth(new Date(year, i, 1)); setMode('month'); }} />
          )}
        </ScrollView>
      )}

      {/* ── Floating input ─────────────────────────────────────── */}
      {mode === 'week' && (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: Math.max(insets.bottom + 8, 16), zIndex: 30 }}>
          <BottomTaskInput onInteraction={collapseWeek} onAddTask={() => { collapseWeek(); setShowBottomSheet(true); }} />
        </View>
      )}

      <TaskBottomSheet visible={showBottomSheet} onClose={() => setShowBottomSheet(false)} onTaskSaved={handleTaskSaved} />
      <FlyingTaskOverlay flyingTask={flyingTask} onComplete={() => setFlyingTask(null)} />
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
      <Rect x="3" y="5" width="18" height="16" rx="3" stroke="#30323A" strokeWidth="1.8" />
      <Path d="M7 3v4M17 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" stroke="#30323A" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function WeekView({ dates, tasks, progress, onInteraction, collapsedBodyHeight = 156, expandedBodyHeight = 98, expandedSundayHeight = 159, onLayoutMeasured, isSwipingRef }: {
  dates: Date[]; tasks: ReturnType<typeof usePlanner>['tasks']; progress: Animated.Value;
  onInteraction?: () => void; collapsedBodyHeight?: number; expandedBodyHeight?: number;
  expandedSundayHeight?: number; onLayoutMeasured?: (dateKey: string, layout: { x: number; y: number; width: number; height: number }) => void;
  isSwipingRef?: React.RefObject<boolean>;
}) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 10, position: 'relative' }}>
        <View style={{ flex: 1, gap: 8 }}>
          {dates.slice(0, 3).map((date) => (
            <DayCard key={toDateKey(date)} date={date} tasks={tasks.filter((t) => t.date === toDateKey(date))} progress={progress} onInteraction={onInteraction} collapsedBodyHeight={collapsedBodyHeight} expandedBodyHeight={expandedBodyHeight} onLayoutMeasured={onLayoutMeasured} isSwipingRef={isSwipingRef} />
          ))}
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          {dates.slice(3, 6).map((date) => (
            <DayCard key={toDateKey(date)} date={date} tasks={tasks.filter((t) => t.date === toDateKey(date))} progress={progress} onInteraction={onInteraction} collapsedBodyHeight={collapsedBodyHeight} expandedBodyHeight={expandedBodyHeight} onLayoutMeasured={onLayoutMeasured} isSwipingRef={isSwipingRef} />
          ))}
        </View>
        <BookSpine progress={progress} collapsedHeight={3 * (collapsedBodyHeight + 34) + 16} expandedHeight={3 * (expandedBodyHeight + 34) + 16} />
      </View>
      <DayCard date={dates[6]} tasks={tasks.filter((t) => t.date === toDateKey(dates[6]))} wide progress={progress} onInteraction={onInteraction} expandedSundayHeight={expandedSundayHeight} onLayoutMeasured={onLayoutMeasured} isSwipingRef={isSwipingRef} />
    </View>
  );
}

function BookSpine({ progress, collapsedHeight = 540, expandedHeight = 382 }: { progress: Animated.Value; collapsedHeight?: number; expandedHeight?: number }) {
  const h = progress ? progress.interpolate({ inputRange: [0, 1], outputRange: [collapsedHeight, expandedHeight] }) : collapsedHeight;
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: '50%', top: 0, width: 12, transform: [{ translateX: -6 }], overflow: 'hidden', height: h }}>
      <Svg width={12} height="100%">
        <Defs>
          <LinearGradient id="bsg" x1="0" y1="0" x2="100%" y2="0">
            <Stop offset="0" stopColor="#C6C8D2" stopOpacity="0" /><Stop offset="0.2" stopColor="#C6C8D2" stopOpacity="0.1" />
            <Stop offset="0.38" stopColor="#A8ACB9" stopOpacity="0.22" /><Stop offset="0.5" stopColor="#858A9A" stopOpacity="0.36" />
            <Stop offset="0.62" stopColor="#A8ACB9" stopOpacity="0.22" /><Stop offset="0.8" stopColor="#C6C8D2" stopOpacity="0.1" />
            <Stop offset="1" stopColor="#C6C8D2" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="bsf" x1="0" y1="0" x2="0" y2="100%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" /><Stop offset="0.06" stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="0.94" stopColor="#FFFFFF" stopOpacity="1" /><Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
          <Mask id="bsm" x="0" y="0" width="100%" height="100%"><Rect width="100%" height="100%" fill="url(#bsf)" /></Mask>
        </Defs>
        <Rect width="12" height="100%" fill="url(#bsg)" mask="url(#bsm)" />
      </Svg>
    </Animated.View>
  );
}

function BottomTaskInput({ onInteraction, onAddTask }: { onInteraction?: () => void; onAddTask: () => void }) {
  return (
    <AnimatedPressable accessibilityRole="button" accessibilityLabel="Жаңа тапсырма қосу" onPress={() => { onInteraction?.(); onAddTask(); }} activeScale={0.97}
      style={{ height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.inputBg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10, marginTop: 10 }}>
      <Text style={{ color: colors.inputPlusIcon, fontSize: 20, lineHeight: 22, fontWeight: '300' }}>+</Text>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: colors.inputPlaceholder }}>Тапсырма қосу</Text>
    </AnimatedPressable>
  );
}

function MonthView({ date, tasks }: { date: Date; tasks: ReturnType<typeof usePlanner>['tasks'] }) {
  const grid = getMonthGrid(date);
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 20, borderCurve: 'continuous', padding: 12, gap: 8 }}>
      <View style={{ flexDirection: 'row' }}>
        {['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс'].map((label, i) => (
          <Text key={label} style={{ flex: 1, textAlign: 'center', fontWeight: '700', color: i > 4 ? colors.weekend : colors.secondary }}>{label}</Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {grid.map((day) => {
          const key = toDateKey(day);
          const dt = tasks.filter((t) => t.date === key);
          const done = dt.filter((t) => t.isCompleted).length;
          return (
            <Pressable key={key} onPress={() => router.push(`/day/${key}`)} style={{ width: '14.285%', minHeight: 68, padding: 4, borderTopWidth: 1, borderColor: colors.divider, opacity: isSameMonth(day, date) ? 1 : 0.35 }}>
              <Text style={{ fontWeight: '700', fontVariant: ['tabular-nums'], color: day.getDay() % 6 === 0 ? colors.weekend : colors.text }}>{day.getDate()}</Text>
              {dt.length > 0 && (<>
                <Text numberOfLines={1} style={{ fontSize: 10, color: colors.secondary, marginTop: 5 }}>{dt.length} тапсырма</Text>
                <View style={{ height: 3, borderRadius: 2, backgroundColor: colors.divider, marginTop: 4 }}>
                  <View style={{ height: 3, borderRadius: 2, width: `${(done / dt.length) * 100}%`, backgroundColor: colors.today }} />
                </View>
              </>)}
            </Pressable>
          );
        })}
      </View>
    </View>
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
