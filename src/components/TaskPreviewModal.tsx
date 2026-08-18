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
import Svg, { Path } from 'react-native-svg';
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
import { CustomRepeatConfig, describeCustomRepeat } from './CustomRepeatModal';

function CheckmarkIcon({ size = 12, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.5 12.75l6 6 9-13.5"
        stroke={color}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CalendarIcon({ color = '#23262D', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M1.6665 10C1.6665 6.85734 1.6665 5.286 2.64281 4.30968C3.61913 3.33337 5.19047 3.33337 8.33317 3.33337H11.6665C14.8092 3.33337 16.3806 3.33337 17.3568 4.30968C18.3332 5.286 18.3332 6.85734 18.3332 10V11.6667C18.3332 14.8094 18.3332 16.3808 17.3568 17.357C16.3806 18.3334 14.8092 18.3334 11.6665 18.3334H8.33317C5.19047 18.3334 3.61913 18.3334 2.64281 17.357C1.6665 16.3808 1.6665 14.8094 1.6665 11.6667V10Z"
        stroke={color}
        strokeWidth="1.5"
      />
      <Path d="M5.8335 3.33337V2.08337" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M14.1665 3.33337V2.08337" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M2.0835 7.5H17.9168" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M15.0002 14.1667C15.0002 14.627 14.6271 15 14.1668 15C13.7066 15 13.3335 14.627 13.3335 14.1667C13.3335 13.7065 13.7066 13.3334 14.1668 13.3334C14.6271 13.3334 15.0002 13.7065 15.0002 14.1667Z" fill={color} />
      <Path d="M15.0002 10.8333C15.0002 11.2936 14.6271 11.6667 14.1668 11.6667C13.7066 11.6667 13.3335 11.2936 13.3335 10.8333C13.3335 10.3731 13.7066 10 14.1668 10C14.6271 10 15.0002 10.3731 15.0002 10.8333Z" fill={color} />
      <Path d="M10.8332 14.1667C10.8332 14.627 10.4601 15 9.99984 15C9.53959 15 9.1665 14.627 9.1665 14.1667C9.1665 13.7065 9.53959 13.3334 9.99984 13.3334C10.4601 13.3334 10.8332 13.7065 10.8332 14.1667Z" fill={color} />
      <Path d="M10.8332 10.8333C10.8332 11.2936 10.4601 11.6667 9.99984 11.6667C9.53959 11.6667 9.1665 11.2936 9.1665 10.8333C9.1665 10.3731 9.53959 10 9.99984 10C10.4601 10 10.8332 10.3731 10.8332 10.8333Z" fill={color} />
      <Path d="M6.66667 14.1667C6.66667 14.627 6.29357 15 5.83333 15C5.3731 15 5 14.627 5 14.1667C5 13.7065 5.3731 13.3334 5.83333 13.3334C6.29357 13.3334 6.66667 13.7065 6.66667 14.1667Z" fill={color} />
      <Path d="M6.66667 10.8333C6.66667 11.2936 6.29357 11.6667 5.83333 11.6667C5.3731 11.6667 5 11.2936 5 10.8333C5 10.3731 5.3731 10 5.83333 10C6.29357 10 6.66667 10.3731 6.66667 10.8333Z" fill={color} />
    </Svg>
  );
}

function ClockIcon({ color = '#23262D', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 18.3334C14.1421 18.3334 17.5 14.9755 17.5 10.8334C17.5 6.69124 14.1421 3.33337 10 3.33337C5.85786 3.33337 2.5 6.69124 2.5 10.8334C2.5 14.9755 5.85786 18.3334 10 18.3334Z"
        stroke={color}
        strokeWidth="1.5"
      />
      <Path
        d="M10 7.5V10.8333L12.0833 12.9167"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M2.9165 3.74996L6.24985 1.66663"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M17.0835 3.74996L13.7502 1.66663"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function RepeatIcon({ color = '#23262D', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M16.5 4.5H5.5C3.84315 4.5 2.5 5.84315 2.5 7.5V8M13.5 1.5L16.5 4.5L13.5 7.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3.5 15.5H14.5C16.1569 15.5 17.5 14.1569 17.5 12.5V12M6.5 18.5L3.5 15.5L6.5 12.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function EditIcon({ color = '#23262D', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M14.1667 2.5L17.5 5.83333L6.66667 16.6667H3.33333V13.3333L14.1667 2.5Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrashIcon({ color = '#FF4B3E', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

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
                  <CheckmarkIcon size={12} color="#FFFFFF" />
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
                <CalendarIcon size={14} color={colors.secondary} />
                <Text style={styles.dateBadgeText}>
                  {formatTaskDisplayDate(t.date)}
                  {t.time ? ` · ${t.time}` : ''}
                </Text>
              </View>

              {/* Repeat Tag if set */}
              {repeatLabel ? (
                <View style={styles.repeatBadge}>
                  <RepeatIcon size={14} color={colors.secondary} />
                  <Text style={styles.repeatBadgeText}>{repeatLabel}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Floating Action Dock */}
          <View style={styles.actionDockRow}>
            {/* Action Buttons Capsule with vertical dividers */}
            <View style={styles.actionCapsule}>
              {/* Date Action */}
              <AnimatedPressable
                activeScale={0.88}
                onPress={() => setShowCalendar(true)}
                style={styles.actionIconBtn}
                hitSlop={6}
              >
                <CalendarIcon
                  size={19}
                  color={t.date ? colors.today : '#5E6778'}
                />
              </AnimatedPressable>

              <View style={styles.dockDivider} />

              {/* Time Action */}
              <AnimatedPressable
                activeScale={0.88}
                onPress={() => setShowTimePicker(true)}
                style={styles.actionIconBtn}
                hitSlop={6}
              >
                <ClockIcon
                  size={19}
                  color={t.time ? colors.today : '#5E6778'}
                />
              </AnimatedPressable>

              <View style={styles.dockDivider} />

              {/* Repeat Action */}
              <AnimatedPressable
                activeScale={0.88}
                onPress={() => setShowRepeatSheet(true)}
                style={styles.actionIconBtn}
                hitSlop={6}
              >
                <RepeatIcon
                  size={19}
                  color={t.repeatType && t.repeatType !== 'none' ? colors.today : '#5E6778'}
                />
              </AnimatedPressable>

              <View style={styles.dockDivider} />

              {/* Edit Full Task Action */}
              <AnimatedPressable
                activeScale={0.88}
                onPress={handleEdit}
                style={styles.actionIconBtn}
                hitSlop={6}
              >
                <EditIcon size={19} color="#5E6778" />
              </AnimatedPressable>
            </View>

            {/* Standalone Delete Button */}
            <AnimatedPressable
              activeScale={0.88}
              onPress={handleDelete}
              style={styles.deleteButtonStandalone}
              hitSlop={6}
            >
              <TrashIcon size={20} color="#FF4B3E" />
            </AnimatedPressable>
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
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: '#FFFFFF',
  },
  checkboxCompleted: {
    backgroundColor: colors.checkedCheckboxBg,
    borderColor: colors.checkedCheckboxBg,
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
    backgroundColor: colors.inputBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  repeatBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.secondary,
  },
  actionDockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#ECEEF2',
  },
  deleteButtonStandalone: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFD8D6',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
});
