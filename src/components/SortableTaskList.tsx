import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

function DragHandle({ active, opacity }: { active?: boolean; opacity?: any }) {
  return (
    <Animated.View style={[styles.handleWrap, opacity !== undefined && { opacity }]} collapsable={false}>
      <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
        <Path
          d="M4 6.5h12M4 10h12M4 13.5h12"
          stroke={active ? '#374151' : '#9CA3AF'}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}

function TrashIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"
        stroke="#FF4B3E"
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
}

interface RowItemProps<T> {
  item: T;
  index: number;
  totalCount: number;
  isActive: boolean;
  dragYAnim: Animated.Value;
  shiftAnim: Animated.Value;
  dragHandleOpacity?: any;
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

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 2,
        onPanResponderGrant: () => onGrant(index),
        onPanResponderMove: (_, gs) => onMove(gs.dy, gs.moveY),
        onPanResponderRelease: () => onRelease(),
        onPanResponderTerminate: () => onTerminate(),
      }),
    [index, onGrant, onMove, onRelease, onTerminate]
  );

  const rowStyle = isActive
    ? [
        styles.rowWrapper,
        styles.activeRow,
        {
          transform: [{ translateY: dragYAnim }, { scale: 1.02 }],
          zIndex: 9999,
          elevation: 10,
        },
      ]
    : [
        styles.rowWrapper,
        {
          transform: [{ translateY: shiftAnim }],
        },
      ];

  const translateXStyle = swipeXAnim
    ? { transform: [{ translateX: swipeXAnim }] }
    : undefined;

  return (
    <Animated.View
      style={rowStyle}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0) onLayout(index, h);
      }}
    >
      <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', flex: 1 }, translateXStyle]}>
        <View style={styles.contentWrapper}>
          {renderItem(item, isActive, index, totalCount, handleSwipeX, onScrollEnabledChange)}
        </View>
        <View style={styles.handleContainer} collapsable={false}>
          <Animated.View {...panResponder.panHandlers} style={{ opacity: dragOpacity }}>
            <DragHandle active={isActive} />
          </Animated.View>
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                justifyContent: 'center',
                alignItems: 'center',
                opacity: trashOpacity,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Тапсырманы өшіру"
              onPress={() => onDeleteRef.current?.()}
              style={styles.deleteBtn}
            >
              <TrashIcon />
            </Pressable>
          </Animated.View>
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

  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    dataStateRef.current = [...data];
    if (activeIndexRef.current === -1) {
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
        autoScrollTimer.current = setInterval(() => onAutoScroll?.(12), 16);
      }
    } else if (moveY < topThreshold) {
      if (!autoScrollTimer.current) {
        autoScrollTimer.current = setInterval(() => onAutoScroll?.(-12), 16);
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

    dragY.setValue(dy);
    checkAutoScroll(moveY);

    const step = getItemStep(active);
    const startIdx = startIndexRef.current;
    const offsetSteps = Math.round(dy / step);
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

      dataStateRef.current = list;
      setDataState(list);

      activeIndexRef.current = -1;
      targetIndexRef.current = -1;
      startIndexRef.current = -1;
      setActiveIndex(-1);

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
        const isLast = index === dataState.length - 1;
        // Dividers are ALWAYS rendered between items (never hidden during drag),
        // preventing layout height shifts when activeIndex resets.
        const showDivider = !isLast;

        return (
          <React.Fragment key={keyStr}>
            <MemoRowItem
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
            />
            {showDivider && (
              <Animated.View style={[styles.divider, dragHandleOpacity !== undefined && { opacity: dragHandleOpacity }]} />
            )}
          </React.Fragment>
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
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  activeRow: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contentWrapper: {
    flex: 1,
  },
  handleContainer: {
    width: 32,
    height: 32,
    marginLeft: 6,
    marginRight: 0,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  handleWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#FFECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 46,
    marginRight: 12,
  },
});
