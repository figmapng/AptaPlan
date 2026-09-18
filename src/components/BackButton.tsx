import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { checkIsLiquidGlassSupported, GlassView } from '@/utils/glass';
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
  size = 50,
}: BackButtonProps) {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const isLiquidGlass = useMemo(() => checkIsLiquidGlassSupported(), []);
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
        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.65)' : 'rgba(255, 255, 255, 0.82)',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.35 : 0.08,
        shadowRadius: 14,
        elevation: 4,
      }}
    >
      <View
        style={{
          flex: 1,
          borderRadius: size / 2,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isLiquidGlass ? (
          <GlassView
            glassEffectStyle="regular"
            isInteractive={false}
            colorScheme={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        ) : (
          <BlurView
            tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
            intensity={95}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        )}
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          <Path
            d="M15 18l-6-6 6-6"
            stroke={isDark ? colors.text : '#707684'}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </AnimatedPressable>
  );
}

