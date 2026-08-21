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
import { colors } from '@/constants/colors';
import { usePlanner } from '@/store/planner-store';
import { useTheme } from '@/hooks/use-theme';
import { getTodayKey } from '@/utils/dateHelpers';
import { TaskInput } from './TaskInput';
import { DateChip } from './DateChip';
import { TimeChip } from './TimeChip';
import { RepeatChip } from './RepeatChip';
import { CalendarModal } from './CalendarModal';
import { TimeModal } from './TimeModal';
import { RepeatActionSheet } from './RepeatActionSheet';
import { CustomRepeatConfig, CustomUnit, describeCustomRepeat } from './CustomRepeatModal';
import { REMINDER_DEFAULT_OFFSET_MINUTES } from '@/services/notification-service';

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
  const { colors } = useTheme();

  const [title, setTitle] = useState('');
  const [titleInputHeight, setTitleInputHeight] = useState(24);
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate || null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedRepeat, setSelectedRepeat] = useState<TaskRepeat | null>('none');
  const [selectedRepeatInterval, setSelectedRepeatInterval] = useState<number>(1);
  const [selectedCustomLabel, setSelectedCustomLabel] = useState<string | undefined>();
  const [selectedCustomUnit, setSelectedCustomUnit] = useState<CustomUnit | undefined>();
  const [selectedCustomConfig, setSelectedCustomConfig] = useState<CustomRepeatConfig | undefined>();

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
        setTitleInputHeight(24);
        setSelectedDate(editingTask.date);
        setSelectedTime(editingTask.time || null);
        setSelectedRepeat(((editingTask.repeat as TaskRepeat) || (editingTask.repeatType as TaskRepeat) || 'none'));
        setSelectedRepeatInterval(editingTask.repeatInterval || 1);
        setSelectedCustomLabel(editingTask.repeatConfig ? describeCustomRepeat(editingTask.repeatConfig) : undefined);
        setSelectedCustomUnit(editingTask.repeatConfig?.unit ?? undefined);
        setSelectedCustomConfig(editingTask.repeatConfig ?? undefined);
      } else {
        setTitle('');
        setTitleInputHeight(24);
        setSelectedDate(initialDate || null);
        setSelectedTime(null);
        setSelectedRepeat('none');
        setSelectedRepeatInterval(1);
        setSelectedCustomLabel(undefined);
        setSelectedCustomUnit(undefined);
        setSelectedCustomConfig(undefined);
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

  const isDirty = editingTask
    ? title.trim() !== editingTask.title ||
      selectedDate !== editingTask.date ||
      selectedTime !== (editingTask.time || null)
    : title.trim().length > 0;

  const handleDismissRequest = () => {
    if (isDirty) {
      Alert.alert('Өзгерістерді сақтамай жабу?', 'Енгізілген өзгерістер сақталмайды.', [
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

  const handleDismissRef = useRef(handleDismissRequest);
  handleDismissRef.current = handleDismissRequest;

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
              handleDismissRef.current();
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
    const base = {
      title: trimmed,
      date: targetDate,
      time: selectedTime,
      repeatType: (selectedRepeat ?? 'none') as TaskRepeat,
      repeat: (selectedRepeat ?? 'none') as TaskRepeat,
      repeatInterval: selectedRepeatInterval,
      repeatConfig: selectedCustomConfig ?? null,
      notificationOffset: selectedTime ? REMINDER_DEFAULT_OFFSET_MINUTES : null,
    };

    try {
      if (editingTask) {
        const next = {
          ...base,
          note: editingTask.note ?? null,
          priority: editingTask.priority ?? 'normal',
        };
        await planner.update(editingTask.id, next);
        await planner.refresh();
        onTaskSaved?.({ ...editingTask, ...next });
      } else {
        const id = await planner.create(base);
        onTaskSaved?.({
          id,
          ...base,
          isCompleted: false,
          note: null,
          priority: 'normal',
          notificationId: null,
          sortOrder: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      setTitle('');
      onClose();
    } catch (error) {
      console.warn('Task save failed', error);
      Alert.alert('Сақталмады', 'Өзгерісті сақтау кезінде қате шықты. Қайтадан көріңіз.');
    }
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
      <View style={[styles.overlay, { backgroundColor: colors.modalOverlay }]}>
        <Pressable style={styles.backdrop} onPress={handleDismissRequest} />

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.sheetBg,
              transform: [{ translateY }],
              paddingBottom: animatedPaddingBottom,
            },
          ]}
        >
          {/* Input & Send Button Row (Send button inside input) */}
          <View style={styles.inputRow}>
              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }, { minHeight: Math.max(52, titleInputHeight + 10) }]}>
                <View style={styles.inputContent}>
                  <TaskInput
                  ref={inputRef}
                  value={title}
                  onChangeText={setTitle}
                  onHeightChange={setTitleInputHeight}
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
                  {
                    backgroundColor: isEnabled ? colors.today : colors.inputBorder,
                    borderColor: isEnabled ? colors.todayDark : 'transparent',
                  },
                  pressed && isEnabled && styles.sendBtnPressed,
                ]}
              >
                {editingTask ? (
                  <CheckIcon color={isEnabled ? '#FFFFFF' : colors.inputPlaceholder} />
                ) : (
                  <ArrowUpIcon color={isEnabled ? '#FFFFFF' : colors.inputPlaceholder} />
                )}
              </Pressable>
            </View>
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
          selectedCustomConfig={selectedCustomConfig}
          onSelectRepeat={(r, interval = 1, customLabel, customUnit, customConfig) => {
            setSelectedRepeat(r);
            setSelectedRepeatInterval(interval);
            setSelectedCustomLabel(customLabel);
            setSelectedCustomUnit(customUnit);
            setSelectedCustomConfig(customConfig);
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

function CheckIcon({ color = '#FFFFFF' }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="m5 12 4 4L19 6"
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
    backgroundColor: colors.sheetBg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 16,
    paddingTop: 20,
    boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
  },
  inputRow: {
    marginTop: 0,
    marginBottom: 12,
  },
  inputWrapper: {
    position: 'relative',
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 26,
    paddingLeft: 16,
    paddingRight: 5,
    paddingVertical: 5,
    backgroundColor: colors.inputBg,
  },
  inputContent: {
    position: 'absolute',
    top: 5,
    right: 52,
    bottom: 5,
    left: 16,
    justifyContent: 'center',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 5,
    bottom: 5,
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
