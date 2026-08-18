import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { addDays, format, isToday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { months, toDateKey, weekdays } from '@/services/date-service';
import { usePlanner } from '@/store/planner-store';
import { TaskRow } from './task-row';
import { TaskBottomSheet } from './TaskBottomSheet';
import { TaskPreviewModal } from './TaskPreviewModal';
import { SortableTaskList } from './SortableTaskList';
import { CompactWeekStrip } from './CompactWeekStrip';
import { getDatabase } from '@/database/database';
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
  handleReorder: (newData: Task[]) => void;
  handleScrollEnabled: (enabled: boolean) => void;
  isScrollingRef: React.RefObject<boolean>;
  handleTaskListScroll: () => void;
  beginEditing: (task: Task) => void;
  beginAdding: (targetDate?: Date) => void;
  closeCard: () => void;
  handlePendingDelete: (task: Task) => void;
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
  handleListLayout,
  handleReorder,
  handleScrollEnabled,
  isScrollingRef,
  handleTaskListScroll,
  beginEditing,
  beginAdding,
  closeCard,
  handlePendingDelete,
}: CarouselCardProps) {
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
  const cardTaskCount = cardTasks.length;
  const taskListHeight = localListHeight > 0 ? localListHeight : (cardTaskCount > 0 ? cardTaskCount * 48 + 12 : 80);
  const rawCardContentHeight = 44 + 8 + taskListHeight;
  const cardContentHeight = Math.max(emptyCardHeight, rawCardContentHeight);
  const cardTargetHeight = Math.min(maxHeight, cardContentHeight);

  const cardTranslateX = Animated.add(virtualIndex * width, carouselX);
  const isCenter = virtualIndex === 0;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [currentFrame.x, 16],
          }),
          top: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [currentFrame.y, insets.top + 62],
          }),
          width: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [currentFrame.width, width - 32],
          }),
          height: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [currentFrame.height, cardTargetHeight],
          }),
          borderRadius: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [14, 16],
          }),
          backgroundColor: isTodayCard ? '#01B7FF' : isWeekendCard ? '#FFE5E2' : '#EDEFF2',
          zIndex: isCenter ? 9999 : 9998,
          transform: [{ translateX: cardTranslateX }],
        },
      ]}
    >
      <View
        style={{
          flex: 1,
          borderRadius: 16,
          borderCurve: 'continuous',
          overflow: 'hidden',
          backgroundColor: isTodayCard ? '#01B7FF' : isWeekendCard ? '#FFE5E2' : '#EDEFF2',
        }}
      >
        <Animated.View
          style={{
            height: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [29, 44],
            }),
            paddingHorizontal: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [10, 14],
            }),
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {/* Weekday Name */}
          <Animated.Text
            style={{
              fontSize: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 17],
              }),
              fontWeight: '600',
              color: isTodayCard ? '#FFFFFF' : isWeekendCard ? colors.sundayText : '#333C4E',
            }}
          >
            {(weekdays[cardDate.getDay()] ?? '').toUpperCase()}
          </Animated.Text>

          {/* Outer badge */}
          <Animated.View
            style={{
              marginLeft: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [6, 8],
              }),
              minWidth: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 24],
              }),
              minHeight: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [17, 21],
              }),
              paddingHorizontal: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [4, 8],
              }),
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isTodayCard
                ? '#FFFFFF'
                : isWeekendCard
                ? colors.weekendNumBg
                : colors.dateNumBg,
              borderRadius: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [5, 6],
              }),
              paddingTop: 0,
              paddingBottom: 0,
            }}
          >
            {/* Inner frame */}
            <Animated.View
              style={{
                alignSelf: 'stretch',
                flexDirection: 'row',
                borderRadius: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [4, 5],
                }),
                paddingHorizontal: 0,
                paddingVertical: 0,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isTodayCard
                  ? '#FFFFFF'
                  : isWeekendCard
                  ? colors.weekendNumBg
                  : colors.dateNumBg,
              }}
            >
              {/* Day number (visible when closed, collapses to 0 when opened) */}
              <Animated.Text
                numberOfLines={1}
                style={{
                  fontSize: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                  lineHeight: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [13, 0],
                  }),
                  fontWeight: isTodayCard ? '700' : '600',
                  color: isTodayCard
                    ? '#049BD6'
                    : isWeekendCard
                    ? colors.weekendNumText
                    : colors.dateNumText,
                  fontVariant: ['tabular-nums'],
                  opacity: progress.interpolate({
                    inputRange: [0, 0.3, 1],
                    outputRange: [1, 0, 0],
                  }),
                  maxWidth: progress.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [30, 0, 0],
                  }),
                  overflow: 'hidden',
                }}
              >
                {format(cardDate, 'dd')}
              </Animated.Text>

              {/* Month name (hidden when closed, expands when opened) */}
              <Animated.Text
                numberOfLines={1}
                style={{
                  fontSize: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 14],
                  }),
                  lineHeight: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 17],
                  }),
                  fontWeight: isTodayCard ? '700' : '600',
                  color: isTodayCard
                    ? '#049BD6'
                    : isWeekendCard
                    ? colors.weekendNumText
                    : colors.dateNumText,
                  opacity: progress.interpolate({
                    inputRange: [0, 0.4, 1],
                    outputRange: [0, 0.5, 1],
                  }),
                  maxWidth: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 120],
                  }),
                  overflow: 'hidden',
                }}
              >
                {months[cardDate.getMonth()][0].toUpperCase() + months[cardDate.getMonth()].slice(1)}
              </Animated.Text>
            </Animated.View>
          </Animated.View>

          <Animated.View
            style={{
              marginLeft: 'auto',
              flexDirection: 'row',
              alignItems: 'center',
              opacity: progress,
            }}
          >
            <Animated.Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                fontVariant: ['tabular-nums'],
              }}
            >
              <Text style={{ fontWeight: '700', color: isTodayCard ? '#FFFFFF' : isWeekendCard ? '#7B4545' : '#333C4E' }}>
                {completedCount}
              </Text>
              <Text style={{ color: isTodayCard ? 'rgba(255,255,255,0.8)' : isWeekendCard ? 'rgba(123,69,69,0.7)' : '#707684' }}>
                /{cardTasks.length}
              </Text>
            </Animated.Text>
          </Animated.View>
        </Animated.View>

        <Animated.View
          style={{
            flex: 1,
            paddingHorizontal: 0,
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            borderCurve: 'continuous',
            marginHorizontal: 2,
            marginBottom: 2,
            overflow: 'hidden',
            opacity: 1,
            paddingTop: 0,
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
            contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 4, paddingBottom: 8 }}
          >
            {cardTasks.length ? (
              <View
                onLayout={(e) => {
                  const h = e.nativeEvent.layout.height;
                  setLocalListHeight(h);
                  if (isCenter) handleListLayout(h);
                }}
              >
                <SortableTaskList
                  data={cardTasks}
                  keyExtractor={(task) => `${task.id}:${task.date}`}
                  onReorder={(newData) => void handleReorder(newData)}
                  onScrollEnabledChange={handleScrollEnabled}
                  onAutoScroll={handleAutoScroll}
                  isScrollingRef={isScrollingRef}
                  gap={0}
                  dragHandleOpacity={progress.interpolate({
                    inputRange: [0.85, 1],
                    outputRange: [0, 1],
                  })}
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
                  Тапсырма жоқ
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Animated.View>
  );
});

export function CardTransitionProvider({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { tasks, settings, loadRange, remove } = usePlanner();

  const progress = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 8,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bounceAnim]);

  const origin = useRef<Omit<Transition, 'phase'> | null>(null);
  const transitionRef = useRef<Transition | null>(null);
  const [transition, setTransition] = useState<Transition | null>(null);

  const [pageIndex, setPageIndex] = useState(0);
  const pageIndexRef = useRef(0);

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

  const activeDateKey = toDateKey(activeCardDate);
  const activeDayTasks = tasks.filter((t) => t.date === activeDateKey);
  const taskCount = activeDayTasks.length;
  const emptyCardHeight = Math.round(height * 0.42);
  const rawContentHeight = 44 + 16 + (measuredListHeight > 0 ? measuredListHeight : (taskCount > 0 ? taskCount * 48 : 80));
  const contentHeight = Math.max(emptyCardHeight, rawContentHeight);
  const maxHeight = height - (insets.top + 68) - (Math.max(insets.bottom + 8, 16) + 60) - 12;
  const targetHeight = Math.min(maxHeight, contentHeight);

  const handleScrollEnabled = useCallback((enabled: boolean) => {
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
    async (newData: Task[]) => {
      const dateKey = toDateKey(activeCardDate);
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
    setPageIndex(0);
    pageIndexRef.current = 0;
    carouselX.setValue(0);
  };

  const openCard = (date: Date, cardTasks: Task[], frame: Frame) => {
    if (transitionRef.current) return;
    isAnimatingRef.current = true;
    const calcTaskCount = cardTasks.length;
    const calcContentHeight = Math.max(emptyCardHeight, 48 + 8 + calcTaskCount * 48 + 60);
    const calcTargetHeight = Math.min(maxHeight, calcContentHeight);
    const frameSnapshot = Object.freeze({ x: frame.x, y: frame.y, width: frame.width, height: frame.height });

    const next = { date, tasks: cardTasks, frame: frameSnapshot, targetHeight: calcTargetHeight };
    origin.current = next;
    transitionRef.current = { ...next, phase: 'opening' };
    setMeasuredListHeight(cardTasks.length * 48);
    setPageIndex(0);
    pageIndexRef.current = 0;
    carouselX.setValue(0);
    setTransition(transitionRef.current);

    if (cardTasks.length === 0) {
      beginAdding(date);
    }

    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 380,
      easing: Easing.bezier(0.12, 1, 0.22, 1),
      useNativeDriver: false,
    }).start(() => {
      isAnimatingRef.current = false;
    });
  };

  const closeCard = () => {
    if (!origin.current) {
      cleanupClose();
      return;
    }
    isAnimatingRef.current = true;
    transitionRef.current = { ...origin.current, phase: 'closing' };
    setTransition(transitionRef.current);

    Animated.timing(progress, {
      toValue: 0,
      duration: 280,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
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
    if (translationY > 90 || velocityY > 0.6) {
      closeCard();
      return;
    }
    Animated.timing(progress, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  const carouselPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.1,
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.1,
      onPanResponderMove: (_, gesture) => {
        carouselX.setValue(-pageIndexRef.current * width + gesture.dx);
      },
      onPanResponderRelease: (_, gesture) => {
        const threshold = (width - 32) * 0.22;
        const velocity = gesture.vx;

        if (gesture.dx < -threshold || velocity < -0.35) {
          if (settings.haptics && Platform.OS === 'ios') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          const nextIndex = pageIndexRef.current + 1;
          pageIndexRef.current = nextIndex;
          setPageIndex(nextIndex);
          if (transitionRef.current?.date) {
            const newKey = toDateKey(addDays(transitionRef.current.date, nextIndex));
            void loadRange(newKey, newKey);
          }
          Animated.spring(carouselX, {
            toValue: -nextIndex * width,
            useNativeDriver: false,
            bounciness: 0,
            speed: 20,
          }).start();
        } else if (gesture.dx > threshold || velocity > 0.35) {
          if (settings.haptics && Platform.OS === 'ios') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          const prevIndex = pageIndexRef.current - 1;
          pageIndexRef.current = prevIndex;
          setPageIndex(prevIndex);
          if (transitionRef.current?.date) {
            const newKey = toDateKey(addDays(transitionRef.current.date, prevIndex));
            void loadRange(newKey, newKey);
          }
          Animated.spring(carouselX, {
            toValue: -prevIndex * width,
            useNativeDriver: false,
            bounciness: 0,
            speed: 20,
          }).start();
        } else {
          setPageIndex(pageIndexRef.current);
          Animated.spring(carouselX, {
            toValue: -pageIndexRef.current * width,
            useNativeDriver: false,
            bounciness: 4,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        setPageIndex(pageIndexRef.current);
        Animated.spring(carouselX, {
          toValue: -pageIndexRef.current * width,
          useNativeDriver: false,
        }).start();
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
              inputRange: [0, 1],
              outputRange: [1, 0.5],
            }),
          }}
        >
          {children}
        </Animated.View>

        {current && (
          <View {...carouselPanResponder.panHandlers} pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
            <Pressable onPress={closeCard} style={StyleSheet.absoluteFillObject}>
              <Animated.View
                style={[
                  StyleSheet.absoluteFillObject,
                  {
                    backgroundColor: colors.background,
                    opacity: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    }),
                  },
                ]}
              />
            </Pressable>

            <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
              {[-1, 0, 1].map((offset) => {
                const virtualIndex = pageIndex + offset;
                const cardDate = addDays(current.date, virtualIndex);
                const cardKey = toDateKey(cardDate);

                return (
                  <CarouselCard
                    key={cardKey}
                    virtualIndex={virtualIndex}
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
                  />
                );
              })}
            </View>

            {/* Top Compact Week Strip placed directly above the open card */}
            <Animated.View
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                top: insets.top + 2,
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
                carouselX={carouselX}
                screenWidth={width}
                pageIndex={pageIndex}
                onSelectDate={(targetDate) => {
                  const diff = Math.round((targetDate.getTime() - current.date.getTime()) / (1000 * 60 * 60 * 24));
                  const newIndex = diff;
                  pageIndexRef.current = newIndex;
                  setPageIndex(newIndex);
                  Animated.spring(carouselX, {
                    toValue: -newIndex * width,
                    useNativeDriver: false,
                    bounciness: 0,
                    speed: 24,
                  }).start();
                }}
              />
            </Animated.View>

            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: Math.max(insets.bottom + 8, 12) + 54,
                zIndex: 10000,
                opacity: progress,
              }}
            >
              <Svg width="100%" height="100%">
                <Defs>
                  <LinearGradient id="bottomFadeGradientCard" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
                    <Stop offset="0.2" stopColor="#FFFFFF" stopOpacity="0.7" />
                    <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity="1" />
                    <Stop offset="1" stopColor="#FFFFFF" stopOpacity="1" />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#bottomFadeGradientCard)" />
              </Svg>
            </Animated.View>

            <Animated.View
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                left: 16,
                right: 16,
                bottom: Math.max(insets.bottom + 8, 12),
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                zIndex: 10001,
                elevation: 12,
                opacity: progress,
              }}
            >
              <BackButton onPress={closeCard} />

              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel="Жаңа тапсырма қосу"
                onPress={() => beginAdding(activeCardDate)}
                activeScale={0.97}
                style={{
                  flex: 1,
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
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: colors.inputPlaceholder }}>
                  Тапсырма қосу
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
                    Тапсырма өшірілді
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
                        color: '#38BDF8',
                        fontSize: 14,
                        fontWeight: '700',
                      }}
                    >
                      Қайтару
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

export function useCardTransition() {
  const ctx = useContext(CardTransitionContext);
  if (!ctx) throw new Error('useCardTransition must be used inside CardTransitionProvider');
  return ctx;
}
