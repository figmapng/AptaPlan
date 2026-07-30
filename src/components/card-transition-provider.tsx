import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDays, format, isToday } from 'date-fns';

function BouncingArrowPointer() {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 10,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bounceAnim]);

  return (
    <Animated.View
      style={{
        transform: [{ translateY: bounceAnim }],
        alignItems: 'center',
        marginTop: 14,
      }}
    >
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 4V18M12 18L6 12M12 18L18 12"
          stroke={colors.today}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}
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
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);

  const [measuredListHeight, setMeasuredListHeight] = useState<number>(0);
  const isAnimatingRef = useRef(false);

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
  };

  const openCard = (date: Date, cardTasks: Task[], frame: Frame) => {
    if (transitionRef.current) return;
    isAnimatingRef.current = true;
    const taskCount = cardTasks.length;
    const calcContentHeight = Math.max(emptyCardHeight, 48 + 8 + taskCount * 48 + 12);
    const calcTargetHeight = Math.min(maxHeight, calcContentHeight);
    const frameSnapshot = Object.freeze({ x: frame.x, y: frame.y, width: frame.width, height: frame.height });

    const next = { date, tasks: cardTasks, frame: frameSnapshot, targetHeight: calcTargetHeight };
    origin.current = next;
    transitionRef.current = { ...next, phase: 'opening' };
    setMeasuredListHeight(cardTasks.length * 48);
    setTransition(transitionRef.current);

    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 440,
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
      duration: 320,
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
      easing: Easing.bezier(0.32, 0.72, 0, 1),
      useNativeDriver: false,
    }).start();
  };

  const slideAnim = useRef(new Animated.Value(0)).current;

  const switchDay = useCallback(
    (offset: -1 | 1) => {
      if (!transitionRef.current || isAnimatingRef.current) return;
      isAnimatingRef.current = true;

      const currentDay = transitionRef.current.date;
      const nextDay = addDays(currentDay, offset);
      const nextKey = toDateKey(nextDay);
      const nextTasks = tasks.filter((t) => t.date === nextKey);

      if (settings.haptics && Platform.OS === 'ios') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const exitVal = offset === 1 ? -width * 0.4 : width * 0.4;
      const enterVal = offset === 1 ? width * 0.4 : -width * 0.4;

      Animated.timing(slideAnim, {
        toValue: exitVal,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start(() => {
        const calcContentHeight = Math.max(emptyCardHeight, 48 + 8 + nextTasks.length * 48 + 12);
        const calcTargetHeight = Math.min(maxHeight, calcContentHeight);
        const updated = {
          ...transitionRef.current!,
          date: nextDay,
          tasks: nextTasks,
          targetHeight: calcTargetHeight,
        };
        origin.current = updated;
        transitionRef.current = updated;
        setTransition(updated);

        slideAnim.setValue(enterVal);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 160,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start(() => {
          isAnimatingRef.current = false;
        });
      });
    },
    [tasks, maxHeight, slideAnim, width, settings.haptics]
  );

  const detailSwipeResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) =>
      Math.abs(gesture.dx) > 16 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_, gesture) => {
      if (Math.abs(gesture.dx) > Math.abs(gesture.dy)) {
        slideAnim.setValue(gesture.dx);
      }
    },
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) > 40 || Math.abs(gesture.vx) > 0.35) {
        if (gesture.dx < 0 || gesture.vx < -0.35) {
          switchDay(1);
        } else {
          switchDay(-1);
        }
      } else {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: false,
          bounciness: 4,
        }).start();
      }
    },
    onPanResponderTerminate: () => {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: false,
      }).start();
    },
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
    progress,
    originFrame: transition?.frame ?? null,
  };

  const current = transition;
  const day = current?.date;
  const dateKey = day ? toDateKey(day) : null;
  const dayTasks = dateKey ? tasks.filter((t) => t.date === dateKey) : (current?.tasks ?? []);
  const completedCount = dayTasks.filter((t) => t.isCompleted).length;
  const weekend = day ? day.getDay() === 0 || day.getDay() === 6 : false;
  const today = day ? isToday(day) : false;

  return (
    <CardTransitionContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {/* Background Grid View with opacity: 0.4 on expansion */}
        <Animated.View
          style={{
            flex: 1,
            opacity: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.4],
            }),
          }}
        >
          {children}
        </Animated.View>

        {/* Absolute Positioned Overlay - No Modal */}
        {current && (
          <View {...detailSwipeResponder.panHandlers} pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
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

            {/* FLIP Manual Shared-Element Morphing Card */}
            <Animated.View
              style={{
                position: 'absolute',
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
                borderRadius: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 20],
                }),
                backgroundColor: colors.card,
                overflow: 'hidden',
                zIndex: 9999,
                elevation: 10,
                borderWidth: 1,
                borderColor: today ? colors.activeCardBorder : colors.cardBorder,
                transform: [{ translateX: slideAnim }],
              }}
            >
              {/* Header Morphing */}
              <Animated.View
                {...detailSwipeResponder.panHandlers}
                style={{
                  height: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [34, 48],
                  }),
                  paddingHorizontal: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 10],
                  }),
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: today ? colors.activeHeaderBg : colors.card,
                  borderBottomWidth: 1,
                  borderBottomColor: today ? colors.activeHeaderBg : colors.divider,
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
                      color: today
                        ? colors.activeHeaderBg
                        : weekend
                        ? colors.sundayText
                        : colors.dateNumText,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {format(day!, 'dd')}
                  </Animated.Text>
                  <Animated.Text
                    style={{
                      opacity: progress.interpolate({
                        inputRange: [0.25, 1],
                        outputRange: [0, 1],
                      }),
                      maxWidth: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 64],
                      }),
                      fontSize: 14,
                      fontWeight: '600',
                      color: today
                        ? colors.activeHeaderBg
                        : weekend
                        ? colors.sundayText
                        : colors.dateNumText,
                      marginLeft: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 4],
                      }),
                      overflow: 'hidden',
                    }}
                    numberOfLines={1}
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
                    <Text
                      style={{
                        color: today ? 'white' : colors.text,
                        fontSize: 9,
                        fontWeight: '800',
                        lineHeight: 10,
                      }}
                    >
                      ✓
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: today ? 'white' : colors.text,
                      fontSize: 12,
                      fontWeight: '600',
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {completedCount}
                  </Text>
                  <Text
                    style={{
                      color: today ? 'rgba(255,255,255,0.72)' : colors.secondary,
                      fontSize: 12,
                      fontWeight: '600',
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    /{dayTasks.length}
                  </Text>
                </Animated.View>
              </Animated.View>

              {/* Content Morphing with SortableTaskList */}
              <Animated.View
                style={{
                  flex: 1,
                  paddingHorizontal: 0,
                  opacity: 1,
                  transform: [
                    {
                      scale: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.95, 1],
                      }),
                    },
                  ],
                  paddingTop: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [2, 6],
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
                    scrollYRef.current = e.nativeEvent.contentOffset.y;
                  }}
                  scrollEventThrottle={16}
                  contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 8 }}
                >
                  {dayTasks.length ? (
                    <View onLayout={(e) => handleListLayout(e.nativeEvent.layout.height)}>
                      <SortableTaskList
                        data={dayTasks}
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
                          onScrollEnabledChange
                        ) => (
                          <TaskRow
                            task={task}
                            isLast={index === totalCount - 1}
                            onPress={() => beginEditing(task)}
                            onPendingDelete={handlePendingDelete}
                            isActive={isActive}
                            onSwipeX={onSwipeX}
                            onScrollEnabledChange={onScrollEnabledChange}
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
                  opacity: progress.interpolate({
                    inputRange: [0.8, 1],
                    outputRange: [0, 1],
                  }),
                }}
              >
                <Text style={{ color: 'white', fontSize: 14, fontWeight: '500' }}>
                  Тапсырма өшірілді
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Өшіруді болдырмау"
                  onPress={handleUndo}
                >
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
                opacity: progress.interpolate({
                  inputRange: [0.7, 1],
                  outputRange: [0, 1],
                }),
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
                <Text
                  style={{
                    color: colors.inputPlusIcon,
                    fontSize: 20,
                    lineHeight: 22,
                    fontWeight: '300',
                  }}
                >
                  +
                </Text>
                <Text style={{ color: colors.inputPlaceholder, fontSize: 14, fontWeight: '500' }}>
                  Тапсырма қосу
                </Text>
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
