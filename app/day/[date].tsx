import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useTheme } from '@/hooks/use-theme';
import { fromDateKey, toDateKey } from '@/services/date-service';
import { usePlanner } from '@/store/planner-store';
import { TaskRow } from '@/components/task-row';
import { useCardTransition } from '@/components/card-transition-provider';
import { TaskBottomSheet } from '@/components/TaskBottomSheet';
import { TaskPreviewModal } from '@/components/TaskPreviewModal';
import { SortableTaskList } from '@/components/SortableTaskList';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { BackButton } from '@/components/BackButton';
import { BottomTaskInput } from '@/components/BottomTaskInput';
import { CompactWeekStrip } from '@/components/CompactWeekStrip';
import { useI18n } from '@/i18n/use-i18n';
import type { Task } from '@/types/task';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDatabase } from '@/database/database';

export default function DayScreen() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const { date, add } = useLocalSearchParams<{ date: string; add?: string }>();
  const { tasks, settings, loadRange, refresh, remove } = usePlanner();
  const { closeCard, beginInteractiveClose, updateInteractiveClose, endInteractiveClose } = useCardTransition();
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<Task | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDeleteTaskRef = useRef<Task | null>(null);
  pendingDeleteTaskRef.current = pendingDeleteTask;

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
        if (pendingDeleteTaskRef.current) {
          const t = pendingDeleteTaskRef.current;
          void remove(t.id, t.occurrenceDate || t.date, 'all');
        }
      }
    };
  }, [remove]);
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
          'UPDATE tasks SET sort_order = ?, updated_at = ? WHERE id = ?;',
          [i, updatedAt, newData[i].id]
        );
      }
    });

    await refresh();
  }, [refresh]);

  useEffect(() => {
    if (date) void loadRange(date, date);
  }, [date, loadRange]);

  const selectedDate = useMemo(() => {
    if (!date) return new Date();
    try {
      const parsed = fromDateKey(date);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    } catch {
      return new Date();
    }
  }, [date]);
  const dayTasks = tasks.filter((task) => task.date === date);
  const completedCount = dayTasks.filter((task) => task.isCompleted).length;
  const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
  const isSelectedToday = isToday(selectedDate);
  const activeDayColor = colors.activeHeaderBg;
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
        gap: 12,
      }}
    >
      <View>
        <CompactWeekStrip
          selectedDate={selectedDate}
          style={{ marginHorizontal: 0 }}
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
          borderRadius: 24,
          borderCurve: 'continuous',
          overflow: 'hidden',
          height: cardHeight,
          maxHeight: cardMaxHeight,
          borderWidth: isDark ? 1 : 0,
          borderColor: isDark ? colors.cardBorder : 'transparent',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.2 : 0.05,
          shadowRadius: 20,
          elevation: 4,
        }}
      >
        <View
          style={{
            paddingHorizontal: 18,
            paddingTop: 18,
            paddingBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: isSelectedToday ? colors.today : isWeekend ? colors.weekend : colors.text,
              letterSpacing: -0.2,
            }}
          >
            {(t.date.weekdays[selectedDate.getDay()] ?? '').toUpperCase()}
            <Text style={{ color: colors.secondary, fontWeight: '500' }}>
              {` • ${format(selectedDate, 'd')} ${t.date.monthsShort[selectedDate.getMonth()] ?? ''}`}
            </Text>
          </Text>

          <Text
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: colors.secondary,
              fontVariant: ['tabular-nums'],
            }}
          >
            <Text style={{ fontWeight: '600', color: colors.text }}>
              {completedCount}
            </Text>
            /{dayTasks.length}
          </Text>
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
                    onPress={() => setPreviewTask(task)}
                    onPendingDelete={handlePendingDelete}
                    isActive={isActive}
                    cardSurface
                    cardBg={colors.card}
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
                {t.common.noTasks}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.common.back}
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
          backgroundColor: isDark ? '#1C222E' : '#23262D',
          borderWidth: isDark ? 1 : 0,
          borderColor: colors.cardBorder,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          zIndex: 40,
          boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
        }}
      >
        <Text style={{ color: isDark ? colors.text : 'white', fontSize: 14, fontWeight: '500' }}>
          {t.alerts.taskDeleted}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t.common.undo} onPress={handleUndo}>
          <Text style={{ color: colors.today, fontSize: 14, fontWeight: '700' }}>
            {t.common.undo}
          </Text>
        </Pressable>
      </View>
    )}
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom: Math.max(insets.bottom + 8, 16), height: 50, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 30 }}>
      <BackButton onPress={returnToList} size={50} />
      <View style={{ flex: 1 }}>
        <BottomTaskInput onAddTask={beginAdding} />
      </View>
    </View>
    <TaskPreviewModal
      visible={!!previewTask}
      task={previewTask}
      onClose={() => setPreviewTask(null)}
      onEdit={(tVal) => {
        setPreviewTask(null);
        beginEditing(tVal);
      }}
      onDelete={(tVal) => {
        setPreviewTask(null);
        handlePendingDelete(tVal);
      }}
    />
    <TaskBottomSheet
      visible={isAdding}
      editingTask={editingTask}
      initialDate={date}
      onClose={closeComposer}
    />
    </View>
  );
}
