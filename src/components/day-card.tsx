import { memo, useRef } from 'react';
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

export const DayCard = memo(function DayCardComponent({
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
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const handlePressIn = (e: any) => {
    if (e?.nativeEvent) {
      touchStartPos.current = {
        x: e.nativeEvent.pageX,
        y: e.nativeEvent.pageY,
      };
    }
  };

  const open = (e?: any) => {
    if (isSwipingRef?.current) return;

    // Prevent accidental click during drag/swipe gesture (if finger moved > 8px)
    if (e?.nativeEvent && touchStartPos.current) {
      const dx = Math.abs(e.nativeEvent.pageX - touchStartPos.current.x);
      const dy = Math.abs(e.nativeEvent.pageY - touchStartPos.current.y);
      if (dx > 8 || dy > 8) {
        return;
      }
    }

    onInteraction?.();

    const maxGridH = wide ? expandedSundayHeight + 34 : collapsedBodyHeight + 34;

    if (cardRef.current) {
      cardRef.current.measureInWindow((x, y, w, h) => {
        if (typeof x === 'number' && !isNaN(x) && w > 0 && h > 0 && y > 0) {
          const freshFrame = { x, y, width: w, height: Math.min(h, maxGridH) };
          measuredFrameRef.current = freshFrame;
          openCard(date, tasks, freshFrame);
        } else if (measuredFrameRef.current) {
          openCard(date, tasks, measuredFrameRef.current);
        } else {
          openCard(date, tasks, { x: 16, y: 120, width: 170, height: maxGridH });
        }
      });
    } else if (measuredFrameRef.current) {
      openCard(date, tasks, measuredFrameRef.current);
    }
  };

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

  const numOuterBg = today ? '#FFFFFF' : isWeekend ? colors.weekendNumBg : colors.dateNumBg;
  const numInnerBg = today ? '#FFFFFF' : isWeekend ? colors.weekendNumBg : colors.dateNumBg;
  const numTextColor = today ? '#049BD6' : isWeekend ? colors.weekendNumText : colors.dateNumText;

  const dayNameColor = today ? '#FFFFFF' : isWeekend ? colors.sundayText : '#333C4E';
  const progressCountColor = today ? '#FFFFFF' : isWeekend ? '#7B4545' : '#333C4E';
  const progressTotalColor = today ? 'rgba(255, 255, 255, 0.8)' : isWeekend ? 'rgba(123, 69, 69, 0.7)' : '#707684';

  const dayName = weekdays[date.getDay()] ?? '';
  const cardHeader = (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPress={open}
      activeScale={0.98}
      style={{
        height: 29,
        paddingVertical: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        backgroundColor: headerBg,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.2,
          color: dayNameColor,
        }}
      >
        {dayName.toUpperCase()}
      </Text>

      {/* Outer badge */}
      <View
        style={{
          minWidth: 20,
          minHeight: 17,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: numOuterBg,
          borderRadius: 5,
          paddingTop: 0,
          paddingRight: 4,
          paddingBottom: 0,
          paddingLeft: 4,
        }}
      >
        {/* Inner frame */}
        <View
          style={{
            alignSelf: 'stretch',
            borderRadius: 4,
            paddingHorizontal: 0,
            paddingVertical: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: numInnerBg,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              lineHeight: 13,
              fontWeight: today ? '700' : '600',
              color: numTextColor,
              fontVariant: ['tabular-nums'],
            }}
          >
            {format(date, 'dd')}
          </Text>
        </View>
      </View>

      <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center' }}>
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
        outputRange: [0, Math.max(80, expandedSundayHeight - 31)],
      })
    : Math.max(80, expandedSundayHeight - 31);

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
          flex: wide ? 1 : undefined,
        },
        wide ? undefined : { height: bodyHeight },
      ]}
    >
      <Pressable
        onPressIn={handlePressIn}
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
              paddingVertical: 1,
            }}
          >
            <View
              style={{
                width: 16,
                height: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 4v16M4 12h16"
                  stroke={colors.secondary}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <Text style={{ color: colors.secondary, fontSize: 12, lineHeight: 17, fontWeight: '400' }}>
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
      }}
    >
      {cardHeader}
      {cardBodyContent}
    </Animated.View>
  );
});


