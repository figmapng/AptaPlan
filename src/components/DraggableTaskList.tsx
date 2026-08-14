import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  GestureResponderEvent,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import type { Task } from '@/types/task';
import { TaskRow } from './task-row';

export type DraggableTaskListProps = {
  data: Task[];
  keyExtractor?: (task: Task) => string;
  onReorder: (newData: Task[]) => Promise<void> | void;
  onPressItem?: (task: Task) => void;
  onPendingDelete?: (task: Task) => void;
  onOpenContextMenu?: (task: Task, anchorLayout: { x: number; y: number; width: number; height: number }) => void;
  cardBg?: string;
  compact?: boolean;
  onDragStateChange?: (isDragging: boolean) => void;
  scrollRef?: React.RefObject<ScrollView | null>;
  gap?: number;
};

type ItemLayout = {
  y: number;
  height: number;
};

export function DraggableTaskList({
  data,
  keyExtractor = (t) => `${t.id}:${t.date}`,
  onReorder,
  onPressItem,
  onPendingDelete,
  onOpenContextMenu,
  cardBg = '#FFFFFF',
  compact = false,
  onDragStateChange,
  scrollRef,
  gap = 4,
}: DraggableTaskListProps) {
  const layoutsRef = useRef<Map<string, ItemLayout>>(new Map());
  const itemRefs = useRef<Map<string, View>>(new Map());

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState<number>(-1);

  const activeTaskIdRef = useRef<string | null>(null);
  activeTaskIdRef.current = activeTaskId;

  const isDraggingRef = useRef(false);
  isDraggingRef.current = isDragging;

  const placeholderIndexRef = useRef<number>(-1);
  placeholderIndexRef.current = placeholderIndex;

  const dragY = useRef(new Animated.Value(0)).current;
  const dragScale = useRef(new Animated.Value(1)).current;
  const dragShadow = useRef(new Animated.Value(0)).current;

  const startTouchY = useRef(0);
  const startItemY = useRef(0);
  const startItemHeight = useRef(48);
  const startItemIndex = useRef(0);

  const autoScrollAnimFrame = useRef<number | null>(null);
  const currentScrollY = useRef(0);

  const dataRef = useRef(data);
  dataRef.current = data;

  const triggerHaptic = useCallback((style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS === 'ios') {
      void Haptics.impactAsync(style);
    }
  }, []);

  const cleanupScroll = useCallback(() => {
    if (autoScrollAnimFrame.current) {
      cancelAnimationFrame(autoScrollAnimFrame.current);
      autoScrollAnimFrame.current = null;
    }
  }, []);

  const resetDragState = useCallback(() => {
    cleanupScroll();
    setActiveTaskId(null);
    setIsDragging(false);
    setPlaceholderIndex(-1);
    dragY.setValue(0);
    dragScale.setValue(1);
    dragShadow.setValue(0);
    onDragStateChange?.(false);
  }, [cleanupScroll, dragScale, dragShadow, dragY, onDragStateChange]);

  useEffect(() => {
    return () => {
      cleanupScroll();
    };
  }, [cleanupScroll]);

  const handleItemLayout = useCallback((id: string, y: number, height: number) => {
    layoutsRef.current.set(id, { y, height });
  }, []);

  // Compute reordered target index from current finger coordinate
  const calculateTargetIndex = useCallback(
    (currentTouchY: number) => {
      const items = dataRef.current;
      if (items.length <= 1) return 0;

      const deltaY = currentTouchY - startTouchY.current;
      const currentFloatingCenter = startItemY.current + startItemHeight.current / 2 + deltaY;

      let currentAccumulatedY = 0;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const layout = layoutsRef.current.get(item.id);
        const h = layout ? layout.height : startItemHeight.current;
        const itemCenter = currentAccumulatedY + h / 2;

        if (currentFloatingCenter < itemCenter) {
          return i;
        }
        currentAccumulatedY += h + gap;
      }

      return items.length - 1;
    },
    [gap]
  );

  const startAutoScrollIfNeeded = useCallback(
    (touchPageY: number) => {
      if (!scrollRef?.current) return;
      const { height: screenH } = Dimensions.get('window');
      const topThreshold = 140;
      const bottomThreshold = screenH - 140;

      if (autoScrollAnimFrame.current) {
        cancelAnimationFrame(autoScrollAnimFrame.current);
        autoScrollAnimFrame.current = null;
      }

      const step = () => {
        if (!isDraggingRef.current) return;

        let delta = 0;
        if (touchPageY < topThreshold) {
          const ratio = Math.max(0, (topThreshold - touchPageY) / 70);
          delta = -Math.round(ratio * 8);
        } else if (touchPageY > bottomThreshold) {
          const ratio = Math.max(0, (touchPageY - bottomThreshold) / 70);
          delta = Math.round(ratio * 8);
        }

        if (delta !== 0) {
          currentScrollY.current = Math.max(0, currentScrollY.current + delta);
          scrollRef.current?.scrollTo({ y: currentScrollY.current, animated: false });
          autoScrollAnimFrame.current = requestAnimationFrame(step);
        }
      };

      if (touchPageY < topThreshold || touchPageY > bottomThreshold) {
        autoScrollAnimFrame.current = requestAnimationFrame(step);
      }
    },
    [scrollRef]
  );

  // Triggered when 350ms long-press finishes on an item
  const handleItemLongPressed = useCallback(
    (task: Task, index: number, pageY: number) => {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      const layout = layoutsRef.current.get(task.id);
      startTouchY.current = pageY;
      startItemY.current = layout?.y ?? 0;
      startItemHeight.current = layout?.height ?? 48;
      startItemIndex.current = index;

      setActiveTaskId(task.id);
      setPlaceholderIndex(index);
      onDragStateChange?.(true);

      Animated.parallel([
        Animated.spring(dragScale, {
          toValue: 1.025,
          tension: 320,
          friction: 20,
          useNativeDriver: false,
        }),
        Animated.timing(dragShadow, {
          toValue: 1,
          duration: 160,
          useNativeDriver: false,
        }),
      ]).start();
    },
    [dragScale, dragShadow, onDragStateChange, triggerHaptic]
  );

  // Triggered when movement starts after long press
  const handleItemDragMove = useCallback(
    (dy: number, moveY: number) => {
      if (!isDraggingRef.current) {
        setIsDragging(true);
        triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
      }
      dragY.setValue(dy);
      const targetIdx = calculateTargetIndex(moveY);
      if (targetIdx !== placeholderIndexRef.current && targetIdx >= 0 && targetIdx < dataRef.current.length) {
        setPlaceholderIndex(targetIdx);
      }
      startAutoScrollIfNeeded(moveY);
    },
    [calculateTargetIndex, dragY, startAutoScrollIfNeeded, triggerHaptic]
  );

  // Triggered when dropped
  const handleItemDragDrop = useCallback(() => {
    cleanupScroll();
    const fromIndex = startItemIndex.current;
    const toIndex = placeholderIndexRef.current >= 0 ? placeholderIndexRef.current : fromIndex;
    const items = [...dataRef.current];
    const [movedItem] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, movedItem);

    // Compute target displacement for smooth drop animation
    let targetOffset = 0;
    if (fromIndex !== toIndex) {
      for (let i = Math.min(fromIndex, toIndex); i < Math.max(fromIndex, toIndex); i++) {
        const layout = layoutsRef.current.get(dataRef.current[i].id);
        const h = layout ? layout.height : startItemHeight.current;
        targetOffset += (h + gap) * (fromIndex < toIndex ? 1 : -1);
      }
    }

    Animated.parallel([
      Animated.spring(dragY, {
        toValue: targetOffset,
        tension: 340,
        friction: 26,
        useNativeDriver: false,
      }),
      Animated.spring(dragScale, {
        toValue: 1,
        tension: 340,
        friction: 26,
        useNativeDriver: false,
      }),
      Animated.timing(dragShadow, {
        toValue: 0,
        duration: 160,
        useNativeDriver: false,
      }),
    ]).start(() => {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
      resetDragState();
      void onReorder(items);
    });
  }, [cleanupScroll, dragScale, dragShadow, dragY, gap, onReorder, resetDragState, triggerHaptic]);

  // Triggered when long-pressed without movement (Open Context Menu)
  const handleOpenMenuForTask = useCallback(
    (task: Task) => {
      resetDragState();
      const viewRef = itemRefs.current.get(task.id);
      if (viewRef && onOpenContextMenu) {
        viewRef.measureInWindow((x, y, width, height) => {
          if (y > 0 && width > 0 && height > 0) {
            onOpenContextMenu(task, { x, y, width, height });
          } else {
            onOpenContextMenu(task, {
              x: 16,
              y: startItemY.current + 80,
              width: Dimensions.get('window').width - 32,
              height: startItemHeight.current,
            });
          }
        });
      } else if (onOpenContextMenu) {
        onOpenContextMenu(task, {
          x: 16,
          y: startItemY.current + 80,
          width: Dimensions.get('window').width - 32,
          height: startItemHeight.current,
        });
      }
    },
    [onOpenContextMenu, resetDragState]
  );

  const activeTask = useMemo(() => {
    if (!activeTaskId) return null;
    return data.find((t) => t.id === activeTaskId) || null;
  }, [activeTaskId, data]);

  return (
    <View style={styles.container}>
      {data.map((task, index) => {
        const key = keyExtractor(task);
        const isThisActive = activeTaskId === task.id;

        // Calculate vertical shift for surrounding items based on placeholder index
        let translateYOffset = 0;
        if (activeTaskId && !isThisActive && placeholderIndex >= 0) {
          const activeIdx = startItemIndex.current;
          const draggedHeight = startItemHeight.current + gap;

          if (activeIdx < placeholderIndex) {
            // Dragging down: items between (activeIdx, placeholderIndex] shift UP
            if (index > activeIdx && index <= placeholderIndex) {
              translateYOffset = -draggedHeight;
            }
          } else if (activeIdx > placeholderIndex) {
            // Dragging up: items between [placeholderIndex, activeIdx) shift DOWN
            if (index >= placeholderIndex && index < activeIdx) {
              translateYOffset = draggedHeight;
            }
          }
        }

        return (
          <View
            key={key}
            ref={(ref) => {
              if (ref) itemRefs.current.set(task.id, ref);
              else itemRefs.current.delete(task.id);
            }}
            onLayout={(e) => handleItemLayout(task.id, e.nativeEvent.layout.y, e.nativeEvent.layout.height)}
            style={[
              styles.itemWrapper,
              { marginBottom: index === data.length - 1 ? 0 : gap },
            ]}
          >
            {isThisActive ? (
              // Soft rounded placeholder matching TickTick style (Screenshot 4)
              <View
                style={[
                  styles.placeholderSlot,
                  { height: startItemHeight.current },
                ]}
              />
            ) : (
              <Animated.View
                style={{
                  transform: [{ translateY: translateYOffset }],
                }}
              >
                <DraggableRowItem
                  task={task}
                  index={index}
                  compact={compact}
                  isLast={index === data.length - 1}
                  cardBg={cardBg}
                  onPressItem={onPressItem}
                  onPendingDelete={onPendingDelete}
                  onLongPress={handleItemLongPressed}
                  onDragMove={handleItemDragMove}
                  onDragDrop={handleItemDragDrop}
                  onOpenMenu={handleOpenMenuForTask}
                  onCancel={resetDragState}
                />
              </Animated.View>
            )}
          </View>
        );
      })}

      {/* Floating Dragged Item (TickTick style) */}
      {activeTask && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.floatingCard,
            {
              top: startItemY.current,
              height: startItemHeight.current,
              transform: [{ translateY: dragY }, { scale: dragScale }],
              shadowOpacity: dragShadow.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.18],
              }),
              elevation: dragShadow.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 8],
              }),
            },
          ]}
        >
          <View style={[styles.floatingCardInner, { backgroundColor: cardBg }]}>
            <TaskRow
              task={activeTask}
              compact={compact}
              isLast={false}
              cardBg={cardBg}
              disableInternalGestures={true}
            />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ── Individual Draggable Row with Universal Gesture Tracking ─────

type DraggableRowItemProps = {
  task: Task;
  index: number;
  compact: boolean;
  isLast: boolean;
  cardBg: string;
  onPressItem?: (task: Task) => void;
  onPendingDelete?: (task: Task) => void;
  onLongPress: (task: Task, index: number, pageY: number) => void;
  onDragMove: (dy: number, moveY: number) => void;
  onDragDrop: () => void;
  onOpenMenu: (task: Task) => void;
  onCancel: () => void;
};

const DraggableRowItem = memo(function DraggableRowItem({
  task,
  index,
  compact,
  isLast,
  cardBg,
  onPressItem,
  onPendingDelete,
  onLongPress,
  onDragMove,
  onDragDrop,
  onOpenMenu,
  onCancel,
}: DraggableRowItemProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const startTouchPos = useRef({ x: 0, y: 0, pageX: 0, pageY: 0 });

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleTouchStart = (e: GestureResponderEvent) => {
    const touch = e.nativeEvent;
    isLongPressedRef.current = false;
    isDraggingRef.current = false;
    startTouchPos.current = {
      x: touch.locationX,
      y: touch.locationY,
      pageX: touch.pageX,
      pageY: touch.pageY,
    };

    clearTimer();
    timerRef.current = setTimeout(() => {
      isLongPressedRef.current = true;
      onLongPress(task, index, startTouchPos.current.pageY);
    }, 340);
  };

  const handleTouchMove = (e: GestureResponderEvent) => {
    const touch = e.nativeEvent;
    const dx = touch.pageX - startTouchPos.current.pageX;
    const dy = touch.pageY - startTouchPos.current.pageY;

    if (!isLongPressedRef.current) {
      // If finger moves > 8px before 340ms, user is scrolling the list -> cancel long press
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        clearTimer();
      }
      return;
    }

    // In long-pressed mode: check for drag movement
    if (Math.abs(dy) > 6 || isDraggingRef.current) {
      isDraggingRef.current = true;
      onDragMove(dy, touch.pageY);
    }
  };

  const handleTouchEnd = (e: GestureResponderEvent) => {
    const touch = e.nativeEvent;
    const dx = Math.abs(touch.pageX - startTouchPos.current.pageX);
    const dy = Math.abs(touch.pageY - startTouchPos.current.pageY);

    clearTimer();

    // Case 1: Short Tap (timer was active, no long press, finger didn't move)
    if (!isLongPressedRef.current) {
      if (dx < 10 && dy < 10) {
        onPressItem?.(task);
      }
      return;
    }

    // Case 2: Long Press without Drag -> Open Context Menu
    if (isLongPressedRef.current && !isDraggingRef.current) {
      isLongPressedRef.current = false;
      onOpenMenu(task);
      return;
    }

    // Case 3: Drag & Drop -> Commit Reorder
    if (isDraggingRef.current) {
      isLongPressedRef.current = false;
      isDraggingRef.current = false;
      onDragDrop();
    }
  };

  const handleTouchCancel = () => {
    clearTimer();
    isLongPressedRef.current = false;
    isDraggingRef.current = false;
    onCancel();
  };

  return (
    <View
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      <TaskRow
        task={task}
        compact={compact}
        isLast={isLast}
        onPress={() => {}}
        onPendingDelete={onPendingDelete}
        cardBg={cardBg}
        disableInternalGestures={true}
      />
    </View>
  );
});

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flexGrow: 1,
  },
  itemWrapper: {
    position: 'relative',
  },
  placeholderSlot: {
    borderRadius: 12,
    backgroundColor: '#EEF2F6',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  floatingCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  floatingCardInner: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#01B7FF',
    overflow: 'hidden',
  },
});
