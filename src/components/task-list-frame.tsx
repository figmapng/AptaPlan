import { ScrollView, View } from 'react-native';
import type React from 'react';
import type { Task } from '@/types/task';
import { useTheme } from '@/context/theme-context';
import { TaskRow } from './task-row';

interface TaskListFrameProps {
  tasks: Task[];
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
  scrollable = false,
  scrollEnabled = true,
  onScrollYChange,
  onPress,
  onInteraction,
  isSwipingRef,
  singleLine = false,
}: TaskListFrameProps) {
  const { colors } = useTheme();

  const rows = (
    <View style={{ gap: 2 }}>
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
