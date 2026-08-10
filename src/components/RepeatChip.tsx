import { StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { TaskRepeat } from '@/types/task';
import { AnimatedPressable } from './AnimatedPressable';

interface RepeatChipProps {
  repeat: TaskRepeat | null;
  onPress: () => void;
  hapticsEnabled?: boolean;
}

export const repeatLabels: Record<TaskRepeat, string> = {
  none: 'Қайталанбайды',
  hourly: 'Сағат сайын',
  daily: 'Күн сайын',
  weekdays: 'Жұмыс күндері',
  weekends: 'Демалыс күндері',
  weekly: 'Апта сайын',
  monthly: 'Ай сайын',
  yearly: 'Жыл сайын',
  custom: 'Арнайы',
};

export function RepeatChip({ repeat, onPress, hapticsEnabled = true }: RepeatChipProps) {
  const handlePress = async () => {
    if (hapticsEnabled && process.env.EXPO_OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const isActive = repeat && repeat !== 'none';
  const label = isActive ? repeatLabels[repeat] : null;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`Қайталау: ${label || 'Орнатылмаған'}`}
      onPress={handlePress}
      activeScale={0.93}
      style={[
        styles.chip,
        isActive ? styles.activeChip : undefined,
        !label ? styles.iconOnly : undefined,
      ]}
    >
      <RepeatIcon color={isActive ? '#23262D' : '#707684'} />
      {label && <Text style={[styles.text, isActive && styles.activeText]}>{label}</Text>}
    </AnimatedPressable>
  );
}

function RepeatIcon({ color = '#23262D' }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M15.3035 6.70851L14.7142 6.11925C12.1107 3.51576 7.88961 3.51576 5.28612 6.11925C2.68262 8.72271 2.68262 12.9439 5.28612 15.5474C7.88961 18.1509 12.1107 18.1509 14.7142 15.5474C16.2282 14.0333 16.8618 11.9723 16.6149 10.0004M15.3035 3.17297V6.70851H11.7679"
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
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
  },
  iconOnly: {
    width: 38,
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: '#E5E7EB',
  },
  activeChip: {
    backgroundColor: '#F3F4F6',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#23262D',
  },
  activeText: {
    color: '#23262D',
  },
});
