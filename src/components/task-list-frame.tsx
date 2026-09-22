import { ScrollView, Text, View } from 'react-native';
import type React from 'react';
import type { Task } from '@/types/task';
import { TaskRow } from './task-row';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/use-i18n';

interface TaskListFrameProps {
  tasks: Task[];
  moreCount?: number;
  scrollable?: boolean;
  scrollEnabled?: boolean;
  onScrollYChange?: (scrollY: number) => void;
  onPress: () => void;
  onInteraction?: () => void;
  isSwipingRef?: React.RefObject<boolean>;
  singleLine?: boolean;
}

export function TaskListFrame({
  tasks,
  moreCount = 0,
  scrollable = false,
  scrollEnabled = true,
  onScrollYChange,
  onPress,
  onInteraction,
  isSwipingRef,
  singleLine = false,
}: TaskListFrameProps) {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const rows = (
    <View style={{ gap: 4 }}>
      {tasks.map((task) => (
        <TaskRow
          key={`${task.id}:${task.date}`}
          task={task}
          compact
          onPress={onPress}
          onInteraction={onInteraction}
          isSwipingRef={isSwipingRef}
          cardBg={colors.card}
          singleLine={singleLine}
        />
      ))}
      {moreCount > 0 && (
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
            marginTop: 1,
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
            {t.common.moreTasks ? t.common.moreTasks(moreCount) : `+${moreCount} тағы`}
          </Text>
        </View>
      )}
    </View>
  );

  if (!scrollable) return rows;

  return (
    <ScrollView
      scrollEnabled={scrollEnabled}
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      bounces
      alwaysBounceVertical
      scrollEventThrottle={16}
      onScroll={(event) => onScrollYChange?.(event.nativeEvent.contentOffset.y)}
      contentContainerStyle={{ paddingBottom: 8 }}
    >
      {rows}
    </ScrollView>
  );
}
