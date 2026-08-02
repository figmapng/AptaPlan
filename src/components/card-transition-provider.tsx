import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDays, format, isToday } from 'date-fns';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { months, toDateKey, weekdays } from '@/services/date-service';
import { usePlanner } from '@/store/planner-store';
import { TaskRow } from './task-row';
import { TaskBottomSheet } from './TaskBottomSheet';
import { SortableTaskList } from './SortableTaskList';
import { AnimatedPressable } from './AnimatedPressable';
import { getDatabase } from '@/database/database';
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

interface CarouselCardProps {
  offset: number;
  currentDate: Date;
  currentFrame: Frame;
  targetHeight: number;
  progress: Animated.Value;
  carouselX: SharedValue<number>;
  width: number;
  insets: any;
  tasks: Task[];
  emptyCardHeight: number;
  maxHeight: number;
  scrollEnabled: boolean;
  handleListLayout: (h: number) => void;
  handleReorder: (newData: Task[]) => Promise<void>;
  handleScrollEnabled: (enabled: boolean) => void;
  handleAutoScroll: (delta: number) => void;
  beginEditing: (task: Task) => void;
  handlePendingDelete: (task: Task) => void;
}

function CarouselCard({
  offset,
  currentDate,
  currentFrame,
  targetHeight,
  progress,
  carouselX,
  width,
  insets,
  tasks,
  scrollEnabled,
  handleListLayout,
  handleReorder,
  handleScrollEnabled,
  handleAutoScroll,
  beginEditing,
  handlePendingDelete,
}: CarouselCardProps) {
  const cardDate = addDays(currentDate, offset);
  const cardKey = toDateKey(cardDate);
  const cardTasks = tasks.filter((t) => t.date === cardKey);
  const completedCount = cardTasks.filter((t) => t.isCompleted).length;
  const isTodayCard = isToday(cardDate);
  const isWeekendCard = isWeekendDay(cardDate);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = offset * width + carouselX.value;
    return {
      transform: [{ translateX }],
    };
  });

  const isCenter = offset === 0;

  return (
    <Reanimated.View
      style={[
        {
          position: 'absolute',
          left: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [currentFrame.x, 16],
          }),
          top: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [currentFrame.y, insets.top + 4],
          }),
          width: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [currentFrame.width, width - 32],
          }),
          height: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [currentFrame.height, targetHeight],
          }),
          borderRadius: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [14, 16],
          }),
          backgroundColor: isTodayCard ? '#00A3FF' : '#EDEFF2',
          overflow: 'hidden',
          zIndex: isCenter ? 9999 : 9998,
          elevation: isCenter ? 10 : 5,
          borderWidth: 0,
          borderColor: isTodayCard ? '#00A3FF' : '#EDEFF2',
        },
        animatedStyle,
      ]}
    >
      {/* Header */}
      <Animated.View
        style={{
          height: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [32, 44],
          }),
          paddingVertical: 6,
          paddingHorizontal: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [6, 10],
          }),
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: isTodayCard ? '#00A3FF' : '#EDEFF2',
        }}
      >
        <View
          style={{
            backgroundColor: isTodayCard
              ? '#008ADB'
              : isWeekendCard
              ? '#FAB9B3'
              : '#C4CAD7',
            borderRadius: 6,
            minWidth: 22,
            paddingTop: 5,
            paddingRight: 1,
            paddingBottom: 1,
            paddingLeft: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Inner white frame */}
          <View
            style={{
              alignSelf: 'stretch',
              borderRadius: 5,
              paddingHorizontal: 3,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFFFFF',
            }}
          >
            <Animated.Text
              style={{
                fontSize: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 14],
                }),
                fontWeight: isTodayCard ? '700' : '600',
                color: isTodayCard
                  ? '#049BD6'
                  : isWeekendCard
                  ? colors.sundayText
                  : '#333C4E',
                fontVariant: ['tabular-nums'],
              }}
            >
              {format(cardDate, 'dd')}
            </Animated.Text>
          </View>
        </View>
        <Animated.Text
          style={{
            fontSize: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 16],
            }),
            fontWeight: '700',
            color: isTodayCard ? '#FFFFFF' : isWeekendCard ? colors.sundayText : '#333C4E',
          }}
        >
          {weekdays[cardDate.getDay()]}
        </Animated.Text>

        {/* Completion Counter Badge */}
        <Animated.View
          style={{
            marginLeft: 'auto',
            flexDirection: 'row',
            alignItems: 'center',
            opacity: progress,
          }}
        >
          <View
            style={{
              width: 14,
              height: 14,
              marginRight: 6,
              borderRadius: 4,
              borderWidth: 1.25,
              borderColor: isTodayCard ? '#FFFFFF' : '#333C4E',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
              <Path
                d="M20 6L9 17l-5-5"
                stroke={isTodayCard ? '#FFFFFF' : '#333C4E'}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <Animated.Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: isTodayCard ? '#FFFFFF' : '#333C4E',
            }}
          >
            {completedCount}
          </Animated.Text>
          <Animated.Text
            style={{
              color: isTodayCard ? 'rgba(255,255,255,0.8)' : '#707684',
              fontSize: 12,
              fontWeight: '600',
              fontVariant: ['tabular-nums'],
            }}
          >
            /{cardTasks.length}
          </Animated.Text>
        </Animated.View>
      </Animated.View>

      {/* Content Morphing with SortableTaskList */}
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
          paddingTop: 6,
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
            scrollYRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 8 }}
        >
          {cardTasks.length ? (
            <View onLayout={(e) => isCenter && handleListLayout(e.nativeEvent.layout.height)}>
              <SortableTaskList
                data={cardTasks}
                keyExtractor={(task) => `${task.id}:${task.date}`}
                onReorder={(newData) => void handleReorder(newData)}
                onScrollEnabledChange={handleScrollEnabled}
                onAutoScroll={handleAutoScroll}
                gap={4}
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
                  />
                )}
              />
            </View>
          ) : (
            <View
              style={{
                minHeight: Math.max(160, targetHeight - 80),
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
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </Reanimated.View>
  );
}

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
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<Task | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const [measuredListHeight, setMeasuredListHeight] = useState<number>(0);
  const isAnimatingRef = useRef(false);

  const carouselX = useSharedValue(0);

  const handleListLayout = useCallback((h: number) => {
    if (isAnimatingRef.current) return;
    setMeasuredListHeight((prev) => (Math.abs(prev - h) > 8 ? h : prev));
  }, []);

  const activeDateKey = transition?.date ? toDateKey(transition.date) : null;
  const activeDayTasks = activeDateKey ? tasks.filter((t) => t.date === activeDateKey) : (transition?.tasks ?? []);
  const taskCount = activeDayTasks.length;
  const emptyCardHeight = Math.round(height * 0.45);
  const rawContentHeight = 48 + 8 + (measuredListHeight > 0 ? measuredListHeight : taskCount * 48) + 12;
  const contentHeight = Math.max(emptyCardHeight, rawContentHeight);
  const maxHeight = height - (insets.top + 4) - (Math.max(insets.bottom + 8, 16) + 48 + 24);
  const targetHeight = Math.min(maxHeight, contentHeight);

  const handleScrollEnabled = useCallback((enabled: boolean) => {
    setScrollEnabled(enabled);
  }, []);

  const handleAutoScroll = useCallback((delta: number) => {
    // scroll handling passed to active list
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
      if (!transitionRef.current?.date) return;
      const dateKey = toDateKey(transitionRef.current.date);
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
    [loadRange]
  );

  const cleanupClose = () => {
    origin.current = null;
    transitionRef.current = null;
    setTransition(null);
    carouselX.value = 0;
  };

  const openCard = (date: Date, cardTasks: Task[], frame: Frame) => {
    if (transitionRef.current) return;
    isAnimatingRef.current = true;
    const calcTaskCount = cardTasks.length;
    const calcContentHeight = Math.max(emptyCardHeight, 48 + 8 + calcTaskCount * 48 + 12);
    const calcTargetHeight = Math.min(maxHeight, calcContentHeight);
    const frameSnapshot = Object.freeze({ x: frame.x, y: frame.y, width: frame.width, height: frame.height });

    const next = { date, tasks: cardTasks, frame: frameSnapshot, targetHeight: calcTargetHeight };
    origin.current = next;
    transitionRef.current = { ...next, phase: 'opening' };
    setMeasuredListHeight(cardTasks.length * 48);
    setTransition(transitionRef.current);
    carouselX.value = 0;

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

  const handleNextDay = useCallback(() => {
    if (!transitionRef.current) return;
    if (settings.haptics && Platform.OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newDate = addDays(transitionRef.current.date, 1);
    const newKey = toDateKey(newDate);
    const newTasks = tasks.filter((t) => t.date === newKey);
    const calcContentHeight = Math.max(emptyCardHeight, 48 + 8 + newTasks.length * 48 + 12);
    const calcTargetHeight = Math.min(maxHeight, calcContentHeight);

    const updated = {
      ...transitionRef.current,
      date: newDate,
      tasks: newTasks,
      targetHeight: calcTargetHeight,
    };
    origin.current = updated;
    transitionRef.current = updated;
    setTransition(updated);
    carouselX.value = 0;
  }, [tasks, emptyCardHeight, maxHeight, settings.haptics, carouselX]);

  const handlePrevDay = useCallback(() => {
    if (!transitionRef.current) return;
    if (settings.haptics && Platform.OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newDate = addDays(transitionRef.current.date, -1);
    const newKey = toDateKey(newDate);
    const newTasks = tasks.filter((t) => t.date === newKey);
    const calcContentHeight = Math.max(emptyCardHeight, 48 + 8 + newTasks.length * 48 + 12);
    const calcTargetHeight = Math.min(maxHeight, calcContentHeight);

    const updated = {
      ...transitionRef.current,
      date: newDate,
      tasks: newTasks,
      targetHeight: calcTargetHeight,
    };
    origin.current = updated;
    transitionRef.current = updated;
    setTransition(updated);
    carouselX.value = 0;
  }, [tasks, emptyCardHeight, maxHeight, settings.haptics, carouselX]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      carouselX.value = e.translationX;
    })
    .onEnd((e) => {
      const distanceThreshold = (width - 32) * 0.25;
      const velocityThreshold = 500;
      const springConfig = { damping: 22, stiffness: 220, mass: 0.6 };

      if (e.translationX < -distanceThreshold || e.velocityX < -velocityThreshold) {
        carouselX.value = withSpring(-width, springConfig, (finished) => {
          if (finished) {
            runOnJS(handleNextDay)();
          }
        });
      } else if (e.translationX > distanceThreshold || e.velocityX > velocityThreshold) {
        carouselX.value = withSpring(width, springConfig, (finished) => {
          if (finished) {
            runOnJS(handlePrevDay)();
          }
        });
      } else {
        carouselX.value = withSpring(0, springConfig);
      }
    });

  const beginEditing = (task: Task) => {
    setEditingTask(task);
    setShowBottomSheet(true);
  };

  const value: ContextValue = {
    openCard,
    closeCard,
    beginInteractiveClose,
    updateInteractiveClose,
    endInteractiveClose,
    activeDate: transition ? toDateKey(transition.date) : null,
    progress,
    originFrame: transition?.frame ?? null,
  };

  const current = transition;

  return (
    <CardTransitionContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {/* Background Grid View with opacity: 0.5 on expansion */}
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

        {/* Absolute Positioned Overlay */}
        {current && (
          <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
            {/* Backdrop Overlay - tap to close */}
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

            {/* FLIP Manual Shared-Element 3-Card Carousel */}
            <GestureDetector gesture={panGesture}>
              <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
                {[-1, 0, 1].map((offset) => (
                  <CarouselCard
                    key={`${toDateKey(addDays(current.date, offset))}:${offset}`}
                    offset={offset}
                    currentDate={current.date}
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
                    handleAutoScroll={handleAutoScroll}
                    beginEditing={beginEditing}
                    handlePendingDelete={handlePendingDelete}
                  />
                ))}
              </View>
            </GestureDetector>

            {/* Undo Delete Snackbar */}
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

        {/* Task BottomSheet for Editing */}
        {editingTask && (
          <TaskBottomSheet
            visible={showBottomSheet}
            onClose={() => {
              setShowBottomSheet(false);
              setEditingTask(null);
            }}
            initialDate={editingTask.date}
            editingTask={editingTask}
          />
        )}
      </View>
    </CardTransitionContext.Provider>
  );
}

export function useCardTransition() {
  const ctx = useContext(CardTransitionContext);
  if (!ctx) throw new Error('useCardTransition must be used inside CardTransitionProvider');
  return ctx;
}
