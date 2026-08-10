import { StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { formatChipDate } from '@/utils/dateHelpers';
import { AnimatedPressable } from './AnimatedPressable';

interface DateChipProps {
  date: string | null;
  onPress: () => void;
  hapticsEnabled?: boolean;
}

export function DateChip({ date, onPress, hapticsEnabled = true }: DateChipProps) {
  const handlePress = async () => {
    if (hapticsEnabled && process.env.EXPO_OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const displayText = date ? formatChipDate(date) : null;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`Күн: ${displayText || 'Таңдалмаған'}`}
      onPress={handlePress}
      activeScale={0.93}
      style={[
        styles.chip,
        date ? styles.activeChip : undefined,
        !date ? styles.iconOnly : undefined,
      ]}
    >
      <CalendarIcon color={date ? '#23262D' : '#707684'} />
      {displayText && <Text style={styles.activeText}>{displayText}</Text>}
    </AnimatedPressable>
  );
}

function CalendarIcon({ color = '#23262D' }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
      <Path
        d="M1.6665 10C1.6665 6.85734 1.6665 5.286 2.64281 4.30968C3.61913 3.33337 5.19047 3.33337 8.33317 3.33337H11.6665C14.8092 3.33337 16.3806 3.33337 17.3568 4.30968C18.3332 5.286 18.3332 6.85734 18.3332 10V11.6667C18.3332 14.8094 18.3332 16.3808 17.3568 17.357C16.3806 18.3334 14.8092 18.3334 11.6665 18.3334H8.33317C5.19047 18.3334 3.61913 18.3334 2.64281 17.357C1.6665 16.3808 1.6665 14.8094 1.6665 11.6667V10Z"
        stroke={color}
        strokeWidth="1.5"
      />
      <Path d="M5.8335 3.33337V2.08337" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M14.1665 3.33337V2.08337" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M2.0835 7.5H17.9168" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M15.0002 14.1667C15.0002 14.627 14.6271 15 14.1668 15C13.7066 15 13.3335 14.627 13.3335 14.1667C13.3335 13.7065 13.7066 13.3334 14.1668 13.3334C14.6271 13.3334 15.0002 13.7065 15.0002 14.1667Z" fill={color} />
      <Path d="M15.0002 10.8333C15.0002 11.2936 14.6271 11.6667 14.1668 11.6667C13.7066 11.6667 13.3335 11.2936 13.3335 10.8333C13.3335 10.3731 13.7066 10 14.1668 10C14.6271 10 15.0002 10.3731 15.0002 10.8333Z" fill={color} />
      <Path d="M10.8332 14.1667C10.8332 14.627 10.4601 15 9.99984 15C9.53959 15 9.1665 14.627 9.1665 14.1667C9.1665 13.7065 9.53959 13.3334 9.99984 13.3334C10.4601 13.3334 10.8332 13.7065 10.8332 14.1667Z" fill={color} />
      <Path d="M10.8332 10.8333C10.8332 11.2936 10.4601 11.6667 9.99984 11.6667C9.53959 11.6667 9.1665 11.2936 9.1665 10.8333C9.1665 10.3731 9.53959 10 9.99984 10C10.4601 10 10.8332 10.3731 10.8332 10.8333Z" fill={color} />
      <Path d="M6.66667 14.1667C6.66667 14.627 6.29357 15 5.83333 15C5.3731 15 5 14.627 5 14.1667C5 13.7065 5.3731 13.3334 5.83333 13.3334C6.29357 13.3334 6.66667 13.7065 6.66667 14.1667Z" fill={color} />
      <Path d="M6.66667 10.8333C6.66667 11.2936 6.29357 11.6667 5.83333 11.6667C5.3731 11.6667 5 11.2936 5 10.8333C5 10.3731 5.3731 10 5.83333 10C6.29357 10 6.66667 10.3731 6.66667 10.8333Z" fill={color} />
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
  },
  activeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#23262D',
  },
});
