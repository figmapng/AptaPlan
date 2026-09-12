import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { addDays, differenceInCalendarDays, format, isToday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { useTheme } from '@/hooks/use-theme';
import { toDateKey } from '@/services/date-service';
import { usePlanner } from '@/store/planner-store';
import { useI18n } from '@/i18n/use-i18n';
import { TaskRow } from './task-row';
import { TaskBottomSheet } from './TaskBottomSheet';
import { TaskPreviewModal } from './TaskPreviewModal';
import { SortableTaskList } from './SortableTaskList';
import { CompactWeekStrip } from './CompactWeekStrip';
import { getDatabase } from '@/database/database';
import { TaskListFrame } from './task-list-frame';
import { AnimatedPressable } from './AnimatedPressable';
import { BackButton } from './BackButton';
import type { Task } from '@/types/task';

type Frame = { x: number; y: number; width: number; height: number };
type Transition = { date: Date; tasks: Task[]; frame: Frame; targetHeight: number; phase: 'opening' | 'closing' };
type ContextValue = {
  openCard: (date: Date, tasks: Task[], frame: Frame) => void;
  closeCard: () => void;
  beginInteractiveClose: () => void;
  updateInteractiveClose: (translationY: number) => void;
  endInteractiveClose: (translationY: number, velocityY: number) => void;
  activeDate: string | null;
  progress: Animated.Value;
  originFrame: Frame | null;
};

const CardTransitionContext = createContext<ContextValue | null>(null);

const isWeekendDay = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

type CarouselCardProps = {
  virtualIndex: number;
  cardDate: Date;
  currentFrame: Frame;
  targetHeight: number;
  progress: Animated.Value;
  carouselX: Animated.Value;
  width: number;
  insets: ReturnType<typeof useSafeAreaInsets>;
  tasks: Task[];
  emptyCardHeight: number;
  maxHeight: number;
  scrollEnabled: boolean;
  handleListLayout: (h: number) => void;
  handleReorder: (newData: Task[], targetDate?: Date) => void;
  handleScrollEnabled: (enabled: boolean) => void;
  isScrollingRef: React.RefObject<boolean>;
  handleTaskListScroll: () => void;
  beginEditing: (task: Task) => void;
  beginAdding: (targetDate?: Date) => void;
  closeCard: () => void;
  handlePendingDelete: (task: Task) => void;
  isTransitionSettled?: boolean;
  headerPanHandlers?: any;
};

const CarouselCard = React.memo(function CarouselCard({
  virtualIndex,
  cardDate,
  currentFrame,
  targetHeight,
  progress,
  carouselX,
  width,
  insets,
  tasks,
  emptyCardHeight,
  maxHeight,
  scrollEnabled,
  pageIndex = 0,
  handleListLayout,
  handleReorder,
  handleScrollEnabled,
  isScrollingRef,
  handleTaskListScroll,
  beginEditing,
  beginAdding,
  closeCard,
  handlePendingDelete,
  isTransitionSettled = true,
  headerPanHandlers,
}: CarouselCardProps & { pageIndex?: number }) {
  const cardKey = useMemo(() => toDateKey(cardDate), [cardDate]);
  const cardTasks = useMemo(() => tasks.filter((t: Task) => t.date === cardKey), [tasks, cardKey]);
  const completedCount = useMemo(() => cardTasks.filter((t: Task) => t.isCompleted).length, [cardTasks]);
  const isTodayCard = isToday(cardDate);
  const isWeekendCard = isWeekendDay(cardDate);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const handleAutoScroll = useCallback((delta: number) => {
    const nextOffset = Math.max(0, scrollYRef.current + delta);
    scrollYRef.current = nextOffset;
    scrollRef.current?.scrollTo({ y: nextOffset, animated: false });
  }, []);

  const [localListHeight, setLocalListHeight] = useState(0);
  const { colors, isDark, theme } = useTheme();
  const { t } = useI18n();
  const cardTaskCount = cardTasks.length;
  const taskListHeight = localListHeight > 0 ? localListHeight : (cardTaskCount > 0 ? cardTaskCount * 48 + 12 : 80);
  const rawCardContentHeight = 44 + 8 + taskListHeight;
  const cardContentHeight = Math.max(emptyCardHeight, rawCardContentHeight);
  const cardTargetHeight = Math.min(maxHeight, cardContentHeight);

  const cardTranslateX = Animated.add(virtualIndex * width, carouselX);
  const isCenter = virtualIndex === pageIndex;
  const isMonthOrigin = currentFrame.width < 100;
  const isWideOrigin = currentFrame.width > width * 0.7;

  const monthCellBg = isTodayCard
    ? colors.tintBg
    : isWeekendCard
    ? (isDark ? '#2A181A' : '#FFF3F2')
    : (isDark ? '#1C222E' : '#F6F8FA');

  const monthCellBorder = isTodayCard
    ? colors.today
    : isWeekendCard
    ? (isDark ? '#4A252A' : '#FFE0DC')
    : (isDark ? '#2C3446' : '#E8EDF3');

  const safeFrameX = typeof currentFrame?.x === 'number' && !isNaN(currentFrame.x) ? currentFrame.x : 16;
  const safeFrameY = typeof currentFrame?.y === 'number' && !isNaN(currentFrame.y) ? currentFrame.y : insets.top + 78;
  const safeFrameW = typeof currentFrame?.width === 'number' && !isNaN(currentFrame.width) && currentFrame.width > 0 ? currentFrame.width : width - 32;
  const safeFrameH = typeof currentFrame?.height === 'number' && !isNaN(currentFrame.height) && currentFrame.height > 0 ? currentFrame.height : 200;

  const closedHeaderHeight = isMonthOrigin ? 0 : 26;
  const closedHeaderPadding = isMonthOrigin ? 4 : 10;
  const closedHeaderFontSize = 12;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [safeFrameX, 16],
            extrapolate: 'clamp',
          }),
          top: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [safeFrameY, insets.top + 78],
            extrapolate: 'clamp',
          }),
          width: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [safeFrameW, width - 32],
            extrapolate: 'clamp',
          }),
          height: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [safeFrameH, cardTargetHeight],
            extrapolate: 'clamp',
          }),
          borderRadius: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [isMonthOrigin ? 8 : 16, 24],
            extrapolate: 'clamp',
          }),
          borderCurve: 'continuous',
          backgroundColor: colors.card,
          borderWidth: isDark ? 1 : 0,
          borderColor: isDark ? colors.cardBorder : 'transparent',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.2 : 0.05,
          shadowRadius: 20,
          elevation: 4,
          opacity: 1,
          zIndex: isCenter ? 9999 : 9998,
          transform: [{ translateX: cardTranslateX }],
        },
      ]}
    >
      {/* Month Cell Mini View (Visible when shrinking back to month grid) */}
      {isMonthOrigin && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 4,
            paddingVertical: 4,
            borderRadius: 8,
            overflow: 'hidden',
            opacity: progress.interpolate({
              inputRange: [0, 0.25, 0.55],
              outputRange: [1, 0.8, 0],
              extrapolate: 'clamp',
            }),
          }}
        >
          <Text
            style={{
              fontSize: isTodayCard ? 13 : 12,
              fontWeight: isTodayCard ? '800' : '600',
              lineHeight: 16,
              color: isTodayCard ? colors.today : isWeekendCard ? colors.weekend : '#2D3748',
              fontVariant: ['tabular-nums'],
              textAlign: 'center',
              marginBottom: 2,
            }}
          >
            {cardDate.getDate()}
          </Text>
          <View style={{ gap: 1, flex: 1, overflow: 'hidden' }}>
            {cardTasks.slice(0, cardTasks.length > 3 ? 2 : 3).map((task) => (
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
            {cardTasks.length > 3 && (
              <View
                style={{
                  backgroundColor: isTodayCard ? `${colors.today}25` : '#E2E8F0',
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
                    color: isTodayCard ? colors.today : '#4A5568',
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  +{cardTasks.length - 2}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}

      <Animated.View
        style={{
          flex: 1,
          borderRadius: 24,
          borderCurve: 'continuous',
          overflow: 'hidden',
          backgroundColor: colors.card,
        }}
      >
        <Animated.View
          {...(headerPanHandlers || {})}
          style={{
            height: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [closedHeaderHeight, 48],
              extrapolate: 'clamp',
            }),
            paddingHorizontal: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [closedHeaderPadding, 16],
              extrapolate: 'clamp',
            }),
            paddingTop: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 14],
              extrapolate: 'clamp',
            }),
            paddingBottom: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 14],
              extrapolate: 'clamp',
            }),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            overflow: 'hidden',
          }}
        >
          {/* Weekday Name, Date and Month: theme accent color only if active (today), otherwise inactive card color */}
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: isTodayCard ? colors.today : isDark ? colors.text : '#31383E',
              letterSpacing: -0.2,
            }}
          >
            {`${(t.date.weekdays[cardDate.getDay()] ?? '').toUpperCase()} • ${format(cardDate, 'd')} ${t.date.monthsShort[cardDate.getMonth()] ?? ''}`}
          </Text>

          {/* Progress fraction e.g. 1/4 */}
          <Animated.View
            style={{
              marginLeft: 'auto',
              flexDirection: 'row',
              alignItems: 'center',
              flexShrink: 0,
              opacity: progress,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                color: isDark ? '#8E8E93' : '#9CA3AF',
                fontVariant: ['tabular-nums'],
              }}
            >
              <Text style={{ fontWeight: '600', color: isDark ? colors.text : '#31383E' }}>
                {completedCount}
              </Text>
              /{cardTasks.length}
            </Text>
          </Animated.View>
        </Animated.View>

        {/* Divider line under header in opened card (matches Figma design) */}
        <Animated.View
          style={{
            height: 1,
            backgroundColor: isDark ? colors.cardBorder : '#EDEEF1',
            marginHorizontal: 16,
            marginTop: 0,
            marginBottom: 4,
            opacity: progress,
          }}
        />

        <Animated.View
          style={{
            flex: 1,
            paddingHorizontal: 0,
            backgroundColor: colors.card,
            overflow: 'hidden',
            opacity: 1,
            paddingTop: 0,
          }}
        >
          {/* 1. Compact Grid Replica Layer (matches DayCard 100% during close) */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              paddingHorizontal: 8,
              paddingTop: 6,
              paddingBottom: 6,
              opacity: progress.interpolate({
                inputRange: [0, 0.25, 0.5],
                outputRange: [1, 0.3, 0],
                extrapolate: 'clamp',
              }),
            }}
          >
            {cardTasks.length ? (
              <TaskListFrame
                tasks={cardTasks.slice(0, 6)}
                singleLine
                onPress={() => {}}
              />
            ) : (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 1,
                }}
              >
                <View
                  style={{
                    width: 16,
                    height: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M12 4v16M4 12h16"
                      stroke={colors.secondary}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
                <Text style={{ color: colors.secondary, fontSize: 12, lineHeight: 17, fontWeight: '400' }}>
                  {t.common.addTask}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* 2. Full Interactive ScrollView Layer */}
          <Animated.View
            style={{
              flex: 1,
              opacity: progress.interpolate({
                inputRange: [0.05, 0.45, 1],
                outputRange: [0, 0.8, 1],
                extrapolate: 'clamp',
              }),
            }}
          >
            <ScrollView
              ref={scrollRef}
              scrollEnabled={scrollEnabled}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              bounces={true}
              alwaysBounceVertical={true}
              onScroll={(e) => {
                handleTaskListScroll();
                scrollYRef.current = e.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
              contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 16 }}
            >
              {cardTasks.length ? (
                <View
                  onLayout={(e) => {
                    const h = e.nativeEvent.layout.height;
                    setLocalListHeight((prev) => (Math.abs(prev - h) > 8 ? h : prev));
                    if (isCenter) handleListLayout(h);
                  }}
                >
                  <SortableTaskList
                    data={cardTasks}
                    keyExtractor={(task) => `${task.id}:${task.date}`}
                    onReorder={(newData) => void handleReorder(newData, cardDate)}
                    onScrollEnabledChange={handleScrollEnabled}
                    onAutoScroll={handleAutoScroll}
                    isScrollingRef={isScrollingRef}
                    gap={0}
                    renderItem={(
                      task,
                      isActive,
                      index,
                      totalCount,
                      onSwipeX,
                      onScrollEnabledChangeItem
                    ) => (
                      <TaskRow
                        task={task}
                        isLast={index === totalCount - 1}
                        onPress={() => beginEditing(task)}
                        onPendingDelete={handlePendingDelete}
                        isActive={isActive}
                        onSwipeX={onSwipeX}
                        onScrollEnabledChange={onScrollEnabledChangeItem}
                        cardBg="#FFFFFF"
                        cardSurface
                      />
                    )}
                  />
                </View>
              ) : (
                <Pressable
                  onPress={() => beginAdding(cardDate)}
                  style={{
                    minHeight: Math.max(140, targetHeight - 120),
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: colors.secondary,
                      fontSize: 16,
                      fontWeight: '500',
                      textAlign: 'center',
                    }}
                  >
                    {t.common.noTasks}
                  </Text>
                </Pressable>
              )}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
});

export function CardTransitionProvider({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { tasks, settings, loadRange, remove } = usePlanner();
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  const progress = useRef(new Animated.Value(0)).current;

  const origin = useRef<Omit<Transition, 'phase'> | null>(null);
  const transitionRef = useRef<Transition | null>(null);
  const [transition, setTransition] = useState<Transition | null>(null);
  const [isTransitionSettled, setIsTransitionSettled] = useState(false);

  const [pageIndex, setPageIndex] = useState(0);
  const pageIndexRef = useRef(0);
  const [jumpTargetIndex, setJumpTargetIndex] = useState<number | null>(null);

  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addingDate, setAddingDate] = useState<Date | null>(null);
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<Task | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const isScrollingRef = useRef(false);
  const scrollResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [measuredListHeight, setMeasuredListHeight] = useState<number>(0);
  const isAnimatingRef = useRef(false);

  const carouselX = useRef(new Animated.Value(0)).current;

  const handleListLayout = useCallback((h: number) => {
    if (isAnimatingRef.current) return;
    setMeasuredListHeight((prev) => (Math.abs(prev - h) > 8 ? h : prev));
  }, []);

  const activeCardDate = useMemo(() => {
    if (!transition?.date) return new Date();
    return addDays(transition.date, pageIndex);
  }, [transition?.date, pageIndex]);

  const renderedIndices = useMemo(() => {
    if (!isTransitionSettled) return [0];
    const set = new Set<number>([pageIndex - 1, pageIndex, pageIndex + 1]);
    if (jumpTargetIndex !== null) {
      const min = Math.min(pageIndex, jumpTargetIndex);
      const max = Math.max(pageIndex, jumpTargetIndex);
      for (let i = min - 1; i <= max + 1; i++) {
        set.add(i);
      }
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [isTransitionSettled, pageIndex, jumpTargetIndex]);

  const activeDateKey = toDateKey(activeCardDate);
  const activeDayTasks = tasks.filter((t) => t.date === activeDateKey);
  const taskCount = activeDayTasks.length;
  const emptyCardHeight = Math.round(height * 0.48);
  const rawContentHeight = 52 + 16 + (measuredListHeight > 0 ? measuredListHeight : (taskCount > 0 ? taskCount * 56 : 80));
  const contentHeight = Math.max(emptyCardHeight, rawContentHeight);
  const openedCardTop = insets.top + 78;
  const bottomBarSpace = Math.max(insets.bottom + 8, 16) + 48 + 16;
  const maxHeight = height - openedCardTop - bottomBarSpace;
  const targetHeight = Math.min(maxHeight, contentHeight);

  const scrollEnabledRef = useRef(true);
  const handleScrollEnabled = useCallback((enabled: boolean) => {
    scrollEnabledRef.current = enabled;
    setScrollEnabled(enabled);
  }, []);

  const handleTaskListScroll = useCallback(() => {
    isScrollingRef.current = true;
    if (scrollResetTimerRef.current) clearTimeout(scrollResetTimerRef.current);
    scrollResetTimerRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      scrollResetTimerRef.current = null;
    }, 120);
  }, []);

  const handleAutoScroll = useCallback((delta: number) => {
  }, []);

  const handlePendingDelete = (task: Task) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setPendingDeleteTask(task);
    undoTimerRef.current = setTimeout(() => {
      void remove(task.id);
      setPendingDeleteTask(null);
    }, 4000);
  };

  const handleUndo = async () => {
    if (settings.haptics && Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setPendingDeleteTask(null);
  };

  const handleReorder = useCallback(
    async (newData: Task[], targetDate?: Date) => {
      const dateKey = toDateKey(targetDate ?? activeCardDate);
      const db = await getDatabase();
      const updatedAt = new Date().toISOString();

      await db.withTransactionAsync(async () => {
        for (let i = 0; i < newData.length; i++) {
          await db.runAsync(
            'UPDATE tasks SET sortOrder=?, updatedAt=? WHERE id=?',
            i,
            updatedAt,
            newData[i].id
          );
        }
      });
      await loadRange(dateKey, dateKey);
    },
    [activeCardDate, loadRange]
  );

  const cleanupClose = () => {
    origin.current = null;
    transitionRef.current = null;
    setTransition(null);
    setIsTransitionSettled(false);
    setPageIndex(0);
    pageIndexRef.current = 0;
    setJumpTargetIndex(null);
    carouselX.setValue(0);
    isAnimatingRef.current = false;
  };

  const openCard = (date: Date, cardTasks: Task[], frame: Frame) => {
    if (transitionRef.current) {
      if (transitionRef.current.phase === 'opening') return;
      cleanupClose();
    }
    progress.stopAnimation();
    carouselX.stopAnimation();
    isAnimatingRef.current = true;
    setIsTransitionSettled(false);
    const calcTaskCount = cardTasks.length;
    const calcContentHeight = Math.max(emptyCardHeight, 52 + 16 + calcTaskCount * 56 + 60);
    const calcTargetHeight = Math.min(maxHeight, calcContentHeight);
    const frameSnapshot = Object.freeze({
      x: typeof frame?.x === 'number' && !isNaN(frame.x) ? frame.x : 16,
      y: typeof frame?.y === 'number' && !isNaN(frame.y) ? frame.y : insets.top + 78,
      width: typeof frame?.width === 'number' && !isNaN(frame.width) && frame.width > 0 ? frame.width : width - 32,
      height: typeof frame?.height === 'number' && !isNaN(frame.height) && frame.height > 0 ? frame.height : 200,
    });

    const next = { date, tasks: cardTasks, frame: frameSnapshot, targetHeight: calcTargetHeight };
    origin.current = next;
    transitionRef.current = { ...next, phase: 'opening' };
    setMeasuredListHeight(cardTasks.length * 48);
    setPageIndex(0);
    pageIndexRef.current = 0;
    setJumpTargetIndex(null);
    carouselX.setValue(0);
    setTransition(transitionRef.current);

    progress.setValue(0);
    Animated.spring(progress, {
      toValue: 1,
      damping: 28,
      stiffness: 320,
      mass: 0.7,
      useNativeDriver: false,
    }).start(() => {
      isAnimatingRef.current = false;
      setIsTransitionSettled(true);
    });
  };

  const closeCard = () => {
    if (!origin.current) {
      cleanupClose();
      return;
    }
    isAnimatingRef.current = true;
    setIsTransitionSettled(false);
    transitionRef.current = { ...origin.current, phase: 'closing' };

    Animated.timing(progress, {
      toValue: 0,
      duration: 230,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start(() => {
      isAnimatingRef.current = false;
      cleanupClose();
    });
  };

  const beginInteractiveClose = () => {
    if (!origin.current) return;
    transitionRef.current = { ...origin.current, phase: 'closing' };
    setTransition(transitionRef.current);
    progress.setValue(1);
  };

  const updateInteractiveClose = (translationY: number) => {
    if (!origin.current || !transitionRef.current || translationY <= 0) return;
    const cardProgress = Math.max(0, Math.min(1, 1 - translationY / 280));
    progress.setValue(cardProgress);
  };

  const endInteractiveClose = (translationY: number, velocityY: number) => {
    if (!origin.current || !transitionRef.current) return;
    if (translationY > 80 || velocityY > 0.5) {
      closeCard();
      return;
    }
    Animated.spring(progress, {
      toValue: 1,
      stiffness: 320,
      damping: 28,
      mass: 0.8,
      useNativeDriver: false,
    }).start();
  };

  const carouselPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        if (!scrollEnabledRef.current || isAnimatingRef.current) return false;
        return Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
      },
      onMoveShouldSetPanResponderCapture: (_, gesture) => {
        if (!scrollEnabledRef.current || isAnimatingRef.current) return false;
        return Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
      },
      onPanResponderGrant: () => {
        carouselX.stopAnimation();
      },
      onPanResponderMove: (_, gesture) => {
        if (!scrollEnabledRef.current || isAnimatingRef.current) return;
        carouselX.setValue(-pageIndexRef.current * width + gesture.dx);
      },
      onPanResponderRelease: (_, gesture) => {
        if (!scrollEnabledRef.current || isAnimatingRef.current) return;
        const threshold = 40;
        const velocity = gesture.vx;

        let targetIndex = pageIndexRef.current;
        if (gesture.dx < -threshold || velocity < -0.2) {
          targetIndex = pageIndexRef.current + 1;
        } else if (gesture.dx > threshold || velocity > 0.2) {
          targetIndex = pageIndexRef.current - 1;
        }

        if (targetIndex !== pageIndexRef.current && settings.haptics && Platform.OS === 'ios') {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        isAnimatingRef.current = true;
        if (targetIndex !== pageIndexRef.current) {
          setJumpTargetIndex(targetIndex);
          pageIndexRef.current = targetIndex;
          setPageIndex(targetIndex);
        }

        Animated.spring(carouselX, {
          toValue: -targetIndex * width,
          tension: 300,
          friction: 28,
          useNativeDriver: false,
        }).start(() => {
          if (transitionRef.current?.date) {
            const fromKey = toDateKey(addDays(transitionRef.current.date, targetIndex - 2));
            const toKey = toDateKey(addDays(transitionRef.current.date, targetIndex + 2));
            void loadRange(fromKey, toKey);
          }
          setJumpTargetIndex(null);
          isAnimatingRef.current = false;
        });
      },
      onPanResponderTerminate: () => {
        isAnimatingRef.current = true;
        Animated.spring(carouselX, {
          toValue: -pageIndexRef.current * width,
          tension: 300,
          friction: 28,
          useNativeDriver: false,
        }).start(() => {
          isAnimatingRef.current = false;
        });
      },
    })
  ).current;

  const beginAdding = (targetDate?: Date) => {
    setEditingTask(null);
    setAddingDate(targetDate ?? activeCardDate);
    setShowBottomSheet(true);
  };

  const beginEditing = (task: Task) => {
    setEditingTask(task);
    setAddingDate(null);
    setShowBottomSheet(true);
  };

  const value: ContextValue = {
    openCard,
    closeCard,
    beginInteractiveClose,
    updateInteractiveClose,
    endInteractiveClose,
    activeDate: transition ? activeDateKey : null,
    progress,
    originFrame: transition?.frame ?? null,
  };

  const current = transition;

  return (
    <CardTransitionContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        <Animated.View
          style={{
            flex: 1,
            opacity: progress.interpolate({
              inputRange: [0, 0.75, 1],
              outputRange: [1, 0.6, 0],
              extrapolate: 'clamp',
            }),
          }}
        >
          {children}
        </Animated.View>

        {current && (
          <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}>
            <Pressable onPress={closeCard} style={[StyleSheet.absoluteFill, { zIndex: 1 }]}>
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: colors.background,
                    opacity: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.9],
                      extrapolate: 'clamp',
                    }),
                  },
                ]}
              />
            </Pressable>

            <View
              pointerEvents="box-none"
              style={[StyleSheet.absoluteFill, { zIndex: 2 }]}
              {...carouselPanResponder.panHandlers}
            >
              {renderedIndices.map((virtualIndex) => {
                const cardDate = addDays(current.date, virtualIndex);
                const cardKey = toDateKey(cardDate);

                return (
                  <CarouselCard
                    key={cardKey}
                    virtualIndex={virtualIndex}
                    pageIndex={pageIndex}
                    cardDate={cardDate}
                    currentFrame={current.frame}
                    targetHeight={targetHeight}
                    progress={progress}
                    carouselX={carouselX}
                    width={width}
                    insets={insets}
                    tasks={tasks}
                    emptyCardHeight={emptyCardHeight}
                    maxHeight={maxHeight}
                    scrollEnabled={scrollEnabled}
                    handleListLayout={handleListLayout}
                    handleReorder={handleReorder}
                    handleScrollEnabled={handleScrollEnabled}
                    isScrollingRef={isScrollingRef}
                    handleTaskListScroll={handleTaskListScroll}
                    beginEditing={(task) => setPreviewTask(task)}
                    beginAdding={beginAdding}
                    closeCard={closeCard}
                    handlePendingDelete={handlePendingDelete}
                    isTransitionSettled={isTransitionSettled}
                    headerPanHandlers={carouselPanResponder.panHandlers}
                  />
                );
              })}
            </View>

          {/* Top Compact Week Strip placed directly above the open card */}
          <Animated.View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              top: insets.top + 8,
              left: 0,
              right: 0,
              zIndex: 10001,
              opacity: progress.interpolate({
                inputRange: [0.5, 1],
                outputRange: [0, 1],
              }),
            }}
          >
            <CompactWeekStrip
              selectedDate={activeCardDate}
              originDate={current.date}
              carouselX={carouselX}
              screenWidth={width}
              pageIndex={pageIndex}
              onSelectDate={(targetDate) => {
                if (isAnimatingRef.current) return;
                const diff = differenceInCalendarDays(targetDate, current.date);
                const newIndex = diff;
                if (newIndex === pageIndexRef.current) return;

                if (settings.haptics && Platform.OS === 'ios') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }

                isAnimatingRef.current = true;
                setJumpTargetIndex(newIndex);

                Animated.spring(carouselX, {
                  toValue: -newIndex * width,
                  tension: 300,
                  friction: 28,
                  useNativeDriver: false,
                }).start(() => {
                  pageIndexRef.current = newIndex;
                  setPageIndex(newIndex);
                  const fromKey = toDateKey(addDays(current.date, newIndex - 2));
                  const toKey = toDateKey(addDays(current.date, newIndex + 2));
                  void loadRange(fromKey, toKey);
                  setJumpTargetIndex(null);
                  isAnimatingRef.current = false;
                });
              }}
            />
          </Animated.View>

            <Animated.View
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                left: 16,
                right: 16,
                bottom: Math.max(insets.bottom + 8, 16),
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                zIndex: 10001,
                elevation: 12,
                opacity: progress.interpolate({
                  inputRange: [0.3, 1],
                  outputRange: [0, 1],
                }),
              }}
            >
              <BackButton onPress={closeCard} />

              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={t.common.addTask}
                onPress={() => beginAdding(activeCardDate)}
                activeScale={0.97}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 24,
                  borderWidth: isDark ? 1 : 0,
                  borderColor: isDark ? colors.cardBorder : 'transparent',
                  backgroundColor: colors.card,
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDark ? 0.2 : 0.06,
                  shadowRadius: 10,
                  elevation: 3,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  gap: 10,
                }}
              >
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 4.5v15M4.5 12h15"
                    stroke={isDark ? '#7E8B9F' : '#9CA3AF'}
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: isDark ? '#7E8B9F' : '#9CA3AF' }}>
                  {t.common.addTask}
                </Text>
              </AnimatedPressable>
            </Animated.View>

            {pendingDeleteTask && (
              <Animated.View
                pointerEvents="box-none"
                style={{
                  position: 'absolute',
                  left: 16,
                  right: 16,
                  bottom: Math.max(insets.bottom + 12, 24),
                  zIndex: 10000,
                  elevation: 12,
                }}
              >
                <View
                  style={{
                    backgroundColor: '#1E293B',
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      color: '#F8FAFC',
                      fontSize: 14,
                      fontWeight: '500',
                      flex: 1,
                      marginRight: 12,
                    }}
                  >
                    {t.alerts.taskDeleted}
                  </Text>
                  <Pressable
                    onPress={handleUndo}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      borderRadius: 8,
                    })}
                  >
                    <Text
                      style={{
                        color: colors.today,
                        fontSize: 14,
                        fontWeight: '700',
                      }}
                    >
                      {t.common.undo}
                    </Text>
                  </Pressable>
                </View>
              </Animated.View>
            )}
          </View>
        )}

        {/* Task Preview Modal with Bottom Action Toolbar */}
        <TaskPreviewModal
          visible={!!previewTask}
          task={previewTask}
          onClose={() => setPreviewTask(null)}
          onEdit={(t) => {
            setPreviewTask(null);
            beginEditing(t);
          }}
          onDelete={(t) => {
            setPreviewTask(null);
            handlePendingDelete(t);
          }}
        />

        {/* Task BottomSheet for Adding / Editing */}
        <TaskBottomSheet
          visible={showBottomSheet}
          onClose={() => {
            setShowBottomSheet(false);
            setEditingTask(null);
            setAddingDate(null);
          }}
          initialDate={addingDate ? toDateKey(addingDate) : editingTask?.date}
          editingTask={editingTask}
        />
      </View>
    </CardTransitionContext.Provider>
  );
}

const fallbackProgress = new Animated.Value(0);

const fallbackContext: ContextValue = {
  openCard: () => {},
  closeCard: () => {},
  beginInteractiveClose: () => {},
  updateInteractiveClose: () => {},
  endInteractiveClose: () => {},
  activeDate: null,
  progress: fallbackProgress,
  originFrame: null,
};

export function useCardTransition() {
  const ctx = useContext(CardTransitionContext);
  return ctx || fallbackContext;
}
