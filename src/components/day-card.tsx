import React, { memo, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { format, isToday } from 'date-fns';
import { colors as defaultColors } from '@/constants/colors';
import { useTheme } from '@/context/theme-context';
import { months, toDateKey, weekdays } from '@/services/date-service';
import type { Task } from '@/types/task';
import { usePlanner } from '@/store/planner-store';
import { TaskListFrame } from './task-list-frame';
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
  disableOpen?: boolean;
  onScrollYChange?: (scrollY: number) => void;
  scrollEnabled?: boolean;
  monthLabel?: string;
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
  disableOpen = false,
  onScrollYChange,
  scrollEnabled = true,
  monthLabel,
}: DayCardProps) {
  const { colors, isDark } = useTheme();
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
    if (disableOpen || isSwipingRef?.current) return;

    // Prevent accidental click during drag/swipe gesture (if finger moved > 8px)
    if (e?.nativeEvent && touchStartPos.current) {
      const dx = Math.abs(e.nativeEvent.pageX - touchStartPos.current.x);
      const dy = Math.abs(e.nativeEvent.pageY - touchStartPos.current.y);
      if (dx > 8 || dy > 8) {
        return;
      }
    }

    onInteraction?.();

    if (cardRef.current) {
      cardRef.current.measureInWindow((x, y, w, h) => {
        if (typeof x === 'number' && !isNaN(x) && w > 0 && h > 0 && y > 0) {
          const freshFrame = { x, y, width: w, height: h };
          measuredFrameRef.current = freshFrame;
          openCard(date, tasks, freshFrame);
        } else if (measuredFrameRef.current) {
          openCard(date, tasks, measuredFrameRef.current);
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

  const headerBg = today ? colors.today : isWeekend ? (isDark ? '#381C20' : '#FFE5E2') : (isDark ? '#232834' : '#EDEFF2');
  const outerBg = today ? colors.today : isWeekend ? (isDark ? '#381C20' : '#FFE5E2') : (isDark ? '#232834' : '#EDEFF2');
  const cardBorderColor = today ? colors.today : isWeekend ? (isDark ? '#381C20' : '#FFE5E2') : (isDark ? '#232834' : '#EDEFF2');
  const cardBorderWidth = 0;

  const numOuterBg = today ? '#FFFFFF' : isWeekend ? colors.weekendNumBg : colors.dateNumBg;
  const numInnerBg = today ? '#FFFFFF' : isWeekend ? colors.weekendNumBg : colors.dateNumBg;
  const numTextColor = today ? colors.today : isWeekend ? colors.weekendNumText : colors.dateNumText;

  const dayNameColor = today ? '#FFFFFF' : isWeekend ? colors.sundayText : colors.text;
  const progressCountColor = today ? '#FFFFFF' : isWeekend ? (isDark ? '#FFA6A0' : '#7B4545') : colors.text;
  const progressTotalColor = today ? 'rgba(255, 255, 255, 0.8)' : isWeekend ? (isDark ? 'rgba(255, 166, 160, 0.7)' : 'rgba(123, 69, 69, 0.7)') : colors.secondary;

  const dayName = weekdays[date.getDay()] ?? '';
  const cardHeader = (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPress={open}
      activeScale={0.98}
      style={{
        height: wide ? 35 : 29,
        paddingVertical: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: wide ? 8 : 6,
        paddingHorizontal: wide ? 14 : 10,
        backgroundColor: headerBg,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontSize: wide ? 15 : 12,
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
          minWidth: wide ? 22 : 20,
          minHeight: wide ? 19 : 17,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: numOuterBg,
          borderRadius: wide ? 5 : 5,
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
            flexDirection: 'row',
            borderRadius: wide ? 4 : 4,
            paddingHorizontal: 0,
            paddingVertical: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: numInnerBg,
            gap: 2,
          }}
        >
          <Text
            style={{
              fontSize: wide ? 13 : 12,
              lineHeight: wide ? 15 : 13,
              fontWeight: today ? '700' : '600',
              color: numTextColor,
              fontVariant: ['tabular-nums'],
            }}
          >
            {format(date, monthLabel ? 'd' : 'dd')}
          </Text>
          {monthLabel ? (
            <Text
              style={{
                fontSize: wide ? 10 : 9.5,
                lineHeight: wide ? 13 : 12,
                fontWeight: '600',
                color: numTextColor,
                opacity: 0.85,
              }}
            >
              {monthLabel}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center' }}>
        <Text
          style={{
            fontSize: wide ? 12 : 11,
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
          backgroundColor: colors.card,
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
          wide ? (
            <TaskListFrame
              tasks={tasks}
              scrollable
              scrollEnabled={scrollEnabled}
              onScrollYChange={onScrollYChange}
              onPress={open}
              onInteraction={onInteraction}
              isSwipingRef={isSwipingRef}
              singleLine
            />
          ) : (
            <TaskListFrame
              tasks={tasks}
              onPress={open}
              onInteraction={onInteraction}
              isSwipingRef={isSwipingRef}
              singleLine
            />
          )
        ) : wide ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 20,
            }}
          >
            <Text style={{ color: colors.secondary, fontSize: 15, fontWeight: '500' }}>
              Тапсырма жоқ
            </Text>
          </View>
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
