import React, { useRef } from 'react';
import { Animated, Platform, Pressable, ScrollView, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Task } from '@/types/task';
import { TaskRow } from './task-row';
import { useTheme } from '@/hooks/use-theme';

interface TaskListFrameProps {
  tasks: Task[];
  containerHeight?: number;
  moreCount?: number;
  scrollable?: boolean;
  scrollEnabled?: boolean;
  onScrollYChange?: (scrollY: number) => void;
  onPress: () => void;
  onInteraction?: () => void;
  isSwipingRef?: React.RefObject<boolean>;
  isCardScrollingRef?: React.RefObject<boolean>;
  singleLine?: boolean;
}

const ROW_HEIGHT = 22;
const GAP = 5;
const ROW_STRIDE = ROW_HEIGHT + GAP;

function RouletteRow({
  task,
  index,
  scrollY,
  containerHeight,
  canScroll,
  onPress,
  onInteraction,
  isSwipingRef,
  cardBg,
  singleLine,
}: {
  task: Task;
  index: number;
  scrollY: Animated.Value;
  containerHeight: number;
  canScroll: boolean;
  onPress: () => void;
  onInteraction?: () => void;
  isSwipingRef?: React.RefObject<boolean>;
  cardBg?: string;
  singleLine?: boolean;
}) {
  const itemTop = index * ROW_STRIDE;
  // Curve ONLY applies at the bottom of the card for overflowing tasks
  const b1 = itemTop - (containerHeight + 14);
  const b2 = itemTop - (containerHeight - ROW_STRIDE - 4);

  const rotateX = canScroll
    ? scrollY.interpolate({
        inputRange: [b1, b2],
        outputRange: ['40deg', '0deg'],
        extrapolate: 'clamp',
      })
    : '0deg';

  const opacity = canScroll
    ? scrollY.interpolate({
        inputRange: [b1, b2],
        outputRange: [0.45, 1],
        extrapolate: 'clamp',
      })
    : 1;

  const scale = canScroll
    ? scrollY.interpolate({
        inputRange: [b1, b2],
        outputRange: [0.93, 1],
        extrapolate: 'clamp',
      })
    : 1;

  return (
    <Animated.View
      style={{
        height: ROW_HEIGHT,
        transform: [
          { perspective: 400 },
          { rotateX },
          { scale },
        ],
        opacity,
      }}
    >
      <TaskRow
        task={task}
        compact
        onPress={onPress}
        onInteraction={onInteraction}
        isSwipingRef={isSwipingRef}
        cardBg={cardBg}
        singleLine={singleLine}
      />
    </Animated.View>
  );
}

export function TaskListFrame({
  tasks,
  containerHeight = 150,
  scrollable = true,
  scrollEnabled = true,
  onScrollYChange,
  onPress,
  onInteraction,
  isSwipingRef,
  isCardScrollingRef,
  singleLine = false,
}: TaskListFrameProps) {
  const { colors } = useTheme();
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const lastHapticIndexRef = useRef(0);
  const lastHapticTimeRef = useRef(0);

  const triggerScrollHaptic = () => {
    const now = Date.now();
    if (now - lastHapticTimeRef.current < 60) return;
    lastHapticTimeRef.current = now;
    if (Platform.OS === 'ios') {
      void Haptics.selectionAsync();
    } else if (Platform.OS === 'android') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const totalTasksHeight = tasks.length * ROW_HEIGHT + Math.max(0, tasks.length - 1) * GAP;
  const canScroll = scrollable && scrollEnabled && (tasks.length > 4 || totalTasksHeight > containerHeight - 20);

  return (
    <View style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <Animated.ScrollView
        ref={scrollViewRef}
        scrollEnabled={canScroll}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        bounces={canScroll}
        alwaysBounceVertical={false}
        scrollEventThrottle={16}
        snapToInterval={ROW_STRIDE}
        snapToAlignment="start"
        decelerationRate="fast"
        onTouchMove={() => {
          if (canScroll && isCardScrollingRef) {
            (isCardScrollingRef as any).current = true;
          }
        }}
        onScrollBeginDrag={() => {
          if (isSwipingRef) (isSwipingRef as any).current = true;
          if (isCardScrollingRef) (isCardScrollingRef as any).current = true;
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: true,
            listener: (event: any) => {
              const y = event.nativeEvent.contentOffset.y;
              onScrollYChange?.(y);
              if (canScroll) {
                if (isSwipingRef) (isSwipingRef as any).current = true;
                if (isCardScrollingRef) (isCardScrollingRef as any).current = true;

                const currentIdx = Math.max(0, Math.min(tasks.length - 1, Math.round(y / ROW_STRIDE)));
                if (currentIdx !== lastHapticIndexRef.current) {
                  lastHapticIndexRef.current = currentIdx;
                  triggerScrollHaptic();
                }
              }
            },
          }
        )}
        onScrollEndDrag={(e) => {
          const velocityY = e.nativeEvent.velocity?.y ?? 0;
          if (Math.abs(velocityY) < 0.1) {
            triggerScrollHaptic();
          }
          setTimeout(() => {
            if (isSwipingRef) (isSwipingRef as any).current = false;
            if (isCardScrollingRef) (isCardScrollingRef as any).current = false;
          }, 100);
        }}
        onMomentumScrollBegin={() => {
          if (isSwipingRef) (isSwipingRef as any).current = true;
          if (isCardScrollingRef) (isCardScrollingRef as any).current = true;
        }}
        onMomentumScrollEnd={() => {
          triggerScrollHaptic();
          setTimeout(() => {
            if (isSwipingRef) (isSwipingRef as any).current = false;
            if (isCardScrollingRef) (isCardScrollingRef as any).current = false;
          }, 100);
        }}
        onTouchEnd={() => {
          setTimeout(() => {
            if (isCardScrollingRef) (isCardScrollingRef as any).current = false;
          }, 120);
        }}
        onTouchCancel={() => {
          if (isSwipingRef) (isSwipingRef as any).current = false;
          if (isCardScrollingRef) (isCardScrollingRef as any).current = false;
        }}
        contentContainerStyle={{
          paddingBottom: canScroll ? 10 : 0,
          gap: GAP,
          flexGrow: 1,
        }}
      >
        {tasks.map((task, index) => (
          <RouletteRow
            key={`${task.id}:${task.date}`}
            task={task}
            index={index}
            scrollY={scrollY}
            containerHeight={containerHeight}
            canScroll={canScroll}
            onPress={onPress}
            onInteraction={onInteraction}
            isSwipingRef={isSwipingRef}
            cardBg={colors.card}
            singleLine={singleLine}
          />
        ))}
        {/* Empty area tap-to-open */}
        <Pressable
          style={{ flex: 1, minHeight: canScroll ? 0 : 8 }}
          onPress={onPress}
        />
      </Animated.ScrollView>
    </View>
  );
}
