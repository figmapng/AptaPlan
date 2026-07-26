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
  const { openCard, activeDate } = useCardTransition();
  const isTransitioning = activeDate === key;

  const measuredFrameRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const open = () => {
    if (isSwipingRef?.current) return;
    onInteraction?.();
    const frame = measuredFrameRef.current ?? { x: 16, y: 120, width: 170, height: 160 };
    openCard(date, tasks, frame);
  };

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

  // Header styles per specification
  const headerBg = today ? colors.activeHeaderBg : colors.card;
  const cardBorderColor = today ? colors.activeCardBorder : colors.cardBorder;
  const numBg = today ? '#FFFFFF' : isWeekend ? colors.sundayNumBg : colors.dateNumBg;
  const numTextColor = today ? colors.activeHeaderBg : isWeekend ? colors.sundayText : colors.dateNumText;
  const dayNameColor = today ? colors.activeHeaderText : isWeekend ? colors.sundayText : colors.text;
  const progressCountColor = today ? colors.activeHeaderText : colors.text;
  const progressTotalColor = today ? 'rgba(255,255,255,0.72)' : colors.secondary;
  const progressIconBorder = today ? 'white' : colors.text;

  const dayName = (weekdays[date.getDay()] ?? '').toUpperCase();

  const cardHeader = (
    <AnimatedPressable
      onPress={open}
      activeScale={0.98}
      style={{
        height: 34,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 8,
        backgroundColor: headerBg,
        borderBottomWidth: 1,
        borderBottomColor: today ? colors.activeHeaderBg : colors.divider,
      }}
    >
      <View
        style={{
          height: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: numBg,
          borderRadius: 6,
          paddingHorizontal: 5,
          paddingVertical: 2,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            lineHeight: 15,
            fontWeight: '600',
            color: numTextColor,
            fontVariant: ['tabular-nums'],
          }}
        >
          {format(date, 'dd')}
        </Text>
      </View>

      <Text
        numberOfLines={1}
        style={{
          fontSize: 12,
          fontWeight: '700',
          letterSpacing: 0.2,
          color: dayNameColor,
          flex: 1,
        }}
      >
        {dayName}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
          <Rect x="2.5" y="2.5" width="19" height="19" rx="4" stroke={progressIconBorder} strokeWidth="2.5" />
          <Path d="M7 12l3.5 3.5L17 8" stroke={progressIconBorder} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <Text
          style={{
            color: progressCountColor,
            fontSize: 11,
            fontWeight: '600',
            fontVariant: ['tabular-nums'],
          }}
        >
          {completedCount}
        </Text>
        <Text
          style={{
            color: progressTotalColor,
            fontSize: 11,
            fontWeight: '600',
            fontVariant: ['tabular-nums'],
          }}
        >
          /{tasks.length}
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
    <Animated.View style={[{ overflow: 'hidden' }, wide ? { height: wideBodyHeight } : { height: bodyHeight }]}>
      <Pressable
        onPress={open}
        style={{
          flex: 1,
          paddingHorizontal: 10,
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
            backgroundColor: colors.card,
            borderRadius: 12,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: cardBorderColor,
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(31,32,38,0.035)',
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
    <View
      ref={cardRef}
      collapsable={false}
      onLayout={handleCardLayout}
      accessibilityLabel={`${weekdays[date.getDay()]}, ${tasks.length} тапсырма`}
      style={{
        backgroundColor: colors.card,
        borderRadius: 12,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: cardBorderColor,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(31,32,38,0.035)',
        opacity: isTransitioning ? 0 : 1,
      }}
    >
      {cardHeader}
      {cardBodyContent}
    </View>
  );
}


