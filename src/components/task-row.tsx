import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, PanResponder, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import type { Task } from '@/types/task';
import { usePlanner } from '@/store/planner-store';
import { useCardTransition } from './card-transition-provider';

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
}) {
  const { toggle, settings } = usePlanner();
  const { progress: transitionProgress, activeDate } = useCardTransition();
  const [isDeleting, setIsDeleting] = useState(false);

  // Checkbox spring, checkmark scale & completion opacity animations
  const checkScale = useRef(new Animated.Value(task.isCompleted ? 1 : 0)).current;
  const boxScale = useRef(new Animated.Value(1)).current;
  const rowOpacity = useRef(new Animated.Value(task.isCompleted ? 0.55 : 1)).current;

  // Swipe Left animations
  const swipeX = useRef(new Animated.Value(0)).current;
  const rowHeightAnim = useRef(new Animated.Value(1)).current;
  const rowOpacityAnim = useRef(new Animated.Value(1)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    onSwipeX?.(swipeX, executeDeleteAction);
  }, [onSwipeX, swipeX]);

  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(boxScale, {
          toValue: task.isCompleted ? 1.22 : 0.88,
          duration: 100,
          useNativeDriver: false,
        }),
        Animated.spring(boxScale, {
          toValue: 1,
          stiffness: 300,
          damping: 24,
          useNativeDriver: false,
        }),
      ]),
      Animated.timing(checkScale, {
        toValue: task.isCompleted ? 1 : 0,
        duration: 160,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: false,
      }),
      Animated.timing(rowOpacity, {
        toValue: task.isCompleted ? 0.55 : 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [task.isCompleted, boxScale, checkScale, rowOpacity]);

  const triggerHaptic = async (style: Haptics.ImpactFeedbackStyle) => {
    if (process.env.EXPO_OS === 'ios' && settings.haptics) {
      await Haptics.impactAsync(style);
    }
  };

  const onToggle = async () => {
    onInteraction?.();
    await triggerHaptic(
      task.isCompleted
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium
    );
    await toggle(task);
  };

  const executeDeleteAction = () => {
    onInteraction?.();
    void triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Тапсырманы өшіру',
      'Бұл тапсырманы жоюды растайсыз ба? Өшірілген тапсырманы қайта қалпына келтіру мүмкін емес!',
      [
        {
          text: 'Бас тарту',
          style: 'cancel',
          onPress: () => {
            Animated.spring(swipeX, {
              toValue: 0,
              stiffness: 340,
              damping: 28,
              mass: 0.8,
              useNativeDriver: false,
            }).start();
          },
        },
        {
          text: 'Өшіру',
          style: 'destructive',
          onPress: async () => {
            await triggerHaptic(Haptics.ImpactFeedbackStyle.Rigid);
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
              onPendingDelete?.(task);
            });
          },
        },
      ],
      { cancelable: true }
    );
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

  // Swipe Left PanResponder with iOS Apple physics
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => {
          if (compact) return false;
          // Strict horizontal swipe lock to prevent gesture trembling with drag handle
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
            // Apple iOS rubberband physics beyond -72px
            const clamped = dx < -72 ? -72 + (dx + 72) * 0.35 : dx;
            swipeX.setValue(clamped);

            // iPhone Haptic Vibration when swiped to delete threshold (-140px)
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

          // Full swipe to delete threshold (iOS long swipe)
          if (gesture.dx < -140 || gesture.vx < -0.8) {
            void triggerHaptic(Haptics.ImpactFeedbackStyle.Rigid);
            executeDeleteAction();
            return;
          }

          // Apple spring snap open
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
  const hasMetadata = !compact && (hasTime || hasRepeat);

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
        outputRange: [1, 4],
      })
    : compact ? 1 : 4;

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
        outputRange: [12, 14],
      })
    : compact ? 12 : 14;

  return (
    <View style={styles.wrapper}>
      {/* Foreground Task Row Content */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.rowContainer,
          compact && styles.compactRowContainer,
          {
            opacity: rowOpacity,
            backgroundColor: swipeX.interpolate({
              inputRange: [-10, 0],
              outputRange: ['#F2F2F7', '#FFFFFF'],
              extrapolate: 'clamp',
            }),
            borderRadius: 12,
            paddingVertical: dynamicPaddingVertical,
            paddingHorizontal: 4,
            gap: dynamicGap,
          },
        ]}
      >
        {/* Checkbox (Left) */}
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
          style={styles.checkboxTouch}
        >
          <Animated.View
            style={[
              styles.checkbox,
              compact && styles.compactCheckbox,
              task.isCompleted && styles.checkboxCompleted,
              { transform: [{ scale: boxScale }, { scale: dynamicCheckboxScale }] },
            ]}
          >
            {task.isCompleted && (
              <Animated.Text
                style={[
                  styles.checkMark,
                  compact && styles.compactCheckMark,
                  { transform: [{ scale: checkScale }] },
                ]}
              >
                ✓
              </Animated.Text>
            )}
          </Animated.View>
        </Pressable>

        {/* Task Title & Metadata Stack */}
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          style={[
            styles.contentStack,
            compact && styles.compactContentStack,
            isActive && { opacity: 0.7 },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: pressScale }] }}>
            <Animated.Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                styles.title,
                compact && styles.compactTitle,
                task.isCompleted && styles.completedTitle,
                { fontSize: dynamicTitleFontSize },
              ]}
            >
              {task.title}
            </Animated.Text>

          {/* Metadata Row (only in non-compact detail mode) */}
          {hasMetadata && (
            <View style={styles.metadataRow}>
              {/* 🕒 Time Chip */}
              {hasTime && (
                <View style={styles.timeChip}>
                  <Text style={styles.timeChipText}>{task.time}</Text>
                </View>
              )}

              {/* 🔁 Repeat Chip (icon only) */}
              {hasRepeat && (
                <View style={styles.repeatChip}>
                  <RepeatIcon color="#707684" />
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

function RepeatIcon({ color = '#707684' }: { color?: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 20 20" fill="none">
      <Path
        d="M15.3035 6.70851L14.7142 6.11925C12.1107 3.51576 7.88961 3.51576 5.28612 6.11925C2.68262 8.72271 2.68262 12.9439 5.28612 15.5474C7.88961 18.1509 12.1107 18.1509 14.7142 15.5474C16.2282 14.0333 16.8618 11.9723 16.6149 10.0004M15.3035 3.17297V6.70851H11.7679"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrashIcon({ color = 'white' }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"
        stroke={color}
        strokeWidth="2"
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
  deleteBg: {
    position: 'absolute',
    right: -42,
    top: 0,
    bottom: 0,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
    gap: 12,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 0,
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
  compactCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 5,
    borderColor: colors.checkboxBorder,
    backgroundColor: colors.checkboxBg,
  },
  checkboxCompleted: {
    borderColor: colors.checkedCheckboxBg,
    backgroundColor: colors.checkedCheckboxBg,
  },
  checkMark: {
    color: colors.checkedCheckboxCheck,
    fontWeight: '800',
    fontSize: 12,
  },
  compactCheckMark: {
    fontSize: 10,
  },
  contentStack: {
    flex: 1,
    justifyContent: 'center',
  },
  compactContentStack: {
    paddingBottom: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: '#1F2937',
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
    gap: 6,
    marginTop: 6,
  },
  timeChip: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    fontVariant: ['tabular-nums'],
  },
  repeatChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderControls: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginLeft: 8,
    alignSelf: 'center',
  },
  reorderBtn: {
    width: 26,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
