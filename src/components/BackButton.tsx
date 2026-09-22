import React, { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { checkIsLiquidGlassSupported, GlassView } from '@/utils/glass';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/use-i18n';
import { AnimatedPressable } from './AnimatedPressable';

interface BackButtonProps {
  onPress: () => void;
  accessibilityLabel?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function BackButton({
  onPress,
  accessibilityLabel,
  size = 40,
  style,
}: BackButtonProps) {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const isLiquidGlass = useMemo(() => checkIsLiquidGlassSupported(), []);
  const iconSize = Math.max(18, Math.round((size * 20) / 40));

  if (isLiquidGlass) {
    return (
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || t.common.back}
        onPress={onPress}
        activeScale={0.92}
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderCurve: 'continuous',
          },
          style,
        ]}
      >
        <GlassView
          glassEffectStyle="clear"
          isInteractive={true}
          colorScheme={isDark ? 'dark' : 'light'}
          borderRadius={size / 2}
          borderCurve="continuous"
          style={{
            flex: 1,
            borderRadius: size / 2,
            borderCurve: 'continuous',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.10)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)',
          }}
        >
          <Ionicons
            name="chevron-back"
            size={iconSize}
            color={colors.text}
            style={{ marginLeft: -1 }}
          />
        </GlassView>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || t.common.back}
      onPress={onPress}
      activeScale={0.92}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderCurve: 'continuous',
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.65)' : 'rgba(255, 255, 255, 0.82)',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.06,
          shadowRadius: 8,
          elevation: 2,
        },
        style,
      ]}
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
        <BlurView
          tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
          intensity={60}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Ionicons
          name="chevron-back"
          size={iconSize}
          color={colors.text}
          style={{ marginLeft: -1 }}
        />
      </View>
    </AnimatedPressable>
  );
}

