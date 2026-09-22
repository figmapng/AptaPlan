import React, { memo, useMemo, useRef, useState } from 'react';
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
    : colors.text;

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
        <Text style={{ color: colors.secondary, fontWeight: '500' }}>
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
          backgroundColor: colors.divider,
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

  const [measuredBodyHeight, setMeasuredBodyHeight] = useState<number>(0);

  const activeBodyHeight = measuredBodyHeight > 0
    ? measuredBodyHeight
    : (wide ? expandedSundayHeight : collapsedBodyHeight);

  const { visibleTasks, moreCount } = useMemo(() => {
    if (!tasks || tasks.length === 0) return { visibleTasks: [], moreCount: 0 };

    const usableHeight = Math.max(30, activeBodyHeight - 4);
    const TASK_ROW_HEIGHT = 21;
    const TASK_GAP = 4;
    const BADGE_HEIGHT = 17;
    const BADGE_MARGIN_TOP = 2;

    const totalHeight = (count: number) => {
      if (count <= 0) return 0;
      return count * TASK_ROW_HEIGHT + (count - 1) * TASK_GAP;
    };

    // 1. If all tasks fit (with a 2px tolerance), render ALL tasks
    if (totalHeight(tasks.length) <= usableHeight + 2) {
      return { visibleTasks: tasks, moreCount: 0 };
    }

    // 2. Otherwise find the maximum number of tasks that can fit alongside the "+N more" badge
    let bestCount = 1;
    for (let k = 1; k < tasks.length; k++) {
      const heightWithBadge = totalHeight(k) + TASK_GAP + BADGE_MARGIN_TOP + BADGE_HEIGHT;
      if (heightWithBadge <= usableHeight) {
        bestCount = k;
      } else {
        break;
      }
    }

    // 3. If only 1 task is left unrendered (tasks.length - bestCount === 1),
    // and that single task can fit within a minor margin, show the task instead of "+1 more"
    if (tasks.length - bestCount === 1 && totalHeight(tasks.length) <= usableHeight + 4) {
      return { visibleTasks: tasks, moreCount: 0 };
    }

    return {
      visibleTasks: tasks.slice(0, bestCount),
      moreCount: tasks.length - bestCount,
    };
  }, [tasks, activeBodyHeight]);

  const cardBodyContent = (
    <Animated.View
      onLayout={(e) => {
        const h = Math.round(e.nativeEvent.layout.height);
        if (h > 0 && Math.abs(h - measuredBodyHeight) > 2) {
          setMeasuredBodyHeight(h);
        }
      }}
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
            tasks={visibleTasks}
            moreCount={moreCount}
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
                borderColor: colors.checkboxBorder,
                backgroundColor: colors.checkboxBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 5v14M5 12h15"
                  stroke={colors.secondary}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 18, fontWeight: '400' }}>
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
    borderWidth: today ? 1.5 : 1,
    borderColor: today
      ? colors.today
      : colors.cardBorder,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
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
