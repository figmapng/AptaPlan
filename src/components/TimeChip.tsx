import { StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { AnimatedPressable } from './AnimatedPressable';

interface TimeChipProps {
  time: string | null;
  onPress: () => void;
  hapticsEnabled?: boolean;
}

export function TimeChip({ time, onPress, hapticsEnabled = true }: TimeChipProps) {
  const handlePress = async () => {
    if (hapticsEnabled && process.env.EXPO_OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`Уақыт: ${time || 'Таңдалмаған'}`}
      onPress={handlePress}
      activeScale={0.93}
      style={[
        styles.chip,
        time ? styles.activeChip : undefined,
        !time ? styles.iconOnly : undefined,
      ]}
    >
      <ClockIcon size={16} color={time ? '#4B5563' : '#707684'} />
      {time && <Text style={styles.activeText}>{time}</Text>}
    </AnimatedPressable>
  );
}

function ClockIcon({ color = '#23262D', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 18.3334C14.1421 18.3334 17.5 14.9755 17.5 10.8334C17.5 6.69124 14.1421 3.33337 10 3.33337C5.85786 3.33337 2.5 6.69124 2.5 10.8334C2.5 14.9755 5.85786 18.3334 10 18.3334Z"
        stroke={color}
        strokeWidth="1.5"
      />
      <Path
        d="M10 7.5V10.8333L12.0833 12.9167"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M2.9165 3.74996L6.24985 1.66663"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M17.0833 3.74996L13.75 1.66663"
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
  activeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
});
