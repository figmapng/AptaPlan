import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/use-i18n';
import { AnimatedPressable } from './AnimatedPressable';

interface BackButtonProps {
  onPress: () => void;
  accessibilityLabel?: string;
  size?: number;
}

export function BackButton({
  onPress,
  accessibilityLabel,
  size = 52,
}: BackButtonProps) {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const iconSize = Math.round((size * 20) / 48);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || t.common.back}
      onPress={onPress}
      activeScale={0.94}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderCurve: 'continuous',
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#EBEDF0',
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? colors.cardBorder : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        <Path
          d="M15 18l-6-6 6-6"
          stroke={isDark ? colors.text : '#31383E'}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </AnimatedPressable>
  );
}

