import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import type { Task, TaskRepeat } from '@/types/task';
import { usePlanner } from '@/store/planner-store';
import { useCardTransition } from './card-transition-provider';
import { getShortRepeatLabel } from './RepeatChip';
import { describeCustomRepeat } from './CustomRepeatModal';
import { formatTaskDisplayDate, getTodayKey } from '@/utils/dateHelpers';

export const TaskRow = React.memo(function TaskRow({
  task,
  compact = false,
  isLast = false,
  onPress,
  isActive = false,
  onInteraction,
  onPendingDelete,
  isSwipingRef,
  onSwipeX,
  onScrollEnabledChange,
  cardBg = '#FFFFFF',
  cardSurface = false,
  singleLine = false,
  showDate = false,
}: {
  task: Task;
  compact?: boolean;
  isLast?: boolean;
  onPress?: () => void;
  isActive?: boolean;
  onInteraction?: () => void;
  onPendingDelete?: (task: Task) => void;
  isSwipingRef?: React.RefObject<boolean>;
  onSwipeX?: (anim: Animated.Value, onDelete: () => void) => void;
  onScrollEnabledChange?: (enabled: boolean) => void;
  cardBg?: string;
  cardSurface?: boolean;
  singleLine?: boolean;
  showDate?: boolean;
}) {
  const { toggle, remove, settings } = usePlanner();
  const { progress: transitionProgress, activeDate } = useCardTransition();
  const [isDeleting, setIsDeleting] = useState(false);

  const checkScale = useRef(new Animated.Value(task.isCompleted ? 1 : 0)).current;
  const boxScale = useRef(new Animated.Value(1)).current;
  const rowOpacity = useRef(new Animated.Value(task.isCompleted ? 0.55 : 1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(checkScale, {
        toValue: task.isCompleted ? 1 : 0,
        tension: 300,
        friction: 20,
        useNativeDriver: false,
      }),
      Animated.spring(rowOpacity, {
        toValue: task.isCompleted ? 0.55 : 1,
        tension: 300,
        friction: 20,
        useNativeDriver: false,
      }),
    ]).start();
  }, [task.isCompleted, checkScale, rowOpacity]);

  const swipeX = useRef(new Animated.Value(0)).current;
  const rowHeightAnim = useRef(new Animated.Value(1)).current;
  const rowOpacityAnim = useRef(new Animated.Value(1)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  const onToggle = async () => {
    onInteraction?.();
    await triggerHaptic(
      task.isCompleted
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium
    );
    await toggle(task);
  };

  const triggerHaptic = async (style: Haptics.ImpactFeedbackStyle) => {
    if (process.env.EXPO_OS === 'ios' && settings.haptics) {
      await Haptics.impactAsync(style);
    }
  };

  const resetSwipe = () => {
    Animated.spring(swipeX, {
      toValue: 0,
      stiffness: 340,
      damping: 28,
      mass: 0.8,
      useNativeDriver: false,
    }).start();
  };

  const animateDeleteAndRemove = (mode: 'single' | 'all') => {
    setIsDeleting(true);
    Animated.parallel([
      Animated.timing(rowHeightAnim, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(rowOpacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(() => {
      if (mode === 'all') {
        if (onPendingDelete) {
          onPendingDelete(task);
        } else {
          void remove(task.id, task.occurrenceDate || task.date, 'all');
        }
      } else {
        void remove(task.id, task.occurrenceDate || task.date, 'single');
      }
    });
  };

  const executeDeleteAction = () => {
    onInteraction?.();
    void triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

    const isRecurring = task.repeatType && task.repeatType !== 'none';

    if (isRecurring) {
      Alert.alert(
        'Қайталанатын тапсырма',
        'Осы қайталанатын тапсырманы қалай өшіргіңіз келеді?',
        [
          {
            text: 'Тек осы күнгіні өшіру',
            style: 'destructive',
            onPress: async () => {
              await triggerHaptic(Haptics.ImpactFeedbackStyle.Rigid);
              animateDeleteAndRemove('single');
            },
          },
          {
            text: 'Барлық қайталануларды өшіру',
            style: 'destructive',
            onPress: async () => {
              await triggerHaptic(Haptics.ImpactFeedbackStyle.Rigid);
              animateDeleteAndRemove('all');
            },
          },
          {
            text: 'Болдырмау',
            style: 'cancel',
            onPress: resetSwipe,
          },
        ],
        { cancelable: true }
      );
    } else {
      Alert.alert(
        'Тапсырманы өшіру',
        'Бұл тапсырманы жоюды растайсыз ба?',
        [
          {
            text: 'Өшіру',
            style: 'destructive',
            onPress: async () => {
              await triggerHaptic(Haptics.ImpactFeedbackStyle.Rigid);
              animateDeleteAndRemove('all');
            },
          },
          {
            text: 'Болдырмау',
            style: 'cancel',
            onPress: resetSwipe,
          },
        ],
        { cancelable: true }
      );
    }
  };

  const handlePressIn = () => {
    if (isSwipingRef?.current) return;
    Animated.spring(pressScale, {
      toValue: 0.97,
      speed: 24,
      bounciness: 0,
      useNativeDriver: false,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 5,
      tension: 300,
      useNativeDriver: false,
    }).start();
  };

  const handlePress = () => {
    if (isSwipingRef?.current) return;
    onInteraction?.();
    onPress?.();
  };

  const hasVibrated = useRef(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => {
          if (compact) return false;
          return Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2.5;
        },
        onPanResponderGrant: () => {
          if (isSwipingRef) isSwipingRef.current = true;
          onScrollEnabledChange?.(false);
          swipeX.stopAnimation();
          hasVibrated.current = false;
        },
        onPanResponderMove: (_, gesture) => {
          onScrollEnabledChange?.(false);
          if (gesture.dx < 0) {
            const dx = gesture.dx;
            const clamped = dx < -72 ? -72 + (dx + 72) * 0.35 : dx;
            swipeX.setValue(clamped);

            if (gesture.dx < -140 && !hasVibrated.current) {
              hasVibrated.current = true;
              void triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
            } else if (gesture.dx >= -140) {
              hasVibrated.current = false;
            }
          } else {
            swipeX.setValue(Math.min(10, gesture.dx * 0.2));
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (isSwipingRef) isSwipingRef.current = false;
          onScrollEnabledChange?.(true);
          hasVibrated.current = false;

          if (gesture.dx < -140 || gesture.vx < -0.8) {
            void triggerHaptic(Haptics.ImpactFeedbackStyle.Rigid);
            executeDeleteAction();
            return;
          }

          if (gesture.dx < -28 || gesture.vx < -0.3) {
            void triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
            Animated.spring(swipeX, {
              toValue: -72,
              stiffness: 340,
              damping: 28,
              mass: 0.8,
              useNativeDriver: false,
            }).start();
          } else {
            Animated.spring(swipeX, {
              toValue: 0,
              stiffness: 340,
              damping: 28,
              mass: 0.8,
              useNativeDriver: false,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          if (isSwipingRef) isSwipingRef.current = false;
          onScrollEnabledChange?.(true);
          hasVibrated.current = false;
          Animated.spring(swipeX, {
            toValue: 0,
            stiffness: 340,
            damping: 28,
            mass: 0.8,
            useNativeDriver: false,
          }).start();
        },
      }),
    [compact, swipeX, isSwipingRef, onScrollEnabledChange]
  );

  const hasTime = !!task.time;
  const hasRepeat = !!task.repeatType && task.repeatType !== 'none';
  const hasDate = !!showDate && !compact && !!task.date;
  const hasMetadata = !compact && (hasTime || hasRepeat || hasDate);

  const isOverdue = useMemo(() => {
    if (task.isCompleted || !task.date) return false;
    const today = getTodayKey();
    return task.date < today;
  }, [task.date, task.isCompleted]);

  const repeatLabel = useMemo(() => {
    if (!hasRepeat) return null;
    if (task.repeatConfig) {
      return describeCustomRepeat(task.repeatConfig);
    }
    const rep = ((task.repeat || task.repeatType) as TaskRepeat) || 'none';
    return getShortRepeatLabel(rep, task.repeatInterval || 1);
  }, [hasRepeat, task.repeatConfig, task.repeat, task.repeatType, task.repeatInterval]);

  if (isDeleting) {
    return (
      <Animated.View
        style={{
          height: rowHeightAnim.interpolate({ inputRange: [0, 1], outputRange: [0, compact ? 20 : 60] }),
          opacity: rowOpacityAnim,
          overflow: 'hidden',
        }}
      />
    );
  }

  const isMorphing = !compact && activeDate && transitionProgress;

  const dynamicPaddingVertical = isMorphing
    ? transitionProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      })
    : 0;

  const dynamicGap = isMorphing
    ? transitionProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [6, 12],
      })
    : compact ? 8 : 12;

  const dynamicCheckboxScale = isMorphing
    ? transitionProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0.72, 1],
      })
    : 1;

  const dynamicTitleFontSize = isMorphing
    ? transitionProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [12, 15.5],
      })
    : compact ? 12 : 15.5;

  const dynamicPaddingHorizontal = isMorphing
    ? transitionProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 6],
      })
    : compact ? 0 : 6;

  const dateColor = isOverdue ? '#E03B2F' : '#8E8E93';

  return (
    <View style={styles.wrapper}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.rowContainer,
          compact && styles.compactRowContainer,
          cardSurface && styles.cardRowContainer,
          {
            opacity: rowOpacity,
            paddingHorizontal: dynamicPaddingHorizontal,
            paddingVertical: dynamicPaddingVertical,
            gap: dynamicGap,
          },
        ]}
      >
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.isCompleted }}
          accessibilityLabel={
            task.isCompleted
              ? 'Тапсырманы орындалмаған деп белгілеу'
              : 'Тапсырманы орындалды деп белгілеу'
          }
          onPress={onToggle}
          hitSlop={8}
          style={[styles.checkboxTouch, !hasMetadata && { marginTop: 0 }]}
        >
          <Animated.View
            style={[
              styles.checkbox,
              compact && styles.compactCheckbox,
              cardBg === '#FAFCFF' && { borderColor: '#DAE6F9', backgroundColor: 'transparent' },
              task.isCompleted && styles.checkboxCompleted,
              { transform: [{ scale: boxScale }, { scale: dynamicCheckboxScale }] },
            ]}
          >
            {task.isCompleted && (
              <Animated.View
                style={{
                  transform: [{ scale: checkScale }],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckmarkIcon size={compact ? 10 : 13} color="#FFFFFF" />
              </Animated.View>
            )}
          </Animated.View>
        </Pressable>

        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          style={[
            styles.contentStack,
            compact && styles.compactContentStack,
            !isLast && !compact && styles.contentStackBorderBottom,
            isActive && { opacity: 0.7 },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: pressScale }] }}>
            <Animated.Text
              numberOfLines={singleLine ? 1 : undefined}
              ellipsizeMode={singleLine ? 'tail' : undefined}
              style={[
                styles.title,
                compact && styles.compactTitle,
                task.isCompleted && styles.completedTitle,
                { fontSize: dynamicTitleFontSize },
              ]}
            >
              {task.title}
            </Animated.Text>

            {hasMetadata && (
              <View style={styles.metadataRow}>
                {hasDate && (
                  <View style={styles.metaItem}>
                    <CalendarIcon size={13} color={dateColor} />
                    <Text style={[styles.metaText, isOverdue && styles.overdueText]}>
                      {formatTaskDisplayDate(task.date)}
                    </Text>
                  </View>
                )}

                {hasTime && (
                  <View style={styles.metaItem}>
                    <ClockIcon size={13} color="#8E8E93" />
                    <Text style={styles.metaText}>{task.time}</Text>
                  </View>
                )}

                {hasRepeat && (
                  <View style={styles.metaItem}>
                    <RepeatIcon size={13} color="#8E8E93" />
                    {repeatLabel ? (
                      <Text style={styles.metaText}>{repeatLabel}</Text>
                    ) : null}
                  </View>
                )}
              </View>
            )}
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
});

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

function CalendarIcon({ size = 13, color = '#8E8E93' }: { size?: number; color?: string }) {
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

function ClockIcon({ size = 13, color = '#8E8E93' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Circle cx="8" cy="8" r="6.25" stroke={color} strokeWidth="1.3" />
      <Path d="M8 4.75V8L10.25 9.75" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function RepeatIcon({ size = 13, color = '#8E8E93' }: { size?: number; color?: string }) {
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

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'visible',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
    gap: 12,
    paddingTop: 11,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  cardRowContainer: {
    width: '100%',
  },
  compactRowContainer: {
    minHeight: 18,
    paddingTop: 1,
    paddingBottom: 1,
    paddingHorizontal: 0,
    gap: 8,
    alignItems: 'center',
  },
  checkboxTouch: {
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    borderColor: colors.checkedCheckboxBg,
    backgroundColor: colors.checkedCheckboxBg,
  },
  compactCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.checkboxBorder,
    backgroundColor: colors.checkboxBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentStack: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 11,
  },
  contentStackBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#ECEEF1',
  },
  compactContentStack: {
    paddingBottom: 0,
  },
  title: {
    fontSize: 15.5,
    fontWeight: '400',
    lineHeight: 21,
    color: '#111827',
  },
  compactTitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400',
    color: colors.text,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#ADB3BD',
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 3,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '400',
    color: '#8E8E93',
    fontVariant: ['tabular-nums'],
  },
  overdueText: {
    color: '#E03B2F',
  },
});
