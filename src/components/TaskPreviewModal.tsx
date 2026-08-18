import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import type { Task, TaskRepeat } from '@/types/task';
import { usePlanner } from '@/store/planner-store';
import { formatFullDate } from '@/services/date-service';
import { fromDateKey, formatTaskDisplayDate } from '@/utils/dateHelpers';
import { AnimatedPressable } from './AnimatedPressable';
import { CalendarModal } from './CalendarModal';
import { TimeModal } from './TimeModal';
import { RepeatActionSheet } from './RepeatActionSheet';
import { CustomRepeatConfig, CustomRepeatModal, describeCustomRepeat } from './CustomRepeatModal';

interface TaskPreviewModalProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

export function TaskPreviewModal({
  visible,
  task,
  onClose,
  onEdit,
  onDelete,
}: TaskPreviewModalProps) {
  const insets = useSafeAreaInsets();
  const { toggle, update, remove, settings } = usePlanner();

  const [currentTask, setCurrentTask] = useState<Task | null>(task);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showRepeatSheet, setShowRepeatSheet] = useState(false);
  const [showCustomRepeat, setShowCustomRepeat] = useState(false);

  const translateY = useRef(new Animated.Value(400)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && task) {
      setCurrentTask(task);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 9,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 400,
          duration: 180,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, task]);

  if (!visible && !currentTask) return null;
  const t = currentTask || task;
  if (!t) return null;

  const triggerHaptic = async (style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS === 'ios' && settings.haptics) {
      await Haptics.impactAsync(style);
    }
  };

  const handleToggleDone = async () => {
    await triggerHaptic(
      t.isCompleted ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
    );
    const updated = { ...t, isCompleted: !t.isCompleted };
    setCurrentTask(updated);
    await toggle(t);
  };

  const handleDateSelect = async (newDate: string | null) => {
    if (!newDate) return;
    const updated = { ...t, date: newDate };
    setCurrentTask(updated);
    await update(t.id, {
      title: t.title,
      note: t.note,
      date: newDate,
      time: t.time,
      priority: t.priority,
      repeatType: t.repeatType,
      repeatInterval: t.repeatInterval,
      repeatConfig: t.repeatConfig,
    });
  };

  const handleTimeSelect = async (newTime: string | null) => {
    const updated = { ...t, time: newTime };
    setCurrentTask(updated);
    await update(t.id, {
      title: t.title,
      note: t.note,
      date: t.date,
      time: newTime,
      priority: t.priority,
      repeatType: t.repeatType,
      repeatInterval: t.repeatInterval,
      repeatConfig: t.repeatConfig,
    });
  };

  const handleRepeatSelect = async (type: TaskRepeat, interval?: number, config?: CustomRepeatConfig) => {
    const updated = {
      ...t,
      repeatType: type,
      repeatInterval: interval || 1,
      repeatConfig: config || null,
    };
    setCurrentTask(updated);
    await update(t.id, {
      title: t.title,
      note: t.note,
      date: t.date,
      time: t.time,
      priority: t.priority,
      repeatType: type,
      repeatInterval: interval || 1,
      repeatConfig: config || null,
    });
  };

  const handleDelete = () => {
    Alert.alert('Тапсырманы өшіру', 'Бұл тапсырманы өшіргіңіз келе ме?', [
      { text: 'Болдырмау', style: 'cancel' },
      {
        text: 'Өшіру',
        style: 'destructive',
        onPress: async () => {
          onClose();
          if (onDelete) {
            onDelete(t);
          } else {
            await remove(t.id, t.occurrenceDate || t.date, 'all');
          }
        },
      },
    ]);
  };

  const handleEdit = () => {
    onClose();
    onEdit(t);
  };

  const repeatLabel = t.repeatConfig
    ? describeCustomRepeat(t.repeatConfig)
    : t.repeatType && t.repeatType !== 'none'
    ? t.repeatType === 'daily'
      ? 'Күнде'
      : t.repeatType === 'weekdays'
      ? 'Дүйсенбі - Жұма'
      : t.repeatType === 'weekly'
      ? 'Апта сайын'
      : t.repeatType === 'monthly'
      ? 'Ай сайын'
      : t.repeatType === 'yearly'
      ? 'Жыл сайын'
      : null
    : null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        {/* Content Container */}
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              transform: [{ translateY }],
              paddingBottom: Math.max(insets.bottom + 16, 24),
            },
          ]}
        >
          {/* Main Task Card */}
          <View style={styles.taskCard}>
            {/* Header: Checkbox + Title */}
            <View style={styles.taskHeaderRow}>
              <Pressable
                onPress={handleToggleDone}
                style={[
                  styles.checkbox,
                  t.isCompleted && styles.checkboxCompleted,
                ]}
                hitSlop={8}
              >
                {t.isCompleted && (
                  <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                )}
              </Pressable>

              <Text
                style={[
                  styles.taskTitle,
                  t.isCompleted && styles.taskTitleCompleted,
                ]}
              >
                {t.title}
              </Text>
            </View>

            {/* Note / Description */}
            {t.note ? (
              <Text style={styles.taskNote}>{t.note}</Text>
            ) : null}

            {/* Meta Tags Row */}
            <View style={styles.metaRow}>
              {/* Date & Time Text */}
              <View style={styles.dateBadge}>
                <Ionicons name="calendar-outline" size={13} color={colors.secondary} />
                <Text style={styles.dateBadgeText}>
                  {formatTaskDisplayDate(t.date)}
                  {t.time ? ` · ${t.time}` : ''}
                </Text>
              </View>

              {/* Repeat Tag if set */}
              {repeatLabel ? (
                <View style={styles.repeatBadge}>
                  <Ionicons name="repeat-outline" size={13} color={colors.today} />
                  <Text style={styles.repeatBadgeText}>{repeatLabel}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Floating Action Dock (Circled in red in design) */}
          <View style={styles.actionDockRow}>
            {/* Done / Toggle Pill Button */}
            <AnimatedPressable
              activeScale={0.94}
              onPress={handleToggleDone}
              style={[
                styles.doneButton,
                t.isCompleted && styles.doneButtonCompleted,
              ]}
            >
              <Ionicons
                name={t.isCompleted ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={19}
                color="#FFFFFF"
              />
              <Text style={styles.doneButtonText}>
                {t.isCompleted ? 'Орындалды' : 'Орындау'}
              </Text>
            </AnimatedPressable>

            {/* Action Buttons Capsule */}
            <View style={styles.actionCapsule}>
              {/* Date Action */}
              <AnimatedPressable
                activeScale={0.88}
                onPress={() => setShowCalendar(true)}
                style={styles.actionIconBtn}
                hitSlop={6}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={t.date ? colors.today : '#4A5568'}
                />
              </AnimatedPressable>

              {/* Time Action */}
              <AnimatedPressable
                activeScale={0.88}
                onPress={() => setShowTimePicker(true)}
                style={styles.actionIconBtn}
                hitSlop={6}
              >
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={t.time ? colors.today : '#4A5568'}
                />
              </AnimatedPressable>

              {/* Repeat Action */}
              <AnimatedPressable
                activeScale={0.88}
                onPress={() => setShowRepeatSheet(true)}
                style={styles.actionIconBtn}
                hitSlop={6}
              >
                <Ionicons
                  name="repeat-outline"
                  size={20}
                  color={t.repeatType && t.repeatType !== 'none' ? colors.today : '#4A5568'}
                />
              </AnimatedPressable>

              {/* Edit Full Task Action */}
              <AnimatedPressable
                activeScale={0.88}
                onPress={handleEdit}
                style={styles.actionIconBtn}
                hitSlop={6}
              >
                <Ionicons name="create-outline" size={20} color="#4A5568" />
              </AnimatedPressable>

              {/* Delete Action */}
              <AnimatedPressable
                activeScale={0.88}
                onPress={handleDelete}
                style={styles.actionIconBtn}
                hitSlop={6}
              >
                <Ionicons name="trash-outline" size={20} color="#FF4B3E" />
              </AnimatedPressable>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Sub-modals for quick date / time / repeat edits */}
      <CalendarModal
        visible={showCalendar}
        selectedDate={t.date}
        onSelectDate={(newDate) => {
          void handleDateSelect(newDate);
          setShowCalendar(false);
        }}
        onRemoveDate={() => {
          void handleDateSelect(null);
          setShowCalendar(false);
        }}
        onClose={() => setShowCalendar(false)}
      />

      <TimeModal
        visible={showTimePicker}
        selectedTime={t.time || null}
        onSelectTime={(newTime) => {
          void handleTimeSelect(newTime);
          setShowTimePicker(false);
        }}
        onRemoveTime={() => {
          void handleTimeSelect(null);
          setShowTimePicker(false);
        }}
        onClose={() => setShowTimePicker(false)}
      />

      <RepeatActionSheet
        visible={showRepeatSheet}
        selectedRepeat={((t.repeat as TaskRepeat) || (t.repeatType as TaskRepeat) || 'none')}
        selectedRepeatInterval={t.repeatInterval || 1}
        selectedCustomConfig={t.repeatConfig ?? undefined}
        onClose={() => setShowRepeatSheet(false)}
        onSelectRepeat={(r, interval = 1, customLabel, customUnit, customConfig) => {
          void handleRepeatSelect(r, interval, customConfig);
          setShowRepeatSheet(false);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  sheetContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#ECEEF2',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 10,
  },
  taskHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: '#FFFFFF',
  },
  checkboxCompleted: {
    backgroundColor: colors.today,
    borderColor: colors.today,
  },
  taskTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 23,
    letterSpacing: -0.2,
  },
  taskTitleCompleted: {
    color: colors.secondary,
    textDecorationLine: 'line-through',
  },
  taskNote: {
    fontSize: 14,
    fontWeight: '400',
    color: '#4A5568',
    lineHeight: 20,
    marginTop: 10,
    paddingLeft: 34,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingLeft: 34,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.inputBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  dateBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.secondary,
  },
  repeatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#01B7FF12',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#01B7FF30',
  },
  repeatBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.today,
  },
  actionDockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  doneButton: {
    height: 50,
    paddingHorizontal: 18,
    borderRadius: 25,
    backgroundColor: colors.today,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  doneButtonCompleted: {
    backgroundColor: '#34C759',
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionCapsule: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#ECEEF2',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  actionIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
