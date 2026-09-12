import React, { memo, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { format, isToday } from 'date-fns';
import { colors } from '@/constants/colors';
import { toDateKey } from '@/services/date-service';
import type { Task } from '@/types/task';
import { usePlanner } from '@/store/planner-store';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/use-i18n';
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
  const key = toDateKey(date);
  const today = isToday(date);
  const isSunday = date.getDay() === 0;
  const isSaturday = date.getDay() === 6;
  const isWeekend = isSunday || isSaturday;

  const { colors, isDark, theme } = useTheme();
  const { t } = useI18n();
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
    if (disableOpen) return;

    // Prevent accidental click during drag/swipe gesture (if finger moved > 8px)
    if (e?.nativeEvent && touchStartPos.current) {
      const dx = Math.abs(e.nativeEvent.pageX - touchStartPos.current.x);
      const dy = Math.abs(e.nativeEvent.pageY - touchStartPos.current.y);
      if (dx > 8 || dy > 8) {
        return;
      }
    } else if (isSwipingRef?.current) {
      return;
    }

    onInteraction?.();

    const fallbackFrame = measuredFrameRef.current || { x: 16, y: 140, width: 300, height: 200 };

    if (cardRef.current) {
      let completed = false;
      const fallbackTimer = setTimeout(() => {
        if (!completed) {
          completed = true;
          openCard(date, tasks, fallbackFrame);
        }
      }, 50);

      cardRef.current.measureInWindow((x, y, w, h) => {
        if (completed) return;
        completed = true;
        clearTimeout(fallbackTimer);
        if (typeof x === 'number' && !isNaN(x) && w > 0 && h > 0 && y > 0) {
          const freshFrame = { x, y, width: w, height: h };
          measuredFrameRef.current = freshFrame;
          openCard(date, tasks, freshFrame);
        } else {
          openCard(date, tasks, fallbackFrame);
        }
      });
    } else {
      openCard(date, tasks, fallbackFrame);
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

  const headerTextColor = today
    ? colors.today
    : isDark
    ? colors.text
    : '#31383E';

  const dayName = t.date.weekdays[date.getDay()] ?? '';
  const dayNumber = format(date, 'd');
  const monthShort = t.date.monthsShort[date.getMonth()] ?? '';

  const cardHeader = (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPress={open}
      activeScale={0.98}
      style={{
        paddingTop: 0,
        paddingBottom: 0,
      }}
    >
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{
          fontSize: 12,
          lineHeight: 16,
          fontWeight: '600',
          letterSpacing: 0.2,
          color: headerTextColor,
        }}
      >
        {dayName.toUpperCase()}
        <Text style={{ color: isDark ? '#94A3B8' : '#707684', fontWeight: '500' }}>
          {' '}• {dayNumber} {monthShort}
        </Text>
      </Text>
    </AnimatedPressable>
  );

  const headerDivider = (
    <Pressable onPressIn={handlePressIn} onPress={open}>
      <View
        style={{
          height: 1,
          backgroundColor: isDark ? colors.cardBorder : '#EDEEF1',
          marginTop: 8,
          marginBottom: 8,
        }}
      />
    </Pressable>
  );

  const wideBodyHeight = progress
    ? progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, Math.max(80, expandedSundayHeight - 48)],
      })
    : Math.max(80, expandedSundayHeight - 48);

  const cardBodyContent = (
    <Animated.View
      style={[
        {
          overflow: 'hidden',
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
          paddingVertical: 2,
          paddingHorizontal: 0,
        }}
      >
        {tasks.length ? (
          <TaskListFrame
            tasks={tasks}
            onPress={open}
            onInteraction={onInteraction}
            isSwipingRef={isSwipingRef}
            singleLine
          />
        ) : (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 2,
            }}
          >
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: 5,
                borderWidth: 1,
                borderColor: isDark ? '#3A3A3C' : '#DEE2E8',
                backgroundColor: isDark ? '#242C3C' : '#F7F9FC',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 5v14M5 12h15"
                  stroke={isDark ? '#7E8B9F' : '#9CA3AF'}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <Text style={{ color: isDark ? '#7E8B9F' : '#9CA3AF', fontSize: 13, lineHeight: 18, fontWeight: '400' }}>
              {t.common.addTask}
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

  const cardContainerStyle = {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderCurve: 'continuous' as const,
    borderWidth: today ? 1.5 : (isDark ? 1 : 0),
    borderColor: today
      ? colors.today
      : (isDark ? colors.cardBorder : 'transparent'),
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 15,
    elevation: 4,
  };

  if (wide) {
    return (
      <Animated.View
        ref={cardRef}
        collapsable={false}
        onLayout={handleCardLayout}
        accessibilityLabel={`${dayName}, ${tasks.length} ${t.common.tasksCount}`}
        style={[
          cardContainerStyle,
          {
            opacity: isTransitioning ? 0 : wideOpacity,
            height: wideHeight,
            transform: [{ translateY: wideTranslateY }, { scale: wideScale }],
          },
        ]}
      >
        {cardHeader}
        {headerDivider}
        {cardBodyContent}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      ref={cardRef}
      collapsable={false}
      onLayout={handleCardLayout}
      accessibilityLabel={`${dayName}, ${tasks.length} ${t.common.tasksCount}`}
      style={[
        cardContainerStyle,
        {
          opacity: isTransitioning ? 0 : gridPushOpacity,
        },
      ]}
    >
      {cardHeader}
      {headerDivider}
      {cardBodyContent}
    </Animated.View>
  );
});
