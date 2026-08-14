import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  Platform,
  Pressable,
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
  pageY: number;
};

type GestureState = 'IDLE' | 'PRESSING' | 'LONG_PRESSED' | 'DRAGGING' | 'DROPPING';

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
  const containerRef = useRef<View>(null);
  const layoutsRef = useRef<Map<string, ItemLayout>>(new Map());
  const itemRefs = useRef<Map<string, View>>(new Map());

  const gestureStateRef = useRef<GestureState>('IDLE');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState<number>(-1);

  const activeTaskRef = useRef<Task | null>(null);
  activeTaskRef.current = activeTask;

  const placeholderIndexRef = useRef<number>(-1);
  placeholderIndexRef.current = placeholderIndex;

  const dragY = useRef(new Animated.Value(0)).current;
  const dragScale = useRef(new Animated.Value(1)).current;
  const dragShadow = useRef(new Animated.Value(0)).current;

  const startTouchY = useRef(0);
  const startTouchX = useRef(0);
  const startItemY = useRef(0);
  const startItemHeight = useRef(48);
  const startItemIndex = useRef(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const autoScrollAnimFrame = useRef<number | null>(null);
  const currentScrollY = useRef(0);

  const dataRef = useRef(data);
  dataRef.current = data;

  const triggerHaptic = useCallback((style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS === 'ios') {
      void Haptics.impactAsync(style);
    }
  }, []);

  const cleanupTimersAndScroll = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (autoScrollAnimFrame.current) {
      cancelAnimationFrame(autoScrollAnimFrame.current);
      autoScrollAnimFrame.current = null;
    }
  }, []);

  const resetDragState = useCallback(() => {
    cleanupTimersAndScroll();
    gestureStateRef.current = 'IDLE';
    setActiveTask(null);
    setPlaceholderIndex(-1);
    dragY.setValue(0);
    dragScale.setValue(1);
    dragShadow.setValue(0);
    onDragStateChange?.(false);
  }, [cleanupTimersAndScroll, dragScale, dragShadow, dragY, onDragStateChange]);

  useEffect(() => {
    return () => {
      cleanupTimersAndScroll();
    };
  }, [cleanupTimersAndScroll]);

  // Track layout of each row
  const handleItemLayout = useCallback((id: string, y: number, height: number) => {
    const existing = layoutsRef.current.get(id);
    layoutsRef.current.set(id, {
      y,
      height,
      pageY: existing?.pageY ?? y,
    });
  }, []);

  // Compute reordered target index from current finger coordinate
  const calculateTargetIndex = useCallback(
    (currentTouchY: number, initialIndex: number) => {
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
      const topThreshold = 130;
      const bottomThreshold = screenH - 140;

      if (autoScrollAnimFrame.current) {
        cancelAnimationFrame(autoScrollAnimFrame.current);
        autoScrollAnimFrame.current = null;
      }

      const step = () => {
        if (gestureStateRef.current !== 'DRAGGING') return;

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

  // PanResponder to handle the seamless Hold -> Drag vs Hold -> Menu gesture
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: () => {
          return gestureStateRef.current === 'DRAGGING' || gestureStateRef.current === 'LONG_PRESSED';
        },
        onMoveShouldSetPanResponderCapture: () => {
          return gestureStateRef.current === 'DRAGGING';
        },
        onPanResponderMove: (_, gesture) => {
          if (gestureStateRef.current === 'PRESSING') {
            if (Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10) {
              cleanupTimersAndScroll();
              gestureStateRef.current = 'IDLE';
            }
            return;
          }

          if (gestureStateRef.current === 'LONG_PRESSED') {
            if (Math.abs(gesture.dy) > 8) {
              gestureStateRef.current = 'DRAGGING';
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
            } else {
              return;
            }
          }

          if (gestureStateRef.current === 'DRAGGING') {
            dragY.setValue(gesture.dy);
            const targetIdx = calculateTargetIndex(gesture.moveY, startItemIndex.current);
            if (targetIdx !== placeholderIndexRef.current && targetIdx >= 0 && targetIdx < dataRef.current.length) {
              setPlaceholderIndex(targetIdx);
            }
            startAutoScrollIfNeeded(gesture.moveY);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          cleanupTimersAndScroll();

          if (gestureStateRef.current === 'PRESSING') {
            gestureStateRef.current = 'IDLE';
            return;
          }

          if (gestureStateRef.current === 'LONG_PRESSED') {
            const task = activeTaskRef.current;
            gestureStateRef.current = 'IDLE';
            setActiveTask(null);
            setPlaceholderIndex(-1);
            onDragStateChange?.(false);

            if (task) {
              const viewRef = itemRefs.current.get(task.id);
              if (viewRef && onOpenContextMenu) {
                viewRef.measureInWindow((x, y, width, height) => {
                  onOpenContextMenu(task, { x, y, width, height });
                });
              } else if (onOpenContextMenu) {
                onOpenContextMenu(task, {
                  x: 16,
                  y: startItemY.current,
                  width: Dimensions.get('window').width - 32,
                  height: startItemHeight.current,
                });
              }
            }
            return;
          }

          if (gestureStateRef.current === 'DRAGGING') {
            gestureStateRef.current = 'DROPPING';
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
                duration: 180,
                useNativeDriver: false,
              }),
            ]).start(() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              resetDragState();
              void onReorder(items);
            });
          } else {
            resetDragState();
          }
        },
        onPanResponderTerminate: () => {
          resetDragState();
        },
      }),
    [
      calculateTargetIndex,
      cleanupTimersAndScroll,
      dragScale,
      dragShadow,
      dragY,
      gap,
      onDragStateChange,
      onOpenContextMenu,
      onReorder,
      resetDragState,
      startAutoScrollIfNeeded,
      triggerHaptic,
    ]
  );

  // Initiates the touch flow for an individual task item
  const handleItemTouchStart = useCallback(
    (task: Task, index: number, event: { nativeEvent: { pageY: number; pageX: number; locationY: number } }) => {
      if (gestureStateRef.current !== 'IDLE') return;

      const layout = layoutsRef.current.get(task.id);
      startTouchY.current = event.nativeEvent.pageY;
      startTouchX.current = event.nativeEvent.pageX;
      startItemY.current = layout?.y ?? 0;
      startItemHeight.current = layout?.height ?? 48;
      startItemIndex.current = index;

      gestureStateRef.current = 'PRESSING';

      longPressTimerRef.current = setTimeout(() => {
        if (gestureStateRef.current === 'PRESSING') {
          gestureStateRef.current = 'LONG_PRESSED';
          triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
          setActiveTask(task);
          setPlaceholderIndex(index);
          onDragStateChange?.(true);

          Animated.parallel([
            Animated.spring(dragScale, {
              toValue: 1.025,
              tension: 320,
              friction: 22,
              useNativeDriver: false,
            }),
            Animated.timing(dragShadow, {
              toValue: 1,
              duration: 180,
              useNativeDriver: false,
            }),
          ]).start();
        }
      }, 380);
    },
    [dragScale, dragShadow, onDragStateChange, triggerHaptic]
  );

  const handleItemTouchEnd = useCallback(
    (task: Task) => {
      if (gestureStateRef.current === 'PRESSING') {
        cleanupTimersAndScroll();
        gestureStateRef.current = 'IDLE';
        onPressItem?.(task);
      }
    },
    [cleanupTimersAndScroll, onPressItem]
  );

  return (
    <View ref={containerRef} style={styles.container} {...panResponder.panHandlers}>
      {data.map((task, index) => {
        const key = keyExtractor(task);
        const isDragged = activeTask?.id === task.id;

        // Calculate vertical shift for surrounding items based on placeholder index
        let translateYOffset = 0;
        if (activeTask && !isDragged && placeholderIndex >= 0) {
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
              isDragged && styles.placeholderRow,
            ]}
          >
            {isDragged ? (
              // Empty dashed/translucent placeholder
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
                <Pressable
                  onPressIn={(e) => handleItemTouchStart(task, index, e)}
                  onPressOut={() => handleItemTouchEnd(task)}
                >
                  <TaskRow
                    task={task}
                    compact={compact}
                    isLast={index === data.length - 1}
                    onPress={() => {}}
                    onPendingDelete={onPendingDelete}
                    cardBg={cardBg}
                  />
                </Pressable>
              </Animated.View>
            )}
          </View>
        );
      })}

      {/* Floating Dragged Clone Overlay */}
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
                outputRange: [0, 0.2],
              }),
              elevation: dragShadow.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 10],
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
            />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flexGrow: 1,
  },
  itemWrapper: {
    position: 'relative',
  },
  placeholderRow: {
    opacity: 0.35,
  },
  placeholderSlot: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#01B7FF',
    borderStyle: 'dashed',
    backgroundColor: '#F0F9FF',
  },
  floatingCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
  },
  floatingCardInner: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(1, 183, 255, 0.4)',
    overflow: 'hidden',
  },
});
