import React, { useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
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
  const itemCenter = index * ROW_STRIDE + ROW_HEIGHT / 2;
  const H = Math.max(60, containerHeight);
  const R = H / 2;
  const C = itemCenter - R;

  const gap = 18;
  const s1 = C - R - gap;
  const s2 = C - R + gap;
  const s3 = Math.max(s2 + 1, C + R - gap);
  const s4 = s3 + 2 * gap;

  const rotateX = canScroll
    ? scrollY.interpolate({
        inputRange: [s1, s2, s3, s4],
        outputRange: ['-42deg', '0deg', '0deg', '42deg'],
        extrapolate: 'clamp',
      })
    : '0deg';

  const opacity = canScroll
    ? scrollY.interpolate({
        inputRange: [s1, s2, s3, s4],
        outputRange: [0.45, 1, 1, 0.45],
        extrapolate: 'clamp',
      })
    : 1;

  const scale = canScroll
    ? scrollY.interpolate({
        inputRange: [s1, s2, s3, s4],
        outputRange: [0.92, 1, 1, 0.92],
        extrapolate: 'clamp',
      })
    : 1;

  return (
    <Animated.View
      style={{
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
  singleLine = false,
}: TaskListFrameProps) {
  const { colors } = useTheme();
  const scrollY = useRef(new Animated.Value(0)).current;

  const totalTasksHeight = tasks.length * ROW_HEIGHT + Math.max(0, tasks.length - 1) * GAP;
  const canScroll = scrollable && scrollEnabled && totalTasksHeight > containerHeight - 4;

  return (
    <View style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <Animated.ScrollView
        scrollEnabled={canScroll}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        bounces={canScroll}
        alwaysBounceVertical={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: true,
            listener: (event: any) => {
              onScrollYChange?.(event.nativeEvent.contentOffset.y);
            },
          }
        )}
        contentContainerStyle={{
          paddingBottom: canScroll ? 14 : 0,
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

      {/* Top subtle fade gradient when scrolled */}
      {canScroll && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 10,
          }}
        >
          <Svg width="100%" height={10}>
            <Defs>
              <LinearGradient id="rouletteTopFade" x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0" stopColor={colors.card} stopOpacity="0" />
                <Stop offset="1" stopColor={colors.card} stopOpacity="0.85" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height={10} fill="url(#rouletteTopFade)" />
          </Svg>
        </View>
      )}

      {/* Bottom subtle cylinder fade gradient for the roulette curve */}
      {canScroll && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 14,
          }}
        >
          <Svg width="100%" height={14}>
            <Defs>
              <LinearGradient id="rouletteBottomFade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.card} stopOpacity="0" />
                <Stop offset="1" stopColor={colors.card} stopOpacity="0.85" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height={14} fill="url(#rouletteBottomFade)" />
          </Svg>
        </View>
      )}
    </View>
  );
}
