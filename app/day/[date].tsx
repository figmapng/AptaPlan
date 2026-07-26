import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Keyboard, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { format, isToday } from 'date-fns';
import { colors } from '@/constants/colors';
import { fromDateKey, months, toDateKey, weekdays } from '@/services/date-service';
import { usePlanner } from '@/store/planner-store';
import { TaskRow } from '@/components/task-row';
import { BackToListIcon } from '@/components/back-to-list-icon';
import { useCardTransition } from '@/components/card-transition-provider';
import { TaskBottomSheet } from '@/components/TaskBottomSheet';
import { SortableTaskList } from '@/components/SortableTaskList';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import type { Task } from '@/types/task';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDatabase } from '@/database/database';

export default function DayScreen() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { date, add } = useLocalSearchParams<{ date: string; add?: string }>();
  const { tasks, settings, loadRange, create, update, remove } = usePlanner();
  const { closeCard, beginInteractiveClose, updateInteractiveClose, endInteractiveClose } = useCardTransition();
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDate, setDraftDate] = useState(date);
  const [draftTime, setDraftTime] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerTime, setPickerTime] = useState(new Date());
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<Task | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);
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
    if (settings.haptics && process.env.EXPO_OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setPendingDeleteTask(null);
  };

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
    await loadRange(date, date);
  }, [date, loadRange]);

  useEffect(() => {
    if (date) void loadRange(date, date);
  }, [date, loadRange]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => setKeyboardHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const selectedDate = fromDateKey(date);
  const dayTasks = tasks.filter((task) => task.date === date);
  const completedCount = dayTasks.filter((task) => task.isCompleted).length;
  const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
  const isSelectedToday = isToday(selectedDate);
  const activeDayColor = '#9FAABA';
  // Fixed back button: 28px from bottom, 42px high, with another 28px gap above it.
  const cardMaxHeight = Math.max(220, windowHeight - insets.top - 102);
  const taskAreaMaxHeight = cardMaxHeight - 48;
  const returnToList = () => {
    closeCard();
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
    setDraftDate(date);
    setDraftTitle('');
    setDraftTime(null);
    const initialTime = fromDateKey(date);
    initialTime.setHours(new Date().getHours(), new Date().getMinutes(), 0, 0);
    setPickerTime(initialTime);
    setIsAdding(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  useEffect(() => {
    if (add === '1') requestAnimationFrame(beginAdding);
  }, [add, date]);
  const beginEditing = (task: Task) => {
    setEditingTask(task);
    setDraftDate(task.date);
    setDraftTitle(task.title);
    setDraftTime(task.time || null);
    const initialTime = new Date();
    if (task.time) {
      const [hours, minutes] = task.time.split(':').map(Number);
      initialTime.setHours(hours, minutes, 0, 0);
    }
    setPickerTime(initialTime);
    setIsAdding(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const closeComposer = () => {
    setIsAdding(false);
    setShowTimePicker(false);
    setEditingTask(null);
  };
  const saveInlineTask = async () => {
    const title = draftTitle.trim();
    if (!title) {
      return;
    }
    const input = {
      title,
      date: draftDate,
      time: draftTime,
      note: editingTask?.note ?? null,
      priority: editingTask?.priority ?? 'normal',
      repeatType: editingTask?.repeatType ?? 'none',
      notificationOffset: draftTime ? 10 : null,
    } as const;
    if (editingTask) await update(editingTask.id, input);
    else await create(input);
    closeComposer();
  };
  const deleteEditingTask = () => {
    if (!editingTask) return;
    Alert.alert('Тапсырманы өшіру', 'Бұл тапсырманы өшіргіңіз келе ме?', [
      { text: 'Болдырмау', style: 'cancel' },
      { text: 'Өшіру', style: 'destructive', onPress: () => void remove(editingTask.id).then(closeComposer) },
    ]);
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
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 20,
          borderCurve: 'continuous',
          overflow: 'hidden',
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
            <Text style={{ color: isWeekend ? colors.weekend : colors.text, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
              {format(selectedDate, 'dd')} {months[selectedDate.getMonth()]}
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
          contentContainerStyle={{ paddingHorizontal: 4, paddingTop: 10, paddingBottom: 16 }}
        >
          {dayTasks.length ? (
            <SortableTaskList
              data={dayTasks}
              keyExtractor={(task) => `${task.id}:${task.date}`}
              onReorder={(newData) => void handleReorder(newData)}
              onScrollEnabledChange={handleScrollEnabled}
              onAutoScroll={handleAutoScroll}
              gap={4}
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
          ) : (
            <Text style={{ color: colors.secondary, fontSize: 17, paddingVertical: 28, textAlign: 'center' }}>Тапсырма жоқ</Text>
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
          boxShadow: '0 2px 8px rgba(31,32,38,0.08)',
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
          boxShadow: '0 2px 8px rgba(31,32,38,0.08)',
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

function BellGlyph({ color = colors.secondary, size = 22 }: { color?: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M5.5 17h13l-1.8-2.4V10a4.7 4.7 0 0 0-9.4 0v4.6L5.5 17ZM10 20h4" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
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
