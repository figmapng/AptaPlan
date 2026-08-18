import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { format, isToday } from 'date-fns';
import { colors } from '@/constants/colors';
import { fromDateKey, months, toDateKey, weekdays } from '@/services/date-service';
import { usePlanner } from '@/store/planner-store';
import { TaskRow } from '@/components/task-row';
import { useCardTransition } from '@/components/card-transition-provider';
import { TaskBottomSheet } from '@/components/TaskBottomSheet';
import { SortableTaskList } from '@/components/SortableTaskList';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { CompactWeekStrip } from '@/components/CompactWeekStrip';
import type { Task } from '@/types/task';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDatabase } from '@/database/database';

export default function DayScreen() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { date, add } = useLocalSearchParams<{ date: string; add?: string }>();
  const { tasks, settings, loadRange, refresh, remove } = usePlanner();
  const { closeCard, beginInteractiveClose, updateInteractiveClose, endInteractiveClose } = useCardTransition();
  const [isAdding, setIsAdding] = useState(false);
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

  const handlePendingDelete = useCallback((task: Task) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setPendingDeleteTask(task);
    undoTimerRef.current = setTimeout(() => {
      void remove(task.id, task.occurrenceDate || task.date, 'all');
      setPendingDeleteTask(null);
    }, 4000);
  }, [remove]);

  const handleUndo = useCallback(async () => {
    if (settings.haptics && process.env.EXPO_OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setPendingDeleteTask(null);
    await refresh();
  }, [settings.haptics, refresh]);

  const handleReorder = useCallback(async (newData: Task[]) => {
    const db = await getDatabase();
    const updatedAt = new Date().toISOString();

    // Save the entire order at once. This prevents a partial order from being
    // rendered when a user drops a row and immediately starts another drag.
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
    await refresh();
  }, [refresh]);

  useEffect(() => {
    if (date) void loadRange(date, date);
  }, [date, loadRange]);

  const selectedDate = fromDateKey(date);
  const dayTasks = tasks.filter((task) => task.date === date);
  const completedCount = dayTasks.filter((task) => task.isCompleted).length;
  const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
  const isSelectedToday = isToday(selectedDate);
  const activeDayColor = '#9FAABA';
  const [measuredListHeight, setMeasuredListHeight] = useState(0);
  const emptyCardHeight = Math.round(windowHeight * 0.42);
  const cardMaxHeight = windowHeight - insets.top - (insets.bottom + 88) - 12;
  const taskListHeight = measuredListHeight > 0 ? measuredListHeight : (dayTasks.length > 0 ? dayTasks.length * 48 + 16 : 80);
  const rawContentHeight = 48 + taskListHeight;
  const cardHeight = Math.min(cardMaxHeight, Math.max(emptyCardHeight, rawContentHeight));
  const taskAreaMaxHeight = cardHeight - 48;
  const returnToList = () => {
    closeCard();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
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
    setIsAdding(true);
  };
  useEffect(() => {
    if (add === '1') requestAnimationFrame(beginAdding);
  }, [add, date]);
  const beginEditing = (task: Task) => {
    setEditingTask(task);
    setIsAdding(true);
  };
  const closeComposer = () => {
    setIsAdding(false);
    setEditingTask(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingHorizontal: 16,
        paddingTop: insets.top + 4,
        paddingBottom: 88,
        gap: 8,
      }}
    >
      <View {...detailSwipeResponder.panHandlers}>
        <CompactWeekStrip
          selectedDate={selectedDate}
          onSelectDate={(d) => {
            const newKey = toDateKey(d);
            if (newKey !== date) {
              router.replace(`/day/${newKey}`);
            }
          }}
        />
      </View>
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 20,
          borderCurve: 'continuous',
          overflow: 'hidden',
          height: cardHeight,
          maxHeight: cardMaxHeight,
          borderWidth: 1,
          borderColor: isSelectedToday ? colors.activeCardBorder : colors.cardBorder,
          boxShadow: '0 1px 3px rgba(31,32,38,0.035)',
        }}
      >
        <View
          {...detailSwipeResponder.panHandlers}
          style={{
            minHeight: 48,
            paddingHorizontal: 12,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderBottomWidth: 1,
            borderBottomColor: isSelectedToday ? activeDayColor : colors.divider,
            backgroundColor: isSelectedToday ? activeDayColor : colors.card,
          }}
        >
          <View style={{ backgroundColor: isSelectedToday ? 'white' : '#F0F0F2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: isWeekend ? colors.weekend : colors.text, fontSize: 14, fontWeight: '600' }}>
              {months[selectedDate.getMonth()]}
            </Text>
          </View>
          <Text style={{ color: isSelectedToday ? 'white' : isWeekend ? colors.weekend : colors.text, fontSize: 16, fontWeight: '600' }}>
            {weekdays[selectedDate.getDay()]}
          </Text>
          <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 14, height: 14, marginRight: 6, borderRadius: 4, borderWidth: 1.25, borderColor: isSelectedToday ? 'white' : colors.text, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: isSelectedToday ? 'white' : colors.text, fontSize: 9, fontWeight: '800', lineHeight: 10 }}>✓</Text>
            </View>
            <Text style={{ color: isSelectedToday ? 'white' : colors.text, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{completedCount}</Text>
            <Text style={{ color: isSelectedToday ? 'rgba(255,255,255,0.72)' : colors.secondary, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] }}>/{dayTasks.length}</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          scrollEnabled={scrollEnabled}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={true}
          overScrollMode="always"
          decelerationRate={Platform.OS === 'ios' ? 'normal' : 0.985}
          onScroll={(e) => {
            scrollYRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          style={{ maxHeight: taskAreaMaxHeight }}
          contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 10, paddingBottom: 16 }}
        >
          {dayTasks.length ? (
            <Pressable
              style={{ flexGrow: 1 }}
              onPress={beginAdding}
              onLayout={(e) => setMeasuredListHeight(e.nativeEvent.layout.height)}
            >
              <SortableTaskList
                data={dayTasks}
                keyExtractor={(task) => `${task.id}:${task.date}`}
                onReorder={(newData) => void handleReorder(newData)}
                onScrollEnabledChange={handleScrollEnabled}
                onAutoScroll={handleAutoScroll}
                gap={0}
                renderItem={(task, isActive, index, totalCount) => (
                  <TaskRow
                    task={task}
                    isLast={index === totalCount - 1}
                    onPress={() => beginEditing(task)}
                    onPendingDelete={handlePendingDelete}
                    isActive={isActive}
                  />
                )}
              />
            </Pressable>
          ) : (
            <Pressable
              onPress={beginAdding}
              style={{ flex: 1, minHeight: 220, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ color: colors.secondary, fontSize: 17, paddingVertical: 28, textAlign: 'center' }}>
                Тапсырма жоқ
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Басты бетке оралу"
        onPress={returnToList}
        style={{ flex: 1, minHeight: 1, backgroundColor: colors.background }}
      />
    </View>

    {/* Undo Snackbar */}
    {pendingDeleteTask && (
      <View
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
          zIndex: 40,
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
      </View>
    )}
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom: Math.max(insets.bottom + 8, 16), height: 48, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 30 }}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel="Артқа оралу"
        onPress={returnToList}
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
    </View>
    <TaskBottomSheet
      visible={isAdding}
      editingTask={editingTask}
      initialDate={date}
      onClose={closeComposer}
    />
    </View>
  );
}

function ChevronLeftIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={colors.inputPlusIcon}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
