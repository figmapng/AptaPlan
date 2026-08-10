import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Task, TaskRepeat } from '@/types/task';
import { usePlanner } from '@/store/planner-store';
import { getTodayKey } from '@/utils/dateHelpers';
import { TaskInput } from './TaskInput';
import { DateChip } from './DateChip';
import { TimeChip } from './TimeChip';
import { RepeatChip } from './RepeatChip';
import { CalendarModal } from './CalendarModal';
import { TimeModal } from './TimeModal';
import { RepeatActionSheet } from './RepeatActionSheet';
import { CustomUnit } from './CustomRepeatModal';

interface TaskBottomSheetProps {
  visible: boolean;
  editingTask?: Task | null;
  initialDate?: string | null;
  onClose: () => void;
  onTaskSaved?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
}

export function TaskBottomSheet({
  visible,
  editingTask = null,
  initialDate,
  onClose,
  onTaskSaved,
  onTaskDeleted,
}: TaskBottomSheetProps) {
  const planner = usePlanner();

  const [title, setTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate || null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedRepeat, setSelectedRepeat] = useState<TaskRepeat | null>('none');
  const [selectedRepeatInterval, setSelectedRepeatInterval] = useState<number>(1);
  const [selectedCustomLabel, setSelectedCustomLabel] = useState<string | undefined>();
  const [selectedCustomUnit, setSelectedCustomUnit] = useState<CustomUnit | undefined>();

  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showRepeatSheet, setShowRepeatSheet] = useState(false);

  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(340)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      if (editingTask) {
        setTitle(editingTask.title);
        setSelectedDate(editingTask.date);
        setSelectedTime(editingTask.time || null);
        setSelectedRepeat(((editingTask.repeat as TaskRepeat) || (editingTask.repeatType as TaskRepeat) || 'none'));
        setSelectedRepeatInterval(editingTask.repeatInterval || 1);
        setSelectedCustomLabel(undefined);
        setSelectedCustomUnit(undefined);
      } else {
        setTitle('');
        setSelectedDate(initialDate || null);
        setSelectedTime(null);
        setSelectedRepeat('none');
        setSelectedRepeatInterval(1);
        setSelectedCustomLabel(undefined);
        setSelectedCustomUnit(undefined);
      }
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 80,
        useNativeDriver: false,
      }).start();
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    } else {
      Animated.timing(translateY, {
        toValue: 340,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    }
  }, [visible, editingTask, initialDate, translateY]);

  const lastKeyboardHeight = useRef(320);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const h = e.endCoordinates.height;
        if (h > 0) {
          lastKeyboardHeight.current = h;
        }
        Animated.timing(keyboardHeightAnim, {
          toValue: h,
          duration: Platform.OS === 'ios' ? e.duration || 250 : 0,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }).start();
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        Animated.timing(keyboardHeightAnim, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? e?.duration || 250 : 0,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }).start();
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardHeightAnim]);

  const handleDismissRequest = () => {
    if (title.trim().length > 0 && !editingTask) {
      Alert.alert('Өзгерістерді сақтамай жабу?', 'Тапсырма сақталмайды.', [
        { text: 'Жалғастыру', style: 'cancel' },
        {
          text: 'Жою',
          style: 'destructive',
          onPress: () => {
            setTitle('');
            onClose();
          },
        },
      ]);
    } else {
      onClose();
    }
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 10,
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy > 0) {
            translateY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 80 || gesture.vy > 0.5) {
            Animated.timing(translateY, {
              toValue: 340,
              duration: 180,
              useNativeDriver: false,
            }).start(() => {
              handleDismissRequest();
            });
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              friction: 8,
              tension: 80,
              useNativeDriver: false,
            }).start();
          }
        },
      }),
    [translateY]
  );

  const handleSend = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      if (process.env.EXPO_OS === 'ios') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      return;
    }

    if (process.env.EXPO_OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const targetDate = selectedDate || getTodayKey();
    if (editingTask) {
      await planner.update(editingTask.id, {
        title: trimmed,
        date: targetDate,
        time: selectedTime,
        repeatType: selectedRepeat as TaskRepeat,
        repeat: selectedRepeat as TaskRepeat,
        repeatInterval: selectedRepeatInterval,
      });
      onTaskSaved?.({
        ...editingTask,
        title: trimmed,
        date: targetDate,
        time: selectedTime,
        repeat: selectedRepeat as TaskRepeat,
        repeatType: selectedRepeat as TaskRepeat,
        repeatInterval: selectedRepeatInterval,
      });
    } else {
      const id = await planner.create({
        title: trimmed,
        date: targetDate,
        time: selectedTime,
        repeatType: selectedRepeat as TaskRepeat,
        repeat: selectedRepeat as TaskRepeat,
        repeatInterval: selectedRepeatInterval,
      });
      onTaskSaved?.({
        id,
        title: trimmed,
        isCompleted: false,
        completed: false,
        date: targetDate,
        time: selectedTime,
        repeat: selectedRepeat as TaskRepeat,
        repeatType: selectedRepeat as TaskRepeat,
        repeatInterval: selectedRepeatInterval,
        note: null,
        priority: 'normal',
        notificationOffset: null,
        notificationId: null,
        sortOrder: 0,
        order: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    setTitle('');
    onClose();
  };

  const isEnabled = title.trim().length > 0;

  const openCalendar = () => {
    Keyboard.dismiss();
    setShowCalendar(true);
  };

  const openTimePicker = () => {
    Keyboard.dismiss();
    setShowTimePicker(true);
  };

  const openRepeatSheet = () => {
    Keyboard.dismiss();
    setShowRepeatSheet(true);
  };

  const closeCalendar = () => {
    keyboardHeightAnim.setValue(lastKeyboardHeight.current);
    inputRef.current?.focus();
    setShowCalendar(false);
  };

  const closeTimePicker = () => {
    keyboardHeightAnim.setValue(lastKeyboardHeight.current);
    inputRef.current?.focus();
    setShowTimePicker(false);
  };

  const closeRepeatSheet = () => {
    keyboardHeightAnim.setValue(lastKeyboardHeight.current);
    inputRef.current?.focus();
    setShowRepeatSheet(false);
  };

  const isPickerOpen = showCalendar || showTimePicker || showRepeatSheet;
  const animatedPaddingBottom = isPickerOpen
    ? lastKeyboardHeight.current + 12
    : Animated.add(keyboardHeightAnim, 12);

  const handleDelete = () => {
    if (!editingTask) return;
    const isRecurring = editingTask.repeatType && editingTask.repeatType !== 'none';
    if (isRecurring) {
      Alert.alert(
        'Қайталанатын тапсырма',
        'Осы қайталанатын тапсырманы қалай өшіргіңіз келеді?',
        [
          {
            text: 'Тек осы күнгіні өшіру',
            style: 'destructive',
            onPress: async () => {
              await planner.remove(editingTask.id, editingTask.date, 'single');
              onClose();
            },
          },
          {
            text: 'Барлық қайталануларды өшіру',
            style: 'destructive',
            onPress: async () => {
              await planner.remove(editingTask.id, editingTask.date, 'all');
              onClose();
            },
          },
          {
            text: 'Болдырмау',
            style: 'cancel',
          },
        ]
      );
    } else {
      Alert.alert(
        'Тапсырманы өшіру',
        'Бұл тапсырманы өшіруді растайсыз ба?',
        [
          {
            text: 'Өшіру',
            style: 'destructive',
            onPress: async () => {
              await planner.remove(editingTask.id, editingTask.date, 'all');
              onClose();
            },
          },
          {
            text: 'Болдырмау',
            style: 'cancel',
          },
        ]
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onShow={() => {
        setTimeout(() => inputRef.current?.focus(), 50);
      }}
      onRequestClose={handleDismissRequest}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleDismissRequest} />

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.sheetContainer,
            {
              transform: [{ translateY }],
              paddingBottom: animatedPaddingBottom,
            },
          ]}
        >
          {/* Top Drag Pill Indicator */}
          <View style={styles.dragHeader}>
            <View style={styles.dragPill} />
          </View>

          {/* Input & Send Button Row */}
          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <TaskInput
                ref={inputRef}
                value={title}
                onChangeText={setTitle}
                onSubmit={handleSend}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Тапсырманы сақтау"
              disabled={!isEnabled}
              onPress={handleSend}
              style={({ pressed }) => [
                styles.sendBtn,
                !isEnabled && styles.sendBtnDisabled,
                pressed && isEnabled && styles.sendBtnPressed,
              ]}
            >
              <ArrowUpIcon color={isEnabled ? '#FFFFFF' : '#9CA3AF'} />
            </Pressable>
          </View>

          {/* Chips Row */}
          <ScrollView
            horizontal
            keyboardShouldPersistTaps="always"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            <DateChip
              date={selectedDate}
              onPress={openCalendar}
            />
            <TimeChip
              time={selectedTime}
              onPress={openTimePicker}
            />
            <RepeatChip
              repeat={selectedRepeat}
              interval={selectedRepeatInterval}
              customLabel={selectedCustomLabel}
              onPress={openRepeatSheet}
            />
            {editingTask && (
              <Pressable
                onPress={handleDelete}
                style={{
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: '#FF3B3014',
                  paddingHorizontal: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 5,
                }}
              >
                <TrashIcon color="#FF3B30" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#FF3B30' }}>Өшіру</Text>
              </Pressable>
            )}
          </ScrollView>
        </Animated.View>

        {/* Child Modals */}
        <CalendarModal
          visible={showCalendar}
          selectedDate={selectedDate}
          onSelectDate={(d) => {
            setSelectedDate(d);
            closeCalendar();
          }}
          onRemoveDate={() => {
            setSelectedDate(null);
            closeCalendar();
          }}
          onClose={closeCalendar}
        />
        <TimeModal
          visible={showTimePicker}
          selectedTime={selectedTime}
          onSelectTime={(t) => {
            setSelectedTime(t);
            closeTimePicker();
          }}
          onRemoveTime={() => {
            setSelectedTime(null);
            closeTimePicker();
          }}
          onClose={closeTimePicker}
        />
        <RepeatActionSheet
          visible={showRepeatSheet}
          selectedRepeat={selectedRepeat}
          selectedRepeatInterval={selectedRepeatInterval}
          selectedCustomLabel={selectedCustomLabel}
          selectedCustomUnit={selectedCustomUnit}
          onSelectRepeat={(r, interval = 1, customLabel, customUnit) => {
            setSelectedRepeat(r);
            setSelectedRepeatInterval(interval);
            setSelectedCustomLabel(customLabel);
            setSelectedCustomUnit(customUnit);
            closeRepeatSheet();
          }}
          onClose={closeRepeatSheet}
        />
      </View>
    </Modal>
  );
}

function ArrowUpIcon({ color = '#FFFFFF' }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 19V5M5 12l7-7 7 7"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.38)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 16,
    paddingTop: 8,
    boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
  },
  dragHeader: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 12,
  },
  inputWrapper: {
    flex: 1,
    minHeight: 50,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#E5E8EB',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 0,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#01B7FF',
    borderWidth: 2,
    borderColor: '#01B7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#E5E7EB',
    borderWidth: 0,
    borderColor: 'transparent',
    opacity: 1,
  },
  sendBtnPressed: {
    transform: [{ scale: 0.94 }],
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 0,
  },
});

function TrashIcon({ color = '#FF3B30', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
