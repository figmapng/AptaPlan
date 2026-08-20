import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useTheme } from '@/hooks/use-theme';
import type { Task, TaskRepeat } from '@/types/task';
import { usePlanner } from '@/store/planner-store';
import { formatFullDate, weekdays } from '@/services/date-service';
import { fromDateKey, getTodayKey } from '@/utils/dateHelpers';
import { CalendarModal } from './CalendarModal';
import { TimeModal } from './TimeModal';
import { RepeatActionSheet } from './RepeatActionSheet';
import { CustomRepeatConfig, describeCustomRepeat } from './CustomRepeatModal';
import { REMINDER_DEFAULT_OFFSET_MINUTES } from '@/services/notification-service';
import { getShortRepeatLabel } from './RepeatChip';

interface TaskDetailModalProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onTaskDeleted?: (taskId: string) => void;
}

export function TaskDetailModal({
  visible,
  task,
  onClose,
  onTaskDeleted,
}: TaskDetailModalProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { update, remove, toggle, create, settings } = usePlanner();

  const [title, setTitle] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayKey());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedRepeat, setSelectedRepeat] = useState<TaskRepeat | null>('none');
  const [selectedRepeatInterval, setSelectedRepeatInterval] = useState<number>(1);
  const [selectedCustomConfig, setSelectedCustomConfig] = useState<CustomRepeatConfig | undefined>();

  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showRepeatSheet, setShowRepeatSheet] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const translateY = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const actionMenuAnim = useRef(new Animated.Value(300)).current;
  const checkScale = useRef(new Animated.Value(1)).current;

  // Initialize state from task
  useEffect(() => {
    if (visible && task) {
      setTitle(task.title || '');
      setIsCompleted(!!task.isCompleted);
      setSelectedDate(task.date || getTodayKey());
      setSelectedTime(task.time || null);
      setSelectedRepeat(((task.repeat as TaskRepeat) || (task.repeatType as TaskRepeat) || 'none'));
      setSelectedRepeatInterval(task.repeatInterval || 1);
      setSelectedCustomConfig(task.repeatConfig ?? undefined);
      setShowActionMenu(false);
      setShowDeleteConfirm(false);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 9,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      setShowActionMenu(false);
      setShowDeleteConfirm(false);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 600,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, task, translateY, backdropOpacity]);

  // Save changes helper
  const saveChanges = async (partial?: Partial<Task>) => {
    if (!task) return;
    const nextTitle = partial?.title !== undefined ? partial.title : title.trim();
    if (!nextTitle) return;

    const nextDate = partial?.date !== undefined ? partial.date : selectedDate;
    const nextTime = partial?.time !== undefined ? partial.time : selectedTime;
    const nextRepeat = partial?.repeat !== undefined ? partial.repeat : selectedRepeat;
    const nextRepeatInterval = partial?.repeatInterval !== undefined ? partial.repeatInterval : selectedRepeatInterval;
    const nextRepeatConfig = partial?.repeatConfig !== undefined ? partial.repeatConfig : selectedCustomConfig;

    const payload = {
      title: nextTitle,
      date: nextDate,
      time: nextTime,
      repeat: nextRepeat,
      repeatType: nextRepeat as any,
      repeatInterval: nextRepeatInterval,
      repeatConfig: nextRepeatConfig,
      notificationOffset: nextTime ? REMINDER_DEFAULT_OFFSET_MINUTES : null,
    };

    try {
      await update(task.id, payload);
    } catch (e) {
      console.warn('Auto-save task error', e);
    }
  };

  const handleClose = async () => {
    Keyboard.dismiss();
    if (title.trim()) {
      await saveChanges();
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 600,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const triggerHaptic = async (style: Haptics.ImpactFeedbackStyle) => {
    if (process.env.EXPO_OS === 'ios' && settings.haptics) {
      await Haptics.impactAsync(style);
    }
  };

  // Toggle completion
  const handleToggle = async () => {
    if (!task) return;
    const nextCompleted = !isCompleted;
    setIsCompleted(nextCompleted);

    Animated.sequence([
      Animated.timing(checkScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(checkScale, { toValue: 1, friction: 4, tension: 300, useNativeDriver: true }),
    ]).start();

    await triggerHaptic(
      nextCompleted
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light
    );
    await toggle(task);
  };

  // Action Menu open/close
  const openActionMenu = () => {
    void triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setShowActionMenu(true);
    Animated.spring(actionMenuAnim, {
      toValue: 0,
      friction: 9,
      tension: 80,
      useNativeDriver: true,
    }).start();
  };

  const closeActionMenu = () => {
    Animated.timing(actionMenuAnim, {
      toValue: 300,
      duration: 180,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setShowActionMenu(false);
      setShowDeleteConfirm(false);
    });
  };

  // Actions
  const handleDuplicate = async () => {
    if (!task) return;
    await triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    closeActionMenu();
    try {
      await create({
        title: `${task.title} (көшірме)`,
        date: task.date,
        time: task.time,
        repeat: task.repeat,
        repeatType: task.repeatType,
        repeatInterval: task.repeatInterval,
        repeatConfig: task.repeatConfig,
      });
      handleClose();
    } catch (e) {
      console.warn(e);
    }
  };

  const handleShare = async () => {
    if (!task) return;
    await triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    closeActionMenu();
    const shareText = `${task.title}${task.time ? ` (${task.time})` : ''}`;
    await Share.share({ message: shareText });
  };

  const handleDeletePress = () => {
    if (!task) return;
    const isRecurring = task.repeatType && task.repeatType !== 'none';
    if (isRecurring) {
      setShowDeleteConfirm(true);
    } else {
      void performDelete('all');
    }
  };

  const performDelete = async (scope: 'single' | 'all') => {
    if (!task) return;
    await triggerHaptic(Haptics.ImpactFeedbackStyle.Rigid);
    closeActionMenu();
    await remove(task.id, task.occurrenceDate || task.date, scope);
    onTaskDeleted?.(task.id);
    handleClose();
  };

  // PanResponder for drag to dismiss
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 12 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 2,
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy > 0) {
            translateY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 120 || gesture.vy > 0.8) {
            handleClose();
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              friction: 9,
              tension: 70,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [translateY]
  );

  const repeatText = useMemo(() => {
    if (!selectedRepeat || selectedRepeat === 'none') return 'Қайталанбайды';
    if (selectedCustomConfig) return describeCustomRepeat(selectedCustomConfig);
    return getShortRepeatLabel(selectedRepeat, selectedRepeatInterval) || 'Қайталанбайды';
  }, [selectedRepeat, selectedRepeatInterval, selectedCustomConfig]);

  const formattedDateText = useMemo(() => {
    try {
      const d = fromDateKey(selectedDate);
      const dayName = weekdays[d.getDay()];
      return `${dayName}, ${formatFullDate(d)}`;
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  if (!task && !visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Bottom Sheet Container */}
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              transform: [{ translateY }],
              paddingBottom: Math.max(insets.bottom + 16, 24),
            },
          ]}
        >
          {/* Header Handle Bar */}
          <View {...panResponder.panHandlers} style={[styles.handleContainer, { backgroundColor: colors.card }]}>
            <View style={[styles.handlePill, { backgroundColor: colors.checkboxBorder }]} />
          </View>

          {/* Top Action Bar (Close & More Options) */}
          <View style={[styles.topBar, { backgroundColor: colors.card }]}>
            {/* Close Button (✕) */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleClose}
              hitSlop={12}
              style={[styles.circleButton, { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder }]}
            >
              <CloseIcon size={16} color={colors.secondary} />
            </TouchableOpacity>

            {/* Title */}
            <Text style={[styles.headerTitle, { color: colors.text }]}>Тапсырма параметрі</Text>

            {/* More Options (•••) */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={openActionMenu}
              hitSlop={12}
              style={[styles.circleButton, { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder }]}
            >
              <MoreHorizontalIcon size={18} color={colors.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.card }]}
          >
            {/* Main Parameters Card */}
            <View style={[styles.mainCard, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
              {/* Checkbox & Title Row */}
              <View style={styles.titleRow}>
                <Animated.View style={{ transform: [{ scale: checkScale }] }}>
                  <Pressable
                    onPress={handleToggle}
                    hitSlop={8}
                    style={[
                      styles.checkbox,
                      { borderColor: colors.checkboxBorder, backgroundColor: colors.card },
                      isCompleted && { borderColor: colors.checkedCheckboxBg, backgroundColor: colors.checkedCheckboxBg },
                    ]}
                  >
                    {isCompleted && <CheckmarkIcon size={12} color="#FFFFFF" />}
                  </Pressable>
                </Animated.View>

                <TextInput
                  value={title}
                  onChangeText={(text) => setTitle(text)}
                  onBlur={() => void saveChanges()}
                  placeholder="Тапсырма атауы..."
                  placeholderTextColor={colors.inputPlaceholder}
                  multiline
                  style={[
                    styles.titleInput,
                    { color: colors.text },
                    isCompleted && styles.completedTitleText,
                  ]}
                />
              </View>

              <View style={[styles.cardDivider, { backgroundColor: colors.inputBorder }]} />

              {/* 📅 Date Row */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowCalendar(true)}
                style={styles.propertyRow}
              >
                <View style={styles.propertyLeft}>
                  <View style={styles.propertyIconContainer}>
                    <CalendarIcon size={18} color={colors.secondary} />
                  </View>
                  <Text style={[styles.propertyLabel, { color: colors.text }]}>Күні</Text>
                </View>
                <View style={styles.propertyRight}>
                  <Text style={[styles.propertyValue, { color: colors.text }]}>{formattedDateText}</Text>
                  <ChevronRightIcon size={16} color={colors.secondary} />
                </View>
              </TouchableOpacity>

              <View style={[styles.cardDivider, { backgroundColor: colors.inputBorder }]} />

              {/* 🕒 Time Row */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowTimePicker(true)}
                style={styles.propertyRow}
              >
                <View style={styles.propertyLeft}>
                  <View style={styles.propertyIconContainer}>
                    <ClockIcon size={18} color={colors.secondary} />
                  </View>
                  <Text style={[styles.propertyLabel, { color: colors.text }]}>Уақыты</Text>
                </View>
                <View style={styles.propertyRight}>
                  <Text style={[styles.propertyValue, { color: colors.text }, !selectedTime && styles.propertyPlaceholder, selectedTime && { color: colors.today, fontWeight: '700' }]}>
                    {selectedTime || 'Таңдалмаған'}
                  </Text>
                  {selectedTime ? (
                    <TouchableOpacity
                      hitSlop={8}
                      onPress={() => {
                        setSelectedTime(null);
                        void saveChanges({ time: null });
                      }}
                      style={styles.clearChip}
                    >
                      <CloseIcon size={12} color={colors.secondary} />
                    </TouchableOpacity>
                  ) : (
                    <ChevronRightIcon size={16} color={colors.secondary} />
                  )}
                </View>
              </TouchableOpacity>

              <View style={[styles.cardDivider, { backgroundColor: colors.inputBorder }]} />

              {/* 🔁 Repeat Row */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowRepeatSheet(true)}
                style={styles.propertyRow}
              >
                <View style={styles.propertyLeft}>
                  <View style={styles.propertyIconContainer}>
                    <RepeatIcon size={18} color={colors.secondary} />
                  </View>
                  <Text style={[styles.propertyLabel, { color: colors.text }]}>Қайталау</Text>
                </View>
                <View style={styles.propertyRight}>
                  <Text style={[styles.propertyValue, { color: colors.text }, selectedRepeat === 'none' && styles.propertyPlaceholder, selectedRepeat !== 'none' && { color: colors.today, fontWeight: '700' }]}>
                    {repeatText}
                  </Text>
                  <ChevronRightIcon size={16} color={colors.secondary} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>
        </Animated.View>

        {/* --- SIBLING SUB-SHEETS (FULL SCREEN SIBLINGS) --- */}

        {/* 1. Calendar Picker Modal */}
        <CalendarModal
          visible={showCalendar}
          selectedDate={selectedDate}
          onSelectDate={(newDate) => {
            setSelectedDate(newDate);
            setShowCalendar(false);
            void saveChanges({ date: newDate });
          }}
          onClose={() => setShowCalendar(false)}
        />

        {/* 2. Time Picker Modal */}
        <TimeModal
          visible={showTimePicker}
          selectedTime={selectedTime}
          onSelectTime={(newTime) => {
            setSelectedTime(newTime);
            setShowTimePicker(false);
            void saveChanges({ time: newTime });
          }}
          onRemoveTime={() => {
            setSelectedTime(null);
            setShowTimePicker(false);
            void saveChanges({ time: null });
          }}
          onClose={() => setShowTimePicker(false)}
        />

        {/* 3. Repeat Action Sheet */}
        <RepeatActionSheet
          visible={showRepeatSheet}
          selectedRepeat={selectedRepeat || 'none'}
          selectedRepeatInterval={selectedRepeatInterval}
          selectedCustomConfig={selectedCustomConfig}
          onSelectRepeat={(repeat, interval, customLabel, customUnit, customConfig) => {
            setSelectedRepeat(repeat);
            setSelectedRepeatInterval(interval || 1);
            setSelectedCustomConfig(customConfig);
            setShowRepeatSheet(false);
            void saveChanges({
              repeat,
              repeatType: repeat as any,
              repeatInterval: interval || 1,
              repeatConfig: customConfig,
            });
          }}
          onClose={() => setShowRepeatSheet(false)}
        />

        {/* 4. Custom (•••) Action Sheet Menu */}
        {showActionMenu && (
          <View style={styles.actionMenuOverlay}>
            <Pressable style={styles.actionMenuBackdrop} onPress={closeActionMenu} />
            <Animated.View
              style={[
                styles.actionMenuContainer,
                {
                  transform: [{ translateY: actionMenuAnim }],
                  paddingBottom: Math.max(insets.bottom + 12, 24),
                },
              ]}
            >
              {!showDeleteConfirm ? (
                <>
                  {/* Actions Card */}
                  <View style={styles.actionGroupCard}>
                    {/* Header Item */}
                    <View style={styles.actionHeaderItem}>
                      <Text style={styles.actionHeaderTitle} numberOfLines={1}>
                        {task?.title || 'Тапсырма'}
                      </Text>
                      <Text style={styles.actionHeaderSub}>Тапсырма әрекеттері</Text>
                    </View>

                    <View style={styles.actionDivider} />

                    {/* Duplicate Action */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handleDuplicate}
                      style={styles.actionRow}
                    >
                      <CopyIcon size={18} color="#1E293B" />
                      <Text style={styles.actionRowText}>Көшірмесін жасау (Дубликат)</Text>
                    </TouchableOpacity>

                    <View style={styles.actionDivider} />

                    {/* Share Action */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handleShare}
                      style={styles.actionRow}
                    >
                      <ShareIcon size={18} color="#1E293B" />
                      <Text style={styles.actionRowText}>Бөлісу</Text>
                    </TouchableOpacity>

                    <View style={styles.actionDivider} />

                    {/* Delete Action */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handleDeletePress}
                      style={styles.actionRow}
                    >
                      <TrashIcon size={18} color="#EF4444" />
                      <Text style={[styles.actionRowText, styles.actionRowTextDestructive]}>
                        Тапсырманы өшіру
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Cancel Button */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={closeActionMenu}
                    style={styles.actionCancelButton}
                  >
                    <Text style={styles.actionCancelText}>Болдырмау</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Delete Options for Recurring Task */}
                  <View style={styles.actionGroupCard}>
                    <View style={styles.actionHeaderItem}>
                      <Text style={styles.actionHeaderTitle}>Қайталанатын тапсырма</Text>
                      <Text style={styles.actionHeaderSub}>Өшіру әдісін таңдаңыз:</Text>
                    </View>

                    <View style={styles.actionDivider} />

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => performDelete('single')}
                      style={styles.actionRow}
                    >
                      <TrashIcon size={18} color="#EF4444" />
                      <Text style={[styles.actionRowText, styles.actionRowTextDestructive]}>
                        Тек осы күнгіні өшіру
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.actionDivider} />

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => performDelete('all')}
                      style={styles.actionRow}
                    >
                      <TrashIcon size={18} color="#DC2626" />
                      <Text style={[styles.actionRowText, styles.actionRowTextDestructive, { fontWeight: '700' }]}>
                        Барлық қайталануларды өшіру
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Cancel Button */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowDeleteConfirm(false)}
                    style={styles.actionCancelButton}
                  >
                    <Text style={styles.actionCancelText}>Болдырмау</Text>
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Icons
function CloseIcon({ size = 16, color = '#374151' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MoreHorizontalIcon({ size = 18, color = '#374151' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="1.5" fill={color} />
      <Circle cx="19" cy="12" r="1.5" fill={color} />
      <Circle cx="5" cy="12" r="1.5" fill={color} />
    </Svg>
  );
}

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

function CalendarIcon({ size = 16, color = '#4B5563' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Rect x="1.75" y="2.75" width="12.5" height="11" rx="2.25" stroke={color} strokeWidth="1.3" />
      <Path d="M1.75 6.25H14.25" stroke={color} strokeWidth="1.3" />
      <Path d="M4.75 1.5V3.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M11.25 1.5V3.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <Circle cx="5" cy="9.5" r="0.8" fill={color} />
    </Svg>
  );
}

function ClockIcon({ size = 16, color = '#4B5563' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Circle cx="8" cy="8" r="6.25" stroke={color} strokeWidth="1.3" />
      <Path d="M8 4.75V8L10.25 9.75" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function RepeatIcon({ size = 16, color = '#4B5563' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M13.5 3.5H4.5C3.11929 3.5 2 4.61929 2 6V6.5M11 1L13.5 3.5L11 6"
        stroke={color}
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M2.5 12.5H11.5C12.8807 12.5 14 11.3807 14 10V9.5M5 15L2.5 12.5L5 10"
        stroke={color}
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRightIcon({ size = 16, color = '#9CA3AF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18l6-6-6-6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CopyIcon({ size = 18, color = '#1E293B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="9" y="9" width="13" height="13" rx="2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ShareIcon({ size = 18, color = '#1E293B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 6l-4-4-4 4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 2v13" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TrashIcon({ size = 18, color = '#EF4444' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    minHeight: 320,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 24,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  handlePill: {
    width: 38,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: '#E5E7EB',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  circleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#F0F2F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.8,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxCompleted: {
    borderColor: colors.checkedCheckboxBg,
    backgroundColor: colors.checkedCheckboxBg,
  },
  titleInput: {
    flex: 1,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '500',
    color: '#0F172A',
    paddingTop: 0,
    paddingBottom: 0,
  },
  completedTitleText: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E2E8F0',
    marginLeft: 38,
  },
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  propertyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  propertyIconContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyLabel: {
    fontSize: 15.5,
    fontWeight: '500',
    color: '#1E293B',
    letterSpacing: -0.2,
  },
  propertyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '62%',
  },
  propertyValue: {
    fontSize: 14.5,
    fontWeight: '400',
    color: '#64748B',
  },
  propertyValueActive: {
    color: '#0F172A',
    fontWeight: '500',
  },
  propertyPlaceholder: {
    color: '#94A3B8',
  },
  clearChip: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  // Custom Action Menu Styles
  actionMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 10000,
    elevation: 10000,
  },
  actionMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  actionMenuContainer: {
    paddingHorizontal: 12,
    gap: 8,
  },
  actionGroupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  actionHeaderItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  actionHeaderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  actionHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  actionRowText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
  },
  actionRowTextDestructive: {
    color: '#EF4444',
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  actionCancelButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  actionCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0284C7',
  },
});
