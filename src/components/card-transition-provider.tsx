import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, isToday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { fromDateKey, months, toDateKey, weekdays } from '@/services/date-service';
import { usePlanner } from '@/store/planner-store';
import { TaskRow } from './task-row';
import { TaskBottomSheet } from './TaskBottomSheet';
import { SortableTaskList } from './SortableTaskList';
import { AnimatedPressable } from './AnimatedPressable';
import { getDatabase } from '@/database/database';
import type { Task } from '@/types/task';

type Frame = { x: number; y: number; width: number; height: number };
type Transition = { date: Date; tasks: Task[]; frame: Frame; phase: 'opening' | 'closing' };
type ContextValue = {
  openCard: (date: Date, tasks: Task[], frame: Frame) => void;
  closeCard: () => void;
  beginInteractiveClose: () => void;
  updateInteractiveClose: (translationY: number) => void;
  endInteractiveClose: (translationY: number, velocityY: number) => void;
  activeDate: string | null;
};

const CardTransitionContext = createContext<ContextValue | null>(null);

export function CardTransitionProvider({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { tasks, settings, loadRange, remove } = usePlanner();

  const progress = useRef(new Animated.Value(0)).current;
  const contentProgress = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  const origin = useRef<Omit<Transition, 'phase'> | null>(null);
  const transitionRef = useRef<Transition | null>(null);
  const closeStarted = useRef(false);
  const [transition, setTransition] = useState<Transition | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<Task | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);

  const handleScrollEnabled = useCallback((enabled: boolean) => {
    setScrollEnabled(enabled);
  }, []);

  const handleAutoScroll = useCallback((delta: number) => {
    const nextY = Math.max(0, scrollYRef.current + delta);
    scrollYRef.current = nextY;
    scrollRef.current?.scrollTo({ y: nextY, animated: false });
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

  const handleReorder = useCallback(async (newData: Task[]) => {
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
          newData[i].id,
        );
      }
    });
    await loadRange(dateKey, dateKey);
  }, [loadRange]);

  const targetHeight = Math.min(
    height - insets.top - 102,
    Math.max(270, 106 + Math.min(transition?.tasks.length ?? 0, 5) * 54)
  );

  const openCard = (date: Date, tasks: Task[], frame: Frame) => {
    if (transitionRef.current) return;
    closeStarted.current = false;
    const next = { date, tasks, frame };
    origin.current = next;
    transitionRef.current = { ...next, phase: 'opening' };
    setTransition(transitionRef.current);
    progress.setValue(0);
    contentProgress.setValue(0);
    overlayOpacity.setValue(1);

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(progress, {
          toValue: 1,
          tension: 240,
          friction: 24,
          useNativeDriver: false,
        }),
        Animated.spring(contentProgress, {
          toValue: 1,
          tension: 240,
          friction: 24,
          useNativeDriver: false,
        }),
      ]).start();
    });
  };

  const cleanupClose = () => {
    origin.current = null;
    closeStarted.current = false;
    transitionRef.current = null;
    setTransition(null);
  };

  const finishClose = () => {
    progress.stopAnimation();
    contentProgress.stopAnimation();
    closeStarted.current = true;

    if (!origin.current) {
      cleanupClose();
      return;
    }

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(progress, {
          toValue: 0,
          tension: 240,
          friction: 24,
          useNativeDriver: false,
        }),
        Animated.spring(contentProgress, {
          toValue: 0,
          tension: 240,
          friction: 24,
          useNativeDriver: false,
        }),
      ]).start(() => {
        cleanupClose();
      });
    });

    setTimeout(cleanupClose, 320);
  };

  const closeCard = () => {
    closeStarted.current = false;
    const previous = origin.current;
    if (!previous) {
      cleanupClose();
      return;
    }
    transitionRef.current = { ...previous, phase: 'closing' };
    setTransition(transitionRef.current);
    finishClose();
  };

  const beginInteractiveClose = () => {
    closeStarted.current = false;
    const previous = origin.current;
    if (!previous) return;
    transitionRef.current = { ...previous, phase: 'closing' };
    setTransition(transitionRef.current);
    progress.setValue(1);
    contentProgress.setValue(1);
    overlayOpacity.setValue(1);
  };

  const updateInteractiveClose = (translationY: number) => {
    if (!origin.current || !transitionRef.current || translationY <= 0) return;
    const cardProgress = Math.max(0, Math.min(1, 1 - translationY / 280));
    const detailProgress = Math.max(0, Math.min(1, 1 - translationY / 100));
    progress.setValue(cardProgress);
    contentProgress.setValue(detailProgress);
  };

  const endInteractiveClose = (translationY: number, velocityY: number) => {
    if (!origin.current || !transitionRef.current) return;
    if (translationY > 90 || velocityY > 0.6) {
      finishClose();
      return;
    }
    Animated.parallel([
      Animated.spring(progress, {
        toValue: 1,
        stiffness: 220,
        damping: 26,
        mass: 0.8,
        overshootClamping: true,
        useNativeDriver: false,
      }),
      Animated.timing(contentProgress, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(() => {
      if (transitionRef.current?.phase !== 'closing') {
        transitionRef.current = null;
        setTransition(null);
      }
    });
  };

  const detailSwipeResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 14 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderMove: (_, gesture) => {
      beginInteractiveClose();
      updateInteractiveClose(gesture.dy);
    },
    onPanResponderRelease: (_, gesture) => endInteractiveClose(gesture.dy, gesture.vy),
    onPanResponderTerminate: (_, gesture) => endInteractiveClose(gesture.dy, gesture.vy),
  });

  const beginAdding = () => {
    setEditingTask(null);
    setShowBottomSheet(true);
  };

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
  };

  const current = transition;
  const day = current?.date;
  const dateKey = day ? toDateKey(day) : null;
  const dayTasks = dateKey ? tasks.filter((t) => t.date === dateKey) : (current?.tasks ?? []);
  const completedCount = dayTasks.filter((t) => t.isCompleted).length;
  const weekend = day ? day.getDay() === 0 || day.getDay() === 6 : false;
  const today = day ? isToday(day) : false;

  const fadeFirstOpacity = progress.interpolate({
    inputRange: [0.8, 1],
    outputRange: [0, 1],
  });

  return (
    <CardTransitionContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
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

            {/* Matched Geometry Morphing Card */}
            <Animated.View
              style={{
                position: 'absolute',
                opacity: overlayOpacity,
                left: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [current.frame.x, 16],
                }),
                top: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [current.frame.y, insets.top + 4],
                }),
                width: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [current.frame.width, width - 32],
                }),
                height: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [current.frame.height, targetHeight],
                }),
                overflow: 'hidden',
                backgroundColor: colors.card,
                borderRadius: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 20],
                }),
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: today ? colors.activeCardBorder : colors.cardBorder,
              }}
            >
              {/* Header Morphing with Swipe down responder */}
              <Animated.View
                {...detailSwipeResponder.panHandlers}
                style={{
                  height: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [34, 48],
                  }),
                  paddingHorizontal: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 12],
                  }),
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: today ? colors.activeHeaderBg : colors.card,
                  borderBottomWidth: 1,
                  borderBottomColor: today ? colors.activeHeaderBg : fadeFirstOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['transparent', colors.divider],
                  }),
                }}
              >
                <Animated.View
                  style={{
                    backgroundColor: today ? 'white' : '#F0F0F2',
                    borderRadius: 6,
                    paddingHorizontal: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [6, 8],
                    }),
                    paddingVertical: 3,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Animated.Text
                    style={{
                      fontSize: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [12, 14],
                      }),
                      fontWeight: '600',
                      color: today ? colors.activeHeaderBg : weekend ? colors.sundayText : colors.dateNumText,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {format(day!, 'dd')}
                  </Animated.Text>
                  <Animated.Text
                    style={{
                      opacity: progress,
                      fontSize: 14,
                      fontWeight: '600',
                      color: today ? colors.activeHeaderBg : weekend ? colors.sundayText : colors.dateNumText,
                      marginLeft: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 4],
                      }),
                    }}
                  >
                    {months[day!.getMonth()]}
                  </Animated.Text>
                </Animated.View>
                <Animated.Text
                  style={{
                    fontSize: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 16],
                    }),
                    fontWeight: '700',
                    color: today ? 'white' : weekend ? colors.sundayText : colors.text,
                  }}
                >
                  {weekdays[day!.getDay()]}
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
                      borderColor: today ? 'white' : colors.text,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: today ? 'white' : colors.text, fontSize: 9, fontWeight: '800', lineHeight: 10 }}>✓</Text>
                  </View>
                  <Text style={{ color: today ? 'white' : colors.text, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{completedCount}</Text>
                  <Text style={{ color: today ? 'rgba(255,255,255,0.72)' : colors.secondary, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] }}>/{dayTasks.length}</Text>
                </Animated.View>
              </Animated.View>

              {/* Content Morphing with SortableTaskList - ALWAYS VISIBLE */}
              <Animated.View
                style={{
                  opacity: 1,
                  transform: [
                    {
                      scale: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.94, 1],
                      }),
                    },
                  ],
                  paddingHorizontal: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [2, 4],
                  }),
                  paddingTop: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [4, 10],
                  }),
                  flex: 1,
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
                  contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 16 }}
                >
                  {dayTasks.length ? (
                    <SortableTaskList
                      data={dayTasks}
                      keyExtractor={(task) => `${task.id}:${task.date}`}
                      onReorder={(newData) => void handleReorder(newData)}
                      onScrollEnabledChange={handleScrollEnabled}
                      onAutoScroll={handleAutoScroll}
                      gap={4}
                      dragHandleOpacity={fadeFirstOpacity}
                      renderItem={(task, isActive, index, totalCount, onSwipeX) => (
                        <TaskRow
                          task={task}
                          isLast={index === totalCount - 1}
                          onPress={() => beginEditing(task)}
                          onPendingDelete={handlePendingDelete}
                          isActive={isActive}
                          onSwipeX={onSwipeX}
                        />
                      )}
                    />
                  ) : (
                    <Text style={{ color: colors.secondary, fontSize: 16, paddingVertical: 24, textAlign: 'center' }}>
                      Тапсырма жоқ
                    </Text>
                  )}
                </ScrollView>
              </Animated.View>
            </Animated.View>

            {/* Undo Delete Snackbar */}
            {pendingDeleteTask && (
              <Animated.View
                pointerEvents="box-none"
                style={{
                  position: 'absolute',
                  left: 16,
                  right: 16,
                  bottom: Math.max(insets.bottom + 68, 76),
                  height: 48,
                  borderRadius: 18,
                  backgroundColor: '#23262D',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  zIndex: 140,
                  opacity: progress,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                }}
              >
                <Text style={{ color: 'white', fontSize: 14, fontWeight: '500' }}>
                  Тапсырма өшірілді
                </Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Өшіруді болдырмау" onPress={handleUndo}>
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                    Болдырмау
                  </Text>
                </Pressable>
              </Animated.View>
            )}

            {/* Bottom Action Bar: Back button < and + Тапсырма қосу input bar */}
            <Animated.View
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                left: 16,
                right: 16,
                bottom: Math.max(insets.bottom + 8, 16),
                height: 48,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                zIndex: 100,
                opacity: fadeFirstOpacity,
                transform: [
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              }}
            >
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel="Артқа оралу"
                onPress={closeCard}
                activeScale={0.92}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.inputBg,
                  borderWidth: 1,
                  borderColor: colors.inputBorder,
                }}
              >
                <ChevronLeftIcon />
              </AnimatedPressable>

              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel="Тапсырма қосу"
                onPress={beginAdding}
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
                <Text style={{ color: colors.inputPlaceholder, fontSize: 14, fontWeight: '500' }}>Тапсырма қосу</Text>
              </AnimatedPressable>
            </Animated.View>

            <TaskBottomSheet
              visible={showBottomSheet}
              editingTask={editingTask}
              initialDate={dateKey ?? undefined}
              onClose={() => {
                setShowBottomSheet(false);
                setEditingTask(null);
              }}
            />
          </View>
        )}
      </View>
    </CardTransitionContext.Provider>
  );
}

function ChevronLeftIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke="#4A5260"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function useCardTransition() {
  const value = useContext(CardTransitionContext);
  if (!value) throw new Error('CardTransitionProvider missing');
  return value;
}

const styles = StyleSheet.create({});
