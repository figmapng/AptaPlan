import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';

function DragHandle({ active, opacity }: { active: boolean; opacity?: any }) {
  return (
    <Animated.View style={[styles.invisibleHandle, opacity !== undefined && { opacity }]}> 
      <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
        <Path
          d="M2.5 5h11M2.5 8h11M2.5 11h11"
          stroke={active ? '#374151' : '#9CA3AF'}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
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

interface Props<T> {
  data: T[];
  onReorder: (newData: T[]) => void;
  renderItem: (item: T, isActive: boolean, index: number, totalCount: number, onSwipeX?: (anim: Animated.Value, onDelete?: () => void) => void, onScrollEnabledChange?: (enabled: boolean) => void) => React.ReactNode;
  keyExtractor: (item: T) => string;
  onScrollEnabledChange?: (enabled: boolean) => void;
  onAutoScroll?: (offsetDelta: number) => void;
  gap?: number;
  dragHandleOpacity?: any;
  isScrollingRef?: React.RefObject<boolean>;
  showRowFrame?: boolean;
}

interface RowItemProps<T> {
  item: T;
  index: number;
  totalCount: number;
  isActive: boolean;
  dragYAnim: Animated.Value;
  shiftAnim: Animated.Value;
  dragHandleOpacity?: any;
  isScrollingRef?: React.RefObject<boolean>;
  showRowFrame?: boolean;
  onScrollEnabledChange?: (enabled: boolean) => void;
  renderItem: (item: T, isActive: boolean, index: number, totalCount: number, onSwipeX?: (anim: Animated.Value, onDelete?: () => void) => void, onScrollEnabledChange?: (enabled: boolean) => void) => React.ReactNode;
  onLayout: (index: number, height: number) => void;
  onGrant: (index: number) => void;
  onMove: (dy: number, moveY: number) => void;
  onRelease: () => void;
  onTerminate: () => void;
}

function SortableRowItem<T>({
  item,
  index,
  totalCount,
  isActive,
  dragYAnim,
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

  const startLongPress = React.useCallback((event: any) => {
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
      onGrant(index);
    }, 280);
  }, [clearLongPress, index, onGrant, onScrollEnabledChange]);

  const handleTouchMove = React.useCallback((event: any) => {
    if (longPressRef.current || !touchStartRef.current) return;
    const { pageX, pageY } = event.nativeEvent;
    const dx = Math.abs(pageX - touchStartRef.current.x);
    const dy = Math.abs(pageY - touchStartRef.current.y);
    if (dx > 6 || dy > 6) clearLongPress();
  }, [clearLongPress]);

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
        onMoveShouldSetPanResponder: (_, gs) => !isScrollingRef?.current && longPressRef.current && Math.abs(gs.dy) > 4 && Math.abs(gs.dy) > Math.abs(gs.dx),
        onMoveShouldSetPanResponderCapture: (_, gs) => !isScrollingRef?.current && longPressRef.current && Math.abs(gs.dy) > 4 && Math.abs(gs.dy) > Math.abs(gs.dx),
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          gestureActiveRef.current = true;
          clearLongPress();
          onScrollEnabledChange?.(false);
          onGrant(index);
        },
        onPanResponderMove: (_, gs) => onMove(gs.dy, gs.moveY),
        onPanResponderRelease: () => {
          gestureActiveRef.current = false;
          longPressRef.current = false;
          onScrollEnabledChange?.(true);
          onRelease();
        },
        onPanResponderTerminate: () => {
          gestureActiveRef.current = false;
          longPressRef.current = false;
          onScrollEnabledChange?.(true);
          onTerminate();
        },
      }),
    [index, onGrant, onMove, onRelease, onTerminate, onScrollEnabledChange, clearLongPress, isScrollingRef]
  );

  const rowStyle = isActive
    ? [
        styles.rowWrapper,
        !showRowFrame && styles.noRowFrame,
        showRowFrame && styles.activeRow,
        {
          transform: [{ translateY: dragYAnim }, { scale: 1.02 }],
          zIndex: 9999,
          elevation: 10,
        },
      ]
    : [
        styles.rowWrapper,
        !showRowFrame && styles.noRowFrame,
        {
          transform: [{ translateY: shiftAnim }],
        },
      ];

  const translateXStyle = swipeXAnim
    ? { transform: [{ translateX: swipeXAnim }] }
    : undefined;

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
        if (h > 0) onLayout(index, h);
      }}
    >
      {/* Red Delete Button & Below Text - Matching user screenshot 100% */}
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
            {/* Red Oval Pill - Compact height & stretches horizontally on pull */}
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
            {/* Soft Grey Text Below */}
            <Text style={{ color: '#8E8E93', fontSize: 10, fontWeight: '400', marginTop: 2 }}>Өшіру</Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      {/* Foreground Swiping Row (Translates Left over Red Pill) */}
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
  gap = 4,
  dragHandleOpacity,
  isScrollingRef,
  showRowFrame = true,
}: Props<T>) {
  const [dataState, setDataState] = useState<T[]>(() => [...data]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const dragY = useRef(new Animated.Value(0)).current;

  // Per-item shift animated values keyed by item key string
  const shiftAnims = useRef<Map<string, Animated.Value>>(new Map());

  const getShiftAnim = (key: string): Animated.Value => {
    if (!shiftAnims.current.has(key)) {
      shiftAnims.current.set(key, new Animated.Value(0));
    }
    return shiftAnims.current.get(key)!;
  };

  const rowHeightsRef = useRef<{ [key: number]: number }>({});
  const itemHeightRef = useRef<number>(54);
  const activeIndexRef = useRef<number>(-1);
  const targetIndexRef = useRef<number>(-1);
  const startIndexRef = useRef<number>(-1);
  const dataStateRef = useRef<T[]>([...data]);
  const keyExtractorRef = useRef(keyExtractor);
  keyExtractorRef.current = keyExtractor;
  const pendingOrderRef = useRef<string | null>(null);

  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoScrollOffsetRef = useRef(0);

  useEffect(() => {
    dataStateRef.current = [...data];
    if (activeIndexRef.current === -1) {
      const incomingOrder = data.map((item) => keyExtractorRef.current(item)).join('|');
      if (pendingOrderRef.current) {
        if (pendingOrderRef.current !== incomingOrder) return;
        pendingOrderRef.current = null;
      }
      setDataState([...data]);
    }
  }, [data]);

  const getItemStep = (idx: number) =>
    (rowHeightsRef.current[idx] || itemHeightRef.current) + gap;

  const stopAutoScroll = () => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
  };

  const checkAutoScroll = (moveY: number) => {
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

  const updateNeighborShifts = (active: number, target: number) => {
    const step = getItemStep(active);
    dataStateRef.current.forEach((item, i) => {
      if (i === active) return;
      const key = keyExtractorRef.current(item);
      let toValue = 0;

      if (active < target && i > active && i <= target) {
        toValue = -step;
      } else if (active > target && i < active && i >= target) {
        toValue = step;
      }

      Animated.spring(getShiftAnim(key), {
        toValue,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }).start();
    });
  };

  const stopAndResetAllShifts = () => {
    shiftAnims.current.forEach((anim) => {
      anim.stopAnimation();
      anim.setValue(0);
    });
  };

  const handleGrant = useRef((index: number) => {
    activeIndexRef.current = index;
    startIndexRef.current = index;
    targetIndexRef.current = index;
    autoScrollOffsetRef.current = 0;

    dragY.stopAnimation();
    dragY.setValue(0);
    stopAndResetAllShifts();

    onScrollEnabledChange?.(false);
    setActiveIndex(index);

    if (process.env.EXPO_OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }).current;

  const handleMove = useRef((dy: number, moveY: number) => {
    const active = activeIndexRef.current;
    if (active === -1) return;

    const adjustedDy = dy + autoScrollOffsetRef.current;
    dragY.setValue(adjustedDy);
    checkAutoScroll(moveY);

    const step = getItemStep(active);
    const startIdx = startIndexRef.current;
    const offsetSteps = Math.round(adjustedDy / step);
    const newTargetIdx = Math.max(0, Math.min(dataStateRef.current.length - 1, startIdx + offsetSteps));

    if (newTargetIdx !== targetIndexRef.current) {
      targetIndexRef.current = newTargetIdx;
      updateNeighborShifts(active, newTargetIdx);
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

    const targetIdx = targetIndexRef.current !== -1 ? targetIndexRef.current : startIdx;
    const step = getItemStep(active);
    const targetDragY = (targetIdx - startIdx) * step;

    // Smoothly spring active item into target slot over the shifted neighbors
    Animated.spring(dragY, {
      toValue: targetDragY,
      tension: 160,
      friction: 16,
      useNativeDriver: true,
    }).start(() => {
      // Create new list order
      const list = [...dataStateRef.current];
      if (targetIdx !== startIdx) {
        const [movedItem] = list.splice(startIdx, 1);
        list.splice(targetIdx, 0, movedItem);
      }

      // Reset shifts and commit new data order simultaneously
      stopAndResetAllShifts();
      dragY.setValue(0);
      autoScrollOffsetRef.current = 0;

      dataStateRef.current = list;
      pendingOrderRef.current = list.map((item) => keyExtractorRef.current(item)).join('|');
      setDataState(list);

      activeIndexRef.current = -1;
      targetIndexRef.current = -1;
      startIndexRef.current = -1;
      setActiveIndex(-1);

      requestAnimationFrame(() => {
        stopAndResetAllShifts();
        dragY.setValue(0);
      });

      onReorder(list);
      onScrollEnabledChange?.(true);
    });

    if (process.env.EXPO_OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }).current;

  const handleTerminate = useRef(() => {
    stopAutoScroll();
    stopAndResetAllShifts();
    dragY.stopAnimation();
    dragY.setValue(0);
    activeIndexRef.current = -1;
    targetIndexRef.current = -1;
    startIndexRef.current = -1;
    setActiveIndex(-1);
    onScrollEnabledChange?.(true);
  }).current;

  const handleLayout = useRef((index: number, height: number) => {
    rowHeightsRef.current[index] = height;
    itemHeightRef.current = height;
  }).current;

  return (
    <View style={styles.container}>
      {dataState.map((item, index) => {
        const keyStr = keyExtractor(item);
        const isActive = index === activeIndex;

        return (
          <MemoRowItem
            key={keyStr}
            item={item}
            index={index}
            totalCount={dataState.length}
            isActive={isActive}
            dragYAnim={dragY}
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
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  noRowFrame: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
  },
  activeRow: {
    backgroundColor: colors.inputBg,
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
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#FFECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
