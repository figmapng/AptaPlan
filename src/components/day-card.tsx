import { useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { format, isToday } from 'date-fns';
import { colors } from '@/constants/colors';
import { months, toDateKey, weekdays } from '@/services/date-service';
import type { Task } from '@/types/task';
import { TaskRow } from './task-row';
import { useCardTransition } from './card-transition-provider';
import { AnimatedPressable } from './AnimatedPressable';

type DayCardProps = {
  date: Date;
  tasks: Task[];
  wide?: boolean;
  progress?: Animated.Value;
  onInteraction?: () => void;
  collapsedBodyHeight?: number;
  expandedBodyHeight?: number;
  expandedSundayHeight?: number;
  onLayoutMeasured?: (dateKey: string, layout: { x: number; y: number; width: number; height: number }) => void;
  isSwipingRef?: React.RefObject<boolean>;
};

export function DayCard({
  date,
  tasks,
  wide = false,
  progress,
  onInteraction,
  collapsedBodyHeight = 138,
  expandedBodyHeight = 88,
  expandedSundayHeight = 156,
  onLayoutMeasured,
  isSwipingRef,
}: DayCardProps) {
  const key = toDateKey(date);
  const today = isToday(date);
  const isSunday = date.getDay() === 0;
  const isSaturday = date.getDay() === 6;
  const isWeekend = isSunday || isSaturday;

  const completedCount = tasks.filter((task) => task.isCompleted).length;
  const cardRef = useRef<View>(null);
  const { openCard, activeDate, progress: transitionProgress, originFrame } = useCardTransition();
  const isTransitioning = activeDate === key;

  const measuredFrameRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const open = () => {
    if (isSwipingRef?.current) return;
    onInteraction?.();

    const maxGridH = wide ? expandedSundayHeight + 34 : collapsedBodyHeight + 34;

    if (cardRef.current) {
      cardRef.current.measureInWindow((x, y, w, h) => {
        if (typeof x === 'number' && !isNaN(x) && w > 0 && h > 0) {
          const exactH = Math.min(h, maxGridH);
          const freshFrame = { x, y, width: w, height: exactH };
          measuredFrameRef.current = freshFrame;
          openCard(date, tasks, freshFrame);
        } else {
          const fallback = measuredFrameRef.current ?? { x: 16, y: 120, width: 170, height: maxGridH };
          openCard(date, tasks, fallback);
        }
      });
    } else {
      const fallback = measuredFrameRef.current ?? { x: 16, y: 120, width: 170, height: maxGridH };
      openCard(date, tasks, fallback);
    }
  };

  // Spatial push-away direction calculation when another card is expanding
  const pushDirRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  if (activeDate && originFrame && measuredFrameRef.current) {
    const cardX = measuredFrameRef.current.x;
    const cardY = measuredFrameRef.current.y;
    const origX = originFrame.x;
    const origY = originFrame.y;

    let px = 0;
    let py = 0;
    if (cardX > origX + 20) px = 60;
    else if (cardX < origX - 20) px = -60;

    if (cardY > origY + 20) py = 70;
    else if (cardY < origY - 20) py = -50;

    pushDirRef.current = { x: px, y: py };
  } else if (!activeDate) {
    pushDirRef.current = { x: 0, y: 0 };
  }

  const { x: pushX, y: pushY } = pushDirRef.current;

  // Pure linear 1-to-1 trajectory interpolations (Zero curve deviation on close)
  const gridPushTranslateX = transitionProgress && activeDate && !isTransitioning
    ? transitionProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, pushX],
      })
    : 0;

  const gridPushTranslateY = transitionProgress && activeDate && !isTransitioning
    ? transitionProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, pushY],
      })
    : 0;

  const gridPushOpacity = transitionProgress && activeDate && !isTransitioning
    ? transitionProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.25],
      })
    : 1;

  const bodyHeight = progress
    ? progress.interpolate({
        inputRange: [0, 1],
        outputRange: [collapsedBodyHeight, expandedBodyHeight],
      })
    : collapsedBodyHeight;

  const wideHeight = progress
    ? progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, expandedSundayHeight],
      })
    : expandedSundayHeight;

  const wideOpacity = progress
    ? progress.interpolate({
        inputRange: [0, 0.2, 1],
        outputRange: [0, 0.1, 1],
      })
    : 1;

  const wideTranslateY = progress
    ? progress.interpolate({
        inputRange: [0, 1],
        outputRange: [24, 0],
      })
    : 0;

  const wideScale = progress
    ? progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0.92, 1],
      })
    : 1;

  const wideMarginTop = progress
    ? progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0],
      })
    : 0;

  const headerBg = today ? '#00A3FF' : isWeekend ? '#FFE5E2' : '#EDEFF2';
  const outerBg = today ? '#00A3FF' : isWeekend ? '#FFE5E2' : '#EDEFF2';
  const cardBorderColor = today ? '#00A3FF' : isWeekend ? '#FFE5E2' : '#EDEFF2';
  const cardBorderWidth = 0;

  const numOuterBg = today ? '#008ADB' : isWeekend ? '#FAB9B3' : '#C4CAD7';
  const numInnerBg = '#FFFFFF';
  const numTextColor = today ? '#049BD6' : isWeekend ? colors.sundayText : '#333C4E';

  const dayNameColor = today ? '#FFFFFF' : isWeekend ? colors.sundayText : '#333C4E';
  const progressCountColor = today ? '#FFFFFF' : isWeekend ? '#7B4545' : '#333C4E';
  const progressTotalColor = today ? 'rgba(255, 255, 255, 0.8)' : isWeekend ? 'rgba(123, 69, 69, 0.7)' : '#707684';
  const progressIconBorder = today ? '#FFFFFF' : isWeekend ? '#7B4545' : '#333C4E';

  const dayName = weekdays[date.getDay()] ?? '';
  const cardHeader = (
    <AnimatedPressable
      onPress={open}
      activeScale={0.98}
      style={{
        height: 32,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 6,
        backgroundColor: headerBg,
      }}
    >
      {/* Outer badge */}
      <View
        style={{
          minWidth: 22,
          minHeight: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: numOuterBg,
          borderRadius: 6,
          paddingTop: 5,
          paddingRight: 1,
          paddingBottom: 1,
          paddingLeft: 1,
        }}
      >
        {/* Inner frame */}
        <View
          style={{
            alignSelf: 'stretch',
            borderRadius: 5,
            paddingHorizontal: 3,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: numInnerBg,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              lineHeight: 14,
              fontWeight: today ? '700' : '600',
              color: numTextColor,
              fontVariant: ['tabular-nums'],
            }}
          >
            {format(date, 'dd')}
          </Text>
        </View>
      </View>

      <Text
        numberOfLines={1}
        style={{
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.2,
          color: dayNameColor,
          flex: 1,
        }}
      >
        {dayName}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
          <Rect x="2.5" y="2.5" width="19" height="19" rx="4" stroke={progressIconBorder} strokeWidth="2.5" />
          <Path d="M7 12l3.5 3.5L17 8" stroke={progressIconBorder} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '600',
            fontVariant: ['tabular-nums'],
          }}
        >
          <Text style={{ color: progressCountColor }}>{completedCount}</Text>
          <Text style={{ color: progressTotalColor }}>/{tasks.length}</Text>
        </Text>
      </View>
    </AnimatedPressable>
  );

  const wideBodyHeight = progress
    ? progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, Math.max(80, expandedSundayHeight - 34)],
      })
    : Math.max(80, expandedSundayHeight - 34);

  const cardBodyContent = (
    <Animated.View
      style={[
        {
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          borderCurve: 'continuous',
          marginHorizontal: 2,
          marginBottom: 2,
        },
        wide ? { height: wideBodyHeight } : { height: bodyHeight },
      ]}
    >
      <Pressable
        onPress={open}
        style={{
          flex: 1,
          paddingHorizontal: 8,
          paddingTop: 6,
          paddingBottom: 6,
          gap: 4,
        }}
      >
        {tasks.length ? (
          tasks.map((task) => (
            <TaskRow
              key={`${task.id}:${task.date}`}
              task={task}
              compact
              onPress={open}
              onInteraction={onInteraction}
              isSwipingRef={isSwipingRef}
              cardBg="#FFFFFF"
            />
          ))
        ) : (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                width: 16,
                color: colors.secondary,
                fontSize: 18,
                lineHeight: 17,
                fontWeight: '300',
                textAlign: 'center',
              }}
            >
              +
            </Text>
            <Text style={{ color: colors.secondary, fontSize: 12, lineHeight: 17 }}>
              Тапсырма қосу
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );

  const handleCardLayout = () => {
    if (activeDate) return;
    requestAnimationFrame(() => {
      cardRef.current?.measureInWindow((x, y, width, height) => {
        if (typeof x === 'number' && !isNaN(x) && width > 0 && height > 0) {
          const frame = { x, y, width, height };
          measuredFrameRef.current = frame;
          onLayoutMeasured?.(key, frame);
        }
      });
    });
  };

  if (wide) {
    return (
      <Animated.View
        ref={cardRef}
        collapsable={false}
        onLayout={handleCardLayout}
        accessibilityLabel={`${weekdays[date.getDay()]}, ${tasks.length} тапсырма`}
        style={[
          {
            backgroundColor: outerBg,
            borderRadius: 14,
            borderCurve: 'continuous',
            borderWidth: cardBorderWidth,
            borderColor: cardBorderColor,
            overflow: 'hidden',
            opacity: isTransitioning ? 0 : wideOpacity,
            height: wideHeight,
            marginTop: wideMarginTop,
            transform: [{ translateY: wideTranslateY }, { scale: wideScale }],
          },
        ]}
      >
        {cardHeader}
        {cardBodyContent}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      ref={cardRef}
      collapsable={false}
      onLayout={handleCardLayout}
      accessibilityLabel={`${weekdays[date.getDay()]}, ${tasks.length} тапсырма`}
      style={{
        backgroundColor: outerBg,
        borderRadius: 14,
        borderCurve: 'continuous',
        borderWidth: cardBorderWidth,
        borderColor: cardBorderColor,
        overflow: 'hidden',
        opacity: isTransitioning ? 0 : gridPushOpacity,
        transform: [
          { translateX: gridPushTranslateX },
          { translateY: gridPushTranslateY },
        ],
      }}
    >
      {cardHeader}
      {cardBodyContent}
    </Animated.View>
  );
}


