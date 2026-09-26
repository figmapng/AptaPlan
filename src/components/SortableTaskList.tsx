import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { useTheme } from '@/hooks/use-theme';

function DragHandle({ active, opacity }: { active: boolean; opacity?: any }) {
  const { colors, isDark } = useTheme();
  return (
    <Animated.View style={[styles.invisibleHandle, opacity !== undefined && { opacity }]}>
      <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
        <Path
          d="M2.5 5h11M2.5 8h11M2.5 11h11"
          stroke={active ? colors.text : (isDark ? '#4E5A70' : '#9CA3AF')}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}

export function TrashIcon({ color = 'white', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
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

interface Props<T> {
  data: T[];
  onReorder: (newData: T[]) => void;
  renderItem: (
    item: T,
    isActive: boolean,
    index: number,
    totalCount: number,
    onSwipeX?: (anim: Animated.Value, onDelete?: () => void) => void,
    onScrollEnabledChange?: (enabled: boolean) => void
  ) => React.ReactNode;
  keyExtractor: (item: T) => string;
  onScrollEnabledChange?: (enabled: boolean) => void;
  onAutoScroll?: (offsetDelta: number) => void;
  gap?: number;
  dragHandleOpacity?: any;
  isScrollingRef?: React.RefObject<boolean>;
  showRowFrame?: boolean;
  deleteZoneThresholdY?: number;
  onDragStart?: (item: T) => void;
  onDragMoveOverDeleteZone?: (isOver: boolean) => void;
  onDragEnd?: (didDelete: boolean) => void;
  onDropInDeleteZone?: (item: T) => void;
}

interface RowItemProps<T> {
  item: T;
  itemKey: string;
  index: number;
  totalCount: number;
  isActive: boolean;
  isOverDeleteZone?: boolean;
  dragYAnim: Animated.Value;
  activeAnim: Animated.Value;
  shiftAnim: Animated.Value;
  dragHandleOpacity?: any;
  isScrollingRef?: React.RefObject<boolean>;
  showRowFrame?: boolean;
  onScrollEnabledChange?: (enabled: boolean) => void;
  renderItem: (
    item: T,
    isActive: boolean,
    index: number,
    totalCount: number,
    onSwipeX?: (anim: Animated.Value, onDelete?: () => void) => void,
    onScrollEnabledChange?: (enabled: boolean) => void
  ) => React.ReactNode;
  onLayout: (key: string, height: number) => void;
  onGrant: (itemKey: string) => void;
  onMove: (dy: number, moveY: number) => void;
  onRelease: () => void;
  onTerminate: () => void;
}

function SortableRowItem<T>({
  item,
  itemKey,
  index,
  totalCount,
  isActive,
  isOverDeleteZone = false,
  dragYAnim,
  activeAnim,
  shiftAnim,
  dragHandleOpacity,
  isScrollingRef,
  showRowFrame = true,
  onScrollEnabledChange,
  renderItem,
  onLayout,
  onGrant,
  onMove,
  onRelease,
  onTerminate,
}: RowItemProps<T>) {
  const { colors: themeColors, isDark } = useTheme();
  const [swipeXAnim, setSwipeXAnim] = useState<Animated.Value | null>(null);
  const onDeleteRef = useRef<(() => void) | null>(null);
  const longPressRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const gestureActiveRef = useRef(false);

  const clearLongPress = React.useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const startLongPress = React.useCallback(
    (event: any) => {
      clearLongPress();
      longPressRef.current = false;
      touchStartRef.current = {
        x: event.nativeEvent.pageX,
        y: event.nativeEvent.pageY,
      };
      longPressTimerRef.current = setTimeout(() => {
        longPressRef.current = true;
        longPressTimerRef.current = null;
        onScrollEnabledChange?.(false);
        onGrant(itemKey);
      }, 230);
    },
    [clearLongPress, itemKey, onGrant, onScrollEnabledChange]
  );

  const handleTouchMove = React.useCallback(
    (event: any) => {
      if (longPressRef.current || !touchStartRef.current) return;
      const { pageX, pageY } = event.nativeEvent;
      const dx = Math.abs(pageX - touchStartRef.current.x);
      const dy = Math.abs(pageY - touchStartRef.current.y);
      if (dx > 8 || dy > 8) clearLongPress();
    },
    [clearLongPress]
  );

  React.useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };
  }, []);

  const handleSwipeX = React.useCallback((anim: Animated.Value, onDelete?: () => void) => {
    setSwipeXAnim(anim);
    if (onDelete) onDeleteRef.current = onDelete;
  }, []);

  const dragOpacity = React.useMemo(() => {
    if (!swipeXAnim) return dragHandleOpacity;
    const fade = swipeXAnim.interpolate({
      inputRange: [-36, 0],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
    if (!dragHandleOpacity) return fade;
    return Animated.multiply(dragHandleOpacity, fade);
  }, [dragHandleOpacity, swipeXAnim]);

  const trashOpacity = React.useMemo(() => {
    if (!swipeXAnim) return 0;
    return swipeXAnim.interpolate({
      inputRange: [-48, -10, 0],
      outputRange: [1, 0, 0],
      extrapolate: 'clamp',
    });
  }, [swipeXAnim]);

  const redBgWidth = React.useMemo(() => {
    if (!swipeXAnim) return 0;
    return swipeXAnim.interpolate({
      inputRange: [-300, -72, 0],
      outputRange: [280, 72, 0],
      extrapolate: 'clamp',
    });
  }, [swipeXAnim]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gs) =>
          !isScrollingRef?.current && longPressRef.current && (Math.abs(gs.dy) > 3 || Math.abs(gs.dx) > 3),
        onMoveShouldSetPanResponderCapture: (_, gs) =>
          !isScrollingRef?.current && longPressRef.current && (Math.abs(gs.dy) > 3 || Math.abs(gs.dx) > 3),
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          gestureActiveRef.current = true;
          clearLongPress();
          onScrollEnabledChange?.(false);
        },
        onPanResponderMove: (_, gs) => onMove(gs.dy, gs.moveY),
        onPanResponderRelease: () => {
          gestureActiveRef.current = false;
          longPressRef.current = false;
          onRelease();
        },
        onPanResponderTerminate: () => {
          gestureActiveRef.current = false;
          longPressRef.current = false;
          onTerminate();
        },
      }),
    [onMove, onRelease, onTerminate, onScrollEnabledChange, clearLongPress, isScrollingRef]
  );

  const shadowOpacityAnim = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isDark ? 0.35 : 0.12],
    extrapolate: 'clamp',
  });

  const translateXAnim = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 12],
    extrapolate: 'clamp',
  });

  const activeBgAnim = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      isDark ? 'rgba(39, 39, 42, 0)' : 'rgba(255, 255, 255, 0)',
      isDark ? (themeColors.card || '#27272A') : '#FFFFFF',
    ],
    extrapolate: 'clamp',
  });

  const activeBorderAnim = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      'rgba(0, 0, 0, 0)',
      isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
    ],
    extrapolate: 'clamp',
  });

  const rowStyle = isActive
    ? [
        styles.rowWrapper,
        styles.activeRow,
        {
          backgroundColor: isOverDeleteZone
            ? (isDark ? 'rgba(255, 69, 58, 0.28)' : 'rgba(255, 59, 48, 0.16)')
            : activeBgAnim,
          borderColor: isOverDeleteZone
            ? '#FF3B30'
            : activeBorderAnim,
          borderWidth: 1,
          borderRadius: 12,
          borderCurve: 'continuous' as const,
          transform: [
            { translateX: translateXAnim },
            { translateY: dragYAnim },
          ],
          zIndex: 9999,
          elevation: 8,
          shadowColor: isOverDeleteZone ? '#FF3B30' : '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: shadowOpacityAnim,
          shadowRadius: 10,
        },
      ]
    : [
        styles.rowWrapper,
        !showRowFrame && styles.noRowFrame,
        {
          transform: [{ translateY: shiftAnim }],
          zIndex: 1,
        },
      ];

  const translateXStyle = swipeXAnim ? { transform: [{ translateX: swipeXAnim }] } : undefined;

  const handleTouchEnd = React.useCallback(() => {
    clearLongPress();
    if (longPressRef.current && !gestureActiveRef.current) {
      longPressRef.current = false;
      onTerminate();
    }
    touchStartRef.current = null;
  }, [clearLongPress, onTerminate]);

  return (
    <Animated.View
      {...panResponder.panHandlers}
      onTouchStart={startLongPress}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={rowStyle}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0) onLayout(itemKey, h);
      }}
    >
      {/* Red Delete Button & Below Text */}
      <Animated.View
        style={{
          position: 'absolute',
          right: 10,
          top: 2,
          bottom: 2,
          width: redBgWidth,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Тапсырманы өшіру"
          onPress={() => onDeleteRef.current?.()}
          style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
        >
          <Animated.View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              opacity: trashOpacity,
            }}
          >
            {/* Red Oval Pill */}
            <Animated.View
              style={{
                width: swipeXAnim
                  ? swipeXAnim.interpolate({
                      inputRange: [-300, -64, 0],
                      outputRange: [200, 52, 52],
                      extrapolate: 'clamp',
                    })
                  : 52,
                height: 28,
                borderRadius: 14,
                backgroundColor: '#FF3B30',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrashIcon color="white" />
            </Animated.View>
            <Text style={{ color: themeColors.secondary, fontSize: 10, fontWeight: '400', marginTop: 2 }}>Өшіру</Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      {/* Foreground Swiping Row */}
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
            zIndex: 2,
            borderRadius: 14,
            backgroundColor: 'transparent',
          },
          translateXStyle,
        ]}
      >
        <View style={styles.contentWrapper}>
          {renderItem(item, isActive, index, totalCount, handleSwipeX, onScrollEnabledChange)}
        </View>
        <View style={styles.handleContainer} collapsable={false}>
          <Animated.View style={styles.invisibleHandle} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const MemoRowItem = React.memo(SortableRowItem) as typeof SortableRowItem;

export function SortableTaskList<T>({
  data,
  onReorder,
  renderItem,
  keyExtractor,
  onScrollEnabledChange,
  onAutoScroll,
  gap = 0,
  dragHandleOpacity,
  isScrollingRef,
  showRowFrame = true,
  deleteZoneThresholdY,
  onDragStart,
  onDragMoveOverDeleteZone,
  onDragEnd,
  onDropInDeleteZone,
}: Props<T>) {
  const [dataState, setDataState] = useState<T[]>(() => [...data]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [isOverDeleteZone, setIsOverDeleteZone] = useState(false);
  const isOverDeleteZoneRef = useRef(false);

  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;
  const onDragMoveOverDeleteZoneRef = useRef(onDragMoveOverDeleteZone);
  onDragMoveOverDeleteZoneRef.current = onDragMoveOverDeleteZone;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;
  const onDropInDeleteZoneRef = useRef(onDropInDeleteZone);
  onDropInDeleteZoneRef.current = onDropInDeleteZone;
  const deleteZoneThresholdYRef = useRef(deleteZoneThresholdY);
  deleteZoneThresholdYRef.current = deleteZoneThresholdY;

  const dragY = useRef(new Animated.Value(0)).current;
  const activeAnim = useRef(new Animated.Value(0)).current;

  // Drop target placeholder mask
  const { colors: themeColors, isDark } = useTheme();
  const maskYAnim = useRef(new Animated.Value(0)).current;
  const maskOpacityAnim = useRef(new Animated.Value(0)).current;
  const [maskHeight, setMaskHeight] = useState<number>(54);

  // Item-key-based shift animated values
  const shiftAnims = useRef<Map<string, Animated.Value>>(new Map());

  const getShiftAnim = (key: string): Animated.Value => {
    if (!shiftAnims.current.has(key)) {
      shiftAnims.current.set(key, new Animated.Value(0));
    }
    return shiftAnims.current.get(key)!;
  };

  const resetAllShifts = () => {
    shiftAnims.current.forEach((anim) => {
      anim.stopAnimation();
      anim.setValue(0);
    });
  };

  const itemHeightsRef = useRef<Map<string, number>>(new Map());
  const itemHeightRef = useRef<number>(54);
  const activeIndexRef = useRef<number>(-1);
  const targetIndexRef = useRef<number>(-1);
  const startIndexRef = useRef<number>(-1);
  const dataStateRef = useRef<T[]>([...data]);
  const keyExtractorRef = useRef(keyExtractor);
  keyExtractorRef.current = keyExtractor;

  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoScrollOffsetRef = useRef(0);

  // Synchronize incoming external data changes directly when not dragging
  useEffect(() => {
    if (activeIndexRef.current === -1) {
      const currentKeys = dataStateRef.current.map((item) => keyExtractorRef.current(item)).join('|');
      const incomingKeys = data.map((item) => keyExtractorRef.current(item)).join('|');
      if (currentKeys === incomingKeys) {
        dataStateRef.current = [...data];
        return;
      }
      resetAllShifts();
      dataStateRef.current = [...data];
      setDataState([...data]);
    }
  }, [data]);

  const isDroppingRef = useRef(false);

  // Synchronize animation resets synchronously during the React commit phase to prevent 1-frame jerks
  useLayoutEffect(() => {
    if (isDroppingRef.current && activeIndex === -1) {
      isDroppingRef.current = false;
      resetAllShifts();
      dragY.setValue(0);
      activeAnim.setValue(0);
    }
  }, [dataState, activeIndex]);

  const stopAutoScroll = () => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopAutoScroll();
    };
  }, []);

  const checkAutoScroll = (moveY: number) => {
    // If approaching or over delete zone, stop auto-scrolling
    if (deleteZoneThresholdYRef.current && moveY >= deleteZoneThresholdYRef.current - 50) {
      stopAutoScroll();
      return;
    }

    const bottomThreshold = 680;
    const topThreshold = 180;

    if (moveY > bottomThreshold) {
      if (!autoScrollTimer.current) {
        autoScrollTimer.current = setInterval(() => {
          autoScrollOffsetRef.current += 12;
          onAutoScroll?.(12);
        }, 16);
      }
    } else if (moveY < topThreshold) {
      if (!autoScrollTimer.current) {
        autoScrollTimer.current = setInterval(() => {
          autoScrollOffsetRef.current -= 12;
          onAutoScroll?.(-12);
        }, 16);
      }
    } else {
      stopAutoScroll();
    }
  };

  const getDistanceBetween = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return 0;
    let dist = 0;
    if (fromIdx < toIdx) {
      for (let i = fromIdx + 1; i <= toIdx; i++) {
        const item = dataStateRef.current[i];
        if (!item) continue;
        const itemKey = keyExtractorRef.current(item);
        const h = itemHeightsRef.current.get(itemKey) || itemHeightRef.current;
        dist += h + gap;
      }
    } else {
      for (let i = toIdx; i < fromIdx; i++) {
        const item = dataStateRef.current[i];
        if (!item) continue;
        const itemKey = keyExtractorRef.current(item);
        const h = itemHeightsRef.current.get(itemKey) || itemHeightRef.current;
        dist += h + gap;
      }
    }
    return dist;
  };

  const getItemY = (index: number): number => {
    let y = 0;
    for (let i = 0; i < index; i++) {
      const item = dataStateRef.current[i];
      if (!item) continue;
      const key = keyExtractorRef.current(item);
      const h = itemHeightsRef.current.get(key) || itemHeightRef.current;
      y += h + gap;
    }
    return y;
  };

  const getDropTargetY = (startIdx: number, targetIdx: number): number => {
    if (targetIdx === startIdx) {
      return getItemY(startIdx);
    }
    const activeItem = dataStateRef.current[startIdx];
    const activeKey = activeItem ? keyExtractorRef.current(activeItem) : '';
    const activeH = itemHeightsRef.current.get(activeKey) || itemHeightRef.current;

    if (targetIdx < startIdx) {
      return getItemY(targetIdx);
    } else {
      const targetItem = dataStateRef.current[targetIdx];
      const targetKey = targetItem ? keyExtractorRef.current(targetItem) : '';
      const targetH = itemHeightsRef.current.get(targetKey) || itemHeightRef.current;
      return getItemY(targetIdx) + targetH - activeH;
    }
  };

  const updateNeighborShifts = (startIdx: number, targetIdx: number) => {
    const activeItem = dataStateRef.current[startIdx];
    if (!activeItem) return;
    const activeKey = keyExtractorRef.current(activeItem);
    const activeHeight = (itemHeightsRef.current.get(activeKey) || itemHeightRef.current) + gap;

    dataStateRef.current.forEach((item, i) => {
      if (i === startIdx) return;
      const key = keyExtractorRef.current(item);
      let toValue = 0;

      if (startIdx < targetIdx && i > startIdx && i <= targetIdx) {
        toValue = -activeHeight;
      } else if (startIdx > targetIdx && i >= targetIdx && i < startIdx) {
        toValue = activeHeight;
      }

      Animated.spring(getShiftAnim(key), {
        toValue,
        stiffness: 270,
        damping: 26,
        mass: 0.9,
        useNativeDriver: true,
      }).start();
    });
  };

  const getTargetIndex = (startIdx: number, dy: number): number => {
    const items = dataStateRef.current;
    const count = items.length;
    if (count <= 1) return startIdx;

    if (dy > 0) {
      let accumulated = 0;
      for (let i = startIdx + 1; i < count; i++) {
        const item = items[i];
        const itemKey = keyExtractorRef.current(item);
        const h = (itemHeightsRef.current.get(itemKey) || itemHeightRef.current) + gap;
        if (dy > accumulated + h * 0.45) {
          accumulated += h;
        } else {
          return i - 1;
        }
      }
      return count - 1;
    } else if (dy < 0) {
      let accumulated = 0;
      const absDy = -dy;
      for (let i = startIdx - 1; i >= 0; i--) {
        const item = items[i];
        const itemKey = keyExtractorRef.current(item);
        const h = (itemHeightsRef.current.get(itemKey) || itemHeightRef.current) + gap;
        if (absDy > accumulated + h * 0.45) {
          accumulated += h;
        } else {
          return i + 1;
        }
      }
      return 0;
    }
    return startIdx;
  };

  const handleGrant = useRef((itemKey: string) => {
    const idx = dataStateRef.current.findIndex(
      (item) => keyExtractorRef.current(item) === itemKey
    );
    if (idx === -1) return;

    activeIndexRef.current = idx;
    startIndexRef.current = idx;
    targetIndexRef.current = idx;
    autoScrollOffsetRef.current = 0;
    isOverDeleteZoneRef.current = false;
    setIsOverDeleteZone(false);

    dragY.stopAnimation();
    dragY.setValue(0);
    resetAllShifts();

    onScrollEnabledChange?.(false);
    setActiveIndex(idx);

    const activeItem = dataStateRef.current[idx];
    if (activeItem) {
      onDragStartRef.current?.(activeItem);
      const activeKey = keyExtractorRef.current(activeItem);
      const activeH = itemHeightsRef.current.get(activeKey) || itemHeightRef.current;
      setMaskHeight(activeH);
      const initialY = getItemY(idx);
      maskYAnim.setValue(initialY);
      Animated.spring(maskOpacityAnim, {
        toValue: 1,
        stiffness: 350,
        damping: 26,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    }

    // Fluid lift spring
    Animated.spring(activeAnim, {
      toValue: 1,
      stiffness: 300,
      damping: 24,
      mass: 0.8,
      useNativeDriver: true,
    }).start();

    if (process.env.EXPO_OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }).current;

  const applyRubberBand = (overshoot: number, maxDistance: number = 22): number => {
    if (overshoot <= 0) return 0;
    return (overshoot * maxDistance) / (overshoot + maxDistance);
  };

  const clampDragDy = (startIdx: number, rawDy: number): number => {
    const maxUp = getDistanceBetween(0, startIdx);

    // Prevent dragging too far above top item
    if (rawDy < -maxUp) {
      const overshoot = -rawDy - maxUp;
      return -maxUp - applyRubberBand(overshoot, 22);
    }

    // Only clamp downwards if there is NO delete zone configured
    if (!deleteZoneThresholdYRef.current) {
      const count = dataStateRef.current.length;
      if (count <= 1) {
        return rawDy > 0 ? applyRubberBand(rawDy, 16) : -applyRubberBand(-rawDy, 16);
      }
      const maxDown = getDistanceBetween(startIdx, count - 1);
      if (rawDy > maxDown) {
        const overshoot = rawDy - maxDown;
        return maxDown + applyRubberBand(overshoot, 22);
      }
    }

    return rawDy;
  };

  const handleMove = useRef((dy: number, moveY: number) => {
    const active = activeIndexRef.current;
    if (active === -1) return;

    const thresholdY = deleteZoneThresholdYRef.current;
    if (thresholdY !== undefined && thresholdY > 0) {
      const isOver = moveY >= thresholdY;
      if (isOver !== isOverDeleteZoneRef.current) {
        isOverDeleteZoneRef.current = isOver;
        setIsOverDeleteZone(isOver);
        onDragMoveOverDeleteZoneRef.current?.(isOver);
        if (process.env.EXPO_OS === 'ios') {
          void Haptics.impactAsync(
            isOver ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
          );
        }
        Animated.timing(maskOpacityAnim, {
          toValue: isOver ? 0 : 1,
          duration: 100,
          useNativeDriver: true,
        }).start();
      }
    }

    const startIdx = startIndexRef.current;
    const rawAdjustedDy = dy + autoScrollOffsetRef.current;
    const clampedDy = clampDragDy(startIdx, rawAdjustedDy);

    dragY.setValue(clampedDy);

    if (isOverDeleteZoneRef.current) {
      if (targetIndexRef.current !== startIdx) {
        targetIndexRef.current = startIdx;
        updateNeighborShifts(startIdx, startIdx);
      }
      return;
    }

    checkAutoScroll(moveY);

    const newTargetIdx = getTargetIndex(startIdx, clampedDy);

    if (newTargetIdx !== targetIndexRef.current) {
      targetIndexRef.current = newTargetIdx;
      updateNeighborShifts(startIdx, newTargetIdx);

      const targetY = getDropTargetY(startIdx, newTargetIdx);
      Animated.spring(maskYAnim, {
        toValue: targetY,
        stiffness: 320,
        damping: 26,
        mass: 0.8,
        useNativeDriver: true,
      }).start();

      if (process.env.EXPO_OS === 'ios') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }).current;

  const handleRelease = useRef(() => {
    stopAutoScroll();
    const active = activeIndexRef.current;
    const startIdx = startIndexRef.current;
    if (active === -1) return;

    if (isOverDeleteZoneRef.current) {
      const activeItem = dataStateRef.current[startIdx];
      if (process.env.EXPO_OS === 'ios') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
      }

      maskOpacityAnim.stopAnimation();
      maskOpacityAnim.setValue(0);
      maskYAnim.stopAnimation();
      resetAllShifts();
      dragY.setValue(0);
      activeAnim.setValue(0);
      activeIndexRef.current = -1;
      targetIndexRef.current = -1;
      startIndexRef.current = -1;
      isOverDeleteZoneRef.current = false;
      setIsOverDeleteZone(false);
      setActiveIndex(-1);
      onScrollEnabledChange?.(true);

      const nextData = dataStateRef.current.filter((_, i) => i !== startIdx);
      dataStateRef.current = nextData;
      setDataState(nextData);

      if (activeItem) {
        onDropInDeleteZoneRef.current?.(activeItem);
      }
      onDragEndRef.current?.(true);
      return;
    }

    onDragEndRef.current?.(false);

    const targetIdx = targetIndexRef.current !== -1 ? targetIndexRef.current : startIdx;

    if (targetIdx === startIdx) {
      Animated.parallel([
        Animated.spring(dragY, {
          toValue: 0,
          stiffness: 320,
          damping: 28,
          mass: 0.8,
          useNativeDriver: true,
        }),
        Animated.spring(activeAnim, {
          toValue: 0,
          stiffness: 320,
          damping: 28,
          mass: 0.8,
          useNativeDriver: true,
        }),
        Animated.timing(maskOpacityAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        ...dataStateRef.current.map((item) =>
          Animated.spring(getShiftAnim(keyExtractorRef.current(item)), {
            toValue: 0,
            stiffness: 300,
            damping: 28,
            mass: 0.8,
            useNativeDriver: true,
          })
        ),
      ]).start(() => {
        resetAllShifts();
        dragY.setValue(0);
        activeAnim.setValue(0);
        activeIndexRef.current = -1;
        targetIndexRef.current = -1;
        startIndexRef.current = -1;
        isOverDeleteZoneRef.current = false;
        setIsOverDeleteZone(false);
        setActiveIndex(-1);
        onScrollEnabledChange?.(true);
      });
      return;
    }

    const targetDragY =
      targetIdx > startIdx
        ? getDistanceBetween(startIdx, targetIdx)
        : -getDistanceBetween(targetIdx, startIdx);

    isDroppingRef.current = true;

    // Smooth drop settling: mask dissolves concurrently with card landing
    Animated.parallel([
      Animated.spring(dragY, {
        toValue: targetDragY,
        stiffness: 340,
        damping: 30,
        mass: 0.85,
        useNativeDriver: true,
      }),
      Animated.spring(activeAnim, {
        toValue: 0,
        stiffness: 320,
        damping: 28,
        mass: 0.85,
        useNativeDriver: true,
      }),
      Animated.timing(maskOpacityAnim, {
        toValue: 0,
        duration: 220,
        delay: 50,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Create new list order
      const list = [...dataStateRef.current];
      const [movedItem] = list.splice(startIdx, 1);
      list.splice(targetIdx, 0, movedItem);

      dataStateRef.current = list;
      activeIndexRef.current = -1;
      targetIndexRef.current = -1;
      startIndexRef.current = -1;
      isOverDeleteZoneRef.current = false;
      setIsOverDeleteZone(false);
      onScrollEnabledChange?.(true);

      // Trigger state updates (resets are handled synchronously in useLayoutEffect before paint)
      setDataState(list);
      setActiveIndex(-1);

      // Tactile impact right as the card docks into place
      if (process.env.EXPO_OS === 'ios') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Persist reorder to database
      onReorder(list);
    });
  }).current;

  const handleTerminate = useRef(() => {
    stopAutoScroll();
    isDroppingRef.current = false;
    resetAllShifts();
    maskOpacityAnim.stopAnimation();
    maskOpacityAnim.setValue(0);
    maskYAnim.stopAnimation();
    dragY.stopAnimation();
    dragY.setValue(0);
    activeAnim.stopAnimation();
    activeAnim.setValue(0);
    activeIndexRef.current = -1;
    targetIndexRef.current = -1;
    startIndexRef.current = -1;
    isOverDeleteZoneRef.current = false;
    setIsOverDeleteZone(false);
    setActiveIndex(-1);
    onScrollEnabledChange?.(true);
    onDragEndRef.current?.(false);
  }).current;

  const handleLayout = useRef((key: string, height: number) => {
    itemHeightsRef.current.set(key, height);
    itemHeightRef.current = height;
  }).current;

  return (
    <View style={styles.container}>
      {/* Drop Target Placeholder Mask */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 4,
          right: 4,
          top: 3,
          height: Math.max(34, maskHeight - 6),
          borderRadius: 12,
          borderCurve: 'continuous',
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.32)' : (themeColors.today ? `${themeColors.today}66` : 'rgba(0, 122, 255, 0.4)'),
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : (themeColors.today ? `${themeColors.today}0D` : 'rgba(0, 122, 255, 0.05)'),
          transform: [{ translateY: maskYAnim }],
          opacity: maskOpacityAnim,
          zIndex: 0,
        }}
      />

      {dataState.map((item, index) => {
        const keyStr = keyExtractor(item);
        const isActive = index === activeIndex;

        return (
          <MemoRowItem
            key={keyStr}
            item={item}
            itemKey={keyStr}
            index={index}
            totalCount={dataState.length}
            isActive={isActive}
            isOverDeleteZone={isActive ? isOverDeleteZone : false}
            dragYAnim={dragY}
            activeAnim={activeAnim}
            shiftAnim={getShiftAnim(keyStr)}
            dragHandleOpacity={dragHandleOpacity}
            onScrollEnabledChange={onScrollEnabledChange}
            renderItem={renderItem}
            onLayout={handleLayout}
            onGrant={handleGrant}
            onMove={handleMove}
            onRelease={handleRelease}
            onTerminate={handleTerminate}
            isScrollingRef={isScrollingRef}
            showRowFrame={showRowFrame}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  rowWrapper: {
    width: '100%',
    alignSelf: 'stretch',
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'transparent',
    overflow: 'visible',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  noRowFrame: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeRow: {
    borderRadius: 12,
  },
  contentWrapper: {
    flex: 1,
  },
  handleContainer: {
    width: 32,
    height: 32,
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  invisibleHandle: {
    width: 32,
    height: 32,
  },
});
