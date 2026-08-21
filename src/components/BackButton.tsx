import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/hooks/use-theme';
import { AnimatedPressable } from './AnimatedPressable';

interface BackButtonProps {
  onPress: () => void;
  accessibilityLabel?: string;
  size?: number;
}

export function BackButton({
  onPress,
  accessibilityLabel = 'Артқа қайту',
  size = 48,
}: BackButtonProps) {
  const { colors } = useTheme();
  const iconSize = Math.round((size * 20) / 48);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      activeScale={0.94}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.inputBg,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        <Path
          d="M15 18l-6-6 6-6"
          stroke={colors.secondary}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </AnimatedPressable>
  );
}

