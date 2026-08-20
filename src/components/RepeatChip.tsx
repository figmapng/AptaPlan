import { StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { TaskRepeat } from '@/types/task';
import { useTheme } from '@/hooks/use-theme';
import { AnimatedPressable } from './AnimatedPressable';

interface RepeatChipProps {
  repeat: TaskRepeat | null;
  interval?: number;
  customLabel?: string;
  onPress: () => void;
  hapticsEnabled?: boolean;
}

export const repeatLabels: Record<TaskRepeat, string> = {
  none: 'Қайталанбайды',
  hourly: 'Сағат сайын',
  daily: 'Күнде',
  weekdays: 'Жұмыс күндері',
  weekends: 'Демалыс күндері',
  weekly: 'Апта сайын',
  monthly: 'Ай сайын',
  yearly: 'Жыл сайын',
  custom: 'Арнайы',
};

export function getShortRepeatLabel(repeat: TaskRepeat | null, interval = 1): string | null {
  if (!repeat || repeat === 'none') return null;

  if (interval > 1) {
    if (repeat === 'hourly') return `Әр ${interval} сағатта`;
    if (repeat === 'daily' || repeat === 'custom') return `Әр ${interval} күнде`;
    if (repeat === 'weekly') return `Әр ${interval} аптада`;
    if (repeat === 'monthly') return `Әр ${interval} айда`;
    if (repeat === 'yearly') return `Әр ${interval} жылда`;
  }

  return repeatLabels[repeat] || 'Арнайы';
}

export function RepeatChip({ repeat, interval = 1, customLabel, onPress, hapticsEnabled = true }: RepeatChipProps) {
  const { colors } = useTheme();

  const handlePress = async () => {
    if (hapticsEnabled && process.env.EXPO_OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const isActive = repeat && repeat !== 'none';
  const label = (repeat === 'custom' && customLabel) ? customLabel : getShortRepeatLabel(repeat, interval);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`Қайталау: ${label || 'Орнатылмаған'}`}
      onPress={handlePress}
      activeScale={0.93}
      style={[
        styles.chip,
        { backgroundColor: '#FFFFFF', borderColor: colors.inputBorder },
        isActive ? [styles.activeChip, { backgroundColor: '#FFFFFF', borderColor: colors.cardBorder }] : undefined,
        !label ? styles.iconOnly : undefined,
      ]}
    >
      <RepeatIcon size={16} color={isActive ? colors.text : colors.secondary} />
      {label && <Text style={[styles.text, { color: colors.text }]}>{label}</Text>}
    </AnimatedPressable>
  );
}

function RepeatIcon({ color = '#23262D', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M16.5 4.5H5.5C3.84315 4.5 2.5 5.84315 2.5 7.5V8M13.5 1.5L16.5 4.5L13.5 7.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3.5 15.5H14.5C16.1569 15.5 17.5 14.1569 17.5 12.5V12M6.5 18.5L3.5 15.5L6.5 12.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 34,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#ECEEF2',
  },
  iconOnly: {
    width: 34,
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: '#E5E7EB',
  },
  activeChip: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  activeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
});
