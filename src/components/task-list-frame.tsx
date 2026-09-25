import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Task } from '@/types/task';
import { TaskRow } from './task-row';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/use-i18n';

interface TaskListFrameProps {
  tasks: Task[];
  containerHeight?: number;
  collapsedContainerHeight?: number;
  expandedContainerHeight?: number;
  progress?: Animated.Value;
  isSundayVisible?: boolean;
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
const MIN_GAP = 3.5;
const MIN_PAD = 7;

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
  rowStride,
  extraOpacity,
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
  rowStride: number;
  extraOpacity?: Animated.AnimatedInterpolation<number> | Animated.Value | number;
}) {
  const itemTop = index * rowStride;
  const b1 = itemTop - (containerHeight + 14);
  const b2 = itemTop - (containerHeight - rowStride - 4);

  const rouletteOpacity = canScroll
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

  const content = (
    <Animated.View
      style={{
        height: ROW_HEIGHT,
        transform: [{ scale }],
        opacity: rouletteOpacity,
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

  if (extraOpacity !== undefined) {
    return (
      <Animated.View style={{ opacity: extraOpacity }}>
        {content}
      </Animated.View>
    );
  }

  return content;
}

export function TaskListFrame({
  tasks,
  containerHeight: propContainerHeight = 150,
  collapsedContainerHeight,
  expandedContainerHeight,
  progress,
  isSundayVisible = true,
  scrollable = true,
  scrollEnabled = true,
  onScrollYChange,
  onPress,
  onInteraction,
  isSwipingRef,
  isCardScrollingRef,
  singleLine = false,
}: TaskListFrameProps) {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const [layoutHeight, setLayoutHeight] = useState(0);
  const containerHeight = propContainerHeight || layoutHeight || 150;
  const [isAtTop, setIsAtTop] = useState(true);
  const isAtTopRef = useRef(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const lastHapticIndexRef = useRef(0);
  const lastHapticTimeRef = useRef(0);

  const triggerScrollHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Rigid) => {
    const now = Date.now();
    if (now - lastHapticTimeRef.current < 16) return;
    lastHapticTimeRef.current = now;
    if (Platform.OS === 'ios') {
      void Haptics.impactAsync(style);
    } else if (Platform.OS === 'android') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const isAdaptive = Boolean(progress && collapsedContainerHeight && expandedContainerHeight);

  const N_collapsed = isAdaptive
    ? Math.max(1, Math.floor(((collapsedContainerHeight!) + MIN_GAP - 2 * MIN_PAD) / (ROW_HEIGHT + MIN_GAP)))
    : Math.max(1, Math.floor((containerHeight + MIN_GAP - 2 * MIN_PAD) / (ROW_HEIGHT + MIN_GAP)));

  const N_expanded = isAdaptive
    ? Math.max(1, Math.floor(((expandedContainerHeight!) + MIN_GAP - 2 * MIN_PAD) / (ROW_HEIGHT + MIN_GAP)))
    : N_collapsed;

  const currentContainerH = isAdaptive
    ? (isSundayVisible ? expandedContainerHeight! : collapsedContainerHeight!)
    : containerHeight;

  const currentN = isAdaptive
    ? (isSundayVisible ? N_expanded : N_collapsed)
    : N_collapsed;

  // Stable spacing using maxN so rows don't shift vertically during height animation
  const layoutHeightUsed = isAdaptive ? collapsedContainerHeight! : containerHeight;
  const layoutN = isAdaptive ? N_collapsed : currentN;
  const totalTasksH = layoutN * ROW_HEIGHT;
  const remaining = Math.max(0, layoutHeightUsed - totalTasksH);
  const gap = layoutN > 1 ? Math.min(6, Math.max(3, (remaining - 16) / (layoutN - 1))) : 0;
  const edgePad = Math.max(6, Math.round(((remaining - (layoutN - 1) * gap) / 2) * 10) / 10);
  const rowStride = ROW_HEIGHT + gap;

  const canScroll = scrollable && scrollEnabled && tasks.length > currentN;

  // ── Adaptive morph values ──────────────────────────────────────────
  const hasOverflowExpanded = scrollable && scrollEnabled && tasks.length > N_expanded;
  const badgeIndexExpanded = N_expanded - 1;
  const computedMoreCountExpanded = hasOverflowExpanded ? tasks.length - badgeIndexExpanded : 0;

  const hasOverflowCollapsed = scrollable && scrollEnabled && tasks.length > N_collapsed;
  const badgeIndexCollapsed = N_collapsed - 1;
  const computedMoreCountCollapsed = hasOverflowCollapsed ? tasks.length - badgeIndexCollapsed : 0;

  const expandedBadgeProgressOpacity = progress
    ? progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      })
    : undefined;

  const expandedBadgeScale = progress
    ? progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0.92, 1],
        extrapolate: 'clamp',
      })
    : undefined;

  const expandedTaskProgressOpacity = progress
    ? progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      })
    : undefined;

  const collapsedRowsFade = progress
    ? progress.interpolate({
        inputRange: [0, 0.65, 1],
        outputRange: [1, 0.25, 0],
        extrapolate: 'clamp',
      })
    : undefined;

  // ── Standard non-adaptive values ──────────────────────────────────
  const hasOverflow = canScroll && tasks.length > N_collapsed;
  const badgeIndex = N_collapsed - 1;
  const computedMoreCount = hasOverflow ? tasks.length - badgeIndex : 0;

  const badgeTransitionAnim = useRef(new Animated.Value(hasOverflow ? 1 : 0)).current;
  const isFirstBadgeRender = useRef(true);

  useEffect(() => {
    if (isAdaptive) return;
    if (isFirstBadgeRender.current) {
      isFirstBadgeRender.current = false;
      badgeTransitionAnim.setValue(hasOverflow ? 1 : 0);
      return;
    }
    Animated.timing(badgeTransitionAnim, {
      toValue: hasOverflow ? 1 : 0,
      duration: 240,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start();
  }, [hasOverflow, badgeIndex, badgeTransitionAnim, isAdaptive]);

  const badgeFadeOpacity = badgeTransitionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const taskFadeOpacity = badgeTransitionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const badgeScale = badgeTransitionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
    extrapolate: 'clamp',
  });

  const badgeScrollOpacity = scrollY.interpolate({
    inputRange: [0, 8],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const taskScrollOpacity = scrollY.interpolate({
    inputRange: [0, 8],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View
      onLayout={propContainerHeight ? undefined : (e) => {
        const h = Math.round(e.nativeEvent.layout.height);
        if (h > 0 && Math.abs(h - layoutHeight) > 2) {
          setLayoutHeight(h);
        }
      }}
      style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
    >
      <Animated.ScrollView
        ref={scrollViewRef}
        scrollEnabled={canScroll}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        bounces={canScroll}
        alwaysBounceVertical={false}
        scrollEventThrottle={16}
        snapToInterval={rowStride}
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

              const atTop = y <= 2;
              if (atTop !== isAtTopRef.current) {
                isAtTopRef.current = atTop;
                setIsAtTop(atTop);
              }

              if (canScroll) {
                if (isSwipingRef) (isSwipingRef as any).current = true;
                if (isCardScrollingRef) (isCardScrollingRef as any).current = true;

                const currentIdx = Math.max(0, Math.min(tasks.length - 1, Math.round(y / rowStride)));
                if (currentIdx !== lastHapticIndexRef.current) {
                  const diff = Math.abs(currentIdx - lastHapticIndexRef.current);
                  lastHapticIndexRef.current = currentIdx;
                  triggerScrollHaptic(Haptics.ImpactFeedbackStyle.Rigid);
                  if (diff > 1) {
                    setTimeout(() => {
                      triggerScrollHaptic(Haptics.ImpactFeedbackStyle.Rigid);
                    }, 24);
                  }
                }
              }
            },
          }
        )}
        onScrollEndDrag={(e) => {
          const y = e.nativeEvent.contentOffset?.y ?? 0;
          const atTop = y <= 2;
          if (atTop !== isAtTopRef.current) {
            isAtTopRef.current = atTop;
            setIsAtTop(atTop);
          }

          const velocityY = e.nativeEvent.velocity?.y ?? 0;
          if (Math.abs(velocityY) < 0.1) {
            const currentIdx = Math.max(0, Math.min(tasks.length - 1, Math.round(y / rowStride)));
            if (currentIdx !== lastHapticIndexRef.current) {
              lastHapticIndexRef.current = currentIdx;
              triggerScrollHaptic(Haptics.ImpactFeedbackStyle.Rigid);
            }
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
        onMomentumScrollEnd={(e) => {
          const y = e.nativeEvent.contentOffset?.y ?? 0;
          const atTop = y <= 2;
          if (atTop !== isAtTopRef.current) {
            isAtTopRef.current = atTop;
            setIsAtTop(atTop);
          }

          const currentIdx = Math.max(0, Math.min(tasks.length - 1, Math.round(y / rowStride)));
          if (currentIdx !== lastHapticIndexRef.current) {
            lastHapticIndexRef.current = currentIdx;
            triggerScrollHaptic(Haptics.ImpactFeedbackStyle.Rigid);
          }

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
          paddingTop: edgePad,
          paddingBottom: edgePad,
          gap,
          flexGrow: 1,
        }}
      >
        {tasks.map((task, index) => {
          if (isAdaptive) {
            // ── ADAPTIVE MODE (Morph between collapsed & expanded) ──
            if (hasOverflowExpanded && index === badgeIndexExpanded) {
              return (
                <View
                  key={`${task.id}:${task.date}`}
                  style={{
                    height: ROW_HEIGHT,
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <RouletteRow
                    task={task}
                    index={index}
                    scrollY={scrollY}
                    containerHeight={currentContainerH}
                    canScroll={canScroll}
                    onPress={onPress}
                    onInteraction={onInteraction}
                    isSwipingRef={isSwipingRef}
                    cardBg={colors.card}
                    singleLine={singleLine}
                    rowStride={rowStride}
                    extraOpacity={isAtTop ? expandedTaskProgressOpacity : taskScrollOpacity}
                  />
                  <Animated.View
                    pointerEvents={isSundayVisible ? (isAtTop ? 'auto' : 'none') : 'none'}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      justifyContent: 'center',
                      opacity: expandedBadgeProgressOpacity,
                      transform: [{ scale: expandedBadgeScale ?? 1 }],
                    }}
                  >
                    <Animated.View style={{ opacity: badgeScrollOpacity }}>
                      <Pressable
                        onPress={onPress}
                        hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            alignSelf: 'flex-start',
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                            borderRadius: 7,
                            borderCurve: 'continuous',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10.5,
                              lineHeight: 13,
                              fontWeight: '600',
                              color: colors.today,
                              fontVariant: ['tabular-nums'],
                            }}
                          >
                            {t.common.moreTasks ? t.common.moreTasks(computedMoreCountExpanded) : `+${computedMoreCountExpanded} тағы`}
                          </Text>
                        </View>
                      </Pressable>
                    </Animated.View>
                  </Animated.View>
                </View>
              );
            }

            if (index > badgeIndexExpanded) {
              if (hasOverflowCollapsed && index === badgeIndexCollapsed) {
                return (
                  <View
                    key={`${task.id}:${task.date}`}
                    style={{
                      height: ROW_HEIGHT,
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <RouletteRow
                      task={task}
                      index={index}
                      scrollY={scrollY}
                      containerHeight={currentContainerH}
                      canScroll={canScroll}
                      onPress={onPress}
                      onInteraction={onInteraction}
                      isSwipingRef={isSwipingRef}
                      cardBg={colors.card}
                      singleLine={singleLine}
                      rowStride={rowStride}
                      extraOpacity={isAtTop ? (!isSundayVisible ? undefined : collapsedRowsFade) : taskScrollOpacity}
                    />
                    <Animated.View
                      pointerEvents={!isSundayVisible ? (isAtTop ? 'auto' : 'none') : 'none'}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        justifyContent: 'center',
                        opacity: collapsedRowsFade,
                      }}
                    >
                      <Animated.View style={{ opacity: badgeScrollOpacity }}>
                        <Pressable
                          onPress={onPress}
                          hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
                        >
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              alignSelf: 'flex-start',
                              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                              paddingHorizontal: 7,
                              paddingVertical: 2,
                              borderRadius: 7,
                              borderCurve: 'continuous',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10.5,
                                lineHeight: 13,
                                fontWeight: '600',
                                color: colors.today,
                                fontVariant: ['tabular-nums'],
                              }}
                            >
                              {t.common.moreTasks ? t.common.moreTasks(computedMoreCountCollapsed) : `+${computedMoreCountCollapsed} тағы`}
                            </Text>
                          </View>
                        </Pressable>
                      </Animated.View>
                    </Animated.View>
                  </View>
                );
              }

              return (
                <RouletteRow
                  key={`${task.id}:${task.date}`}
                  task={task}
                  index={index}
                  scrollY={scrollY}
                  containerHeight={currentContainerH}
                  canScroll={canScroll}
                  onPress={onPress}
                  onInteraction={onInteraction}
                  isSwipingRef={isSwipingRef}
                  cardBg={colors.card}
                  singleLine={singleLine}
                  rowStride={rowStride}
                  extraOpacity={isAtTop ? collapsedRowsFade : undefined}
                />
              );
            }

            return (
              <RouletteRow
                key={`${task.id}:${task.date}`}
                task={task}
                index={index}
                scrollY={scrollY}
                containerHeight={currentContainerH}
                canScroll={canScroll}
                onPress={onPress}
                onInteraction={onInteraction}
                isSwipingRef={isSwipingRef}
                cardBg={colors.card}
                singleLine={singleLine}
                rowStride={rowStride}
              />
            );
          }

          // ── NON-ADAPTIVE (STANDARD) MODE ──
          const isBadgeRow = hasOverflow && index === badgeIndex;
          if (isBadgeRow) {
            return (
              <View
                key={`${task.id}:${task.date}`}
                style={{
                  height: ROW_HEIGHT,
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <RouletteRow
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
                  rowStride={rowStride}
                  extraOpacity={isAtTop ? taskFadeOpacity : taskScrollOpacity}
                />
                <Animated.View
                  pointerEvents={isAtTop ? 'auto' : 'none'}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    justifyContent: 'center',
                    opacity: badgeFadeOpacity,
                    transform: [{ scale: badgeScale }],
                  }}
                >
                  <Animated.View style={{ opacity: badgeScrollOpacity }}>
                    <Pressable
                      onPress={onPress}
                      hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          alignSelf: 'flex-start',
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 7,
                          borderCurve: 'continuous',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10.5,
                            lineHeight: 13,
                            fontWeight: '600',
                            color: colors.today,
                            fontVariant: ['tabular-nums'],
                          }}
                        >
                          {t.common.moreTasks ? t.common.moreTasks(computedMoreCount) : `+${computedMoreCount} тағы`}
                        </Text>
                      </View>
                    </Pressable>
                  </Animated.View>
                </Animated.View>
              </View>
            );
          }

          const isBelowBadge = hasOverflow && index > badgeIndex;

          return (
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
              rowStride={rowStride}
              extraOpacity={isBelowBadge ? (isAtTop ? taskFadeOpacity : taskScrollOpacity) : undefined}
            />
          );
        })}
        {/* Empty area tap-to-open */}
        <Pressable
          style={{ flex: 1, minHeight: canScroll ? 0 : 8 }}
          onPress={onPress}
        />
      </Animated.ScrollView>
    </View>
  );
}
