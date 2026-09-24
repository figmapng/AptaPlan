import React, { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { checkIsLiquidGlassSupported, GlassView } from '@/utils/glass';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/use-i18n';
import { AnimatedPressable } from './AnimatedPressable';

export interface BottomTaskInputProps {
  onAddTask?: () => void;
  onInteraction?: () => void;
  children?: React.ReactNode;
  minHeight?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

export function BottomTaskInput({
  onAddTask,
  onInteraction,
  children,
  minHeight = 50,
  style,
  testID,
  accessibilityLabel,
}: BottomTaskInputProps) {
  const { isDark, colors } = useTheme();
  const { t } = useI18n();
  const isLiquidGlass = useMemo(() => checkIsLiquidGlassSupported(), []);

  const handlePress = () => {
    onInteraction?.();
    onAddTask?.();
  };

  const hasChildren = Boolean(children);

  const sharedShellStyle: ViewStyle = {
    borderRadius: 25,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
  };

  if (isLiquidGlass) {
    if (hasChildren) {
      return (
        <GlassView
          glassEffectStyle="clear"
          isInteractive={true}
          colorScheme={isDark ? 'dark' : 'light'}
          borderRadius={25}
          borderCurve="continuous"
          testID={testID}
          accessibilityLabel={accessibilityLabel}
          style={[
            sharedShellStyle,
            {
              minHeight: Math.max(50, minHeight),
              position: 'relative',
              overflow: 'hidden',
            },
            style,
          ]}
        >
          {children}
        </GlassView>
      );
    }

    return (
      <AnimatedPressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || t.common.addTask}
        onPress={handlePress}
        activeScale={0.97}
        style={[
          {
            height: 50,
            borderRadius: 25,
            borderCurve: 'continuous',
          },
          style,
        ]}
      >
        <GlassView
          glassEffectStyle="clear"
          isInteractive={true}
          colorScheme={isDark ? 'dark' : 'light'}
          borderRadius={25}
          borderCurve="continuous"
          style={[
            sharedShellStyle,
            {
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              gap: 8,
            },
          ]}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 4.5v15M4.5 12h15"
              stroke={colors.secondary}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 16,
              fontWeight: '400',
              color: colors.secondary,
            }}
          >
            {t.common.addTask}
          </Text>
        </GlassView>
      </AnimatedPressable>
    );
  }

  if (hasChildren) {
    return (
      <View
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        style={[
          sharedShellStyle,
          {
            minHeight: Math.max(50, minHeight),
            position: 'relative',
            overflow: 'hidden',
          },
          style,
        ]}
      >
        <BlurView
          tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
          intensity={30}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {children}
      </View>
    );
  }

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || t.common.addTask}
      onPress={handlePress}
      activeScale={0.97}
      style={[
        {
          height: 50,
          borderRadius: 25,
          borderCurve: 'continuous',
          backgroundColor: sharedShellStyle.backgroundColor,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.35 : 0.08,
          shadowRadius: 14,
          elevation: 4,
        },
        style,
      ]}
    >
      <View
        style={[
          sharedShellStyle,
          {
            flex: 1,
            overflow: 'hidden',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            gap: 8,
          },
        ]}
      >
        <BlurView
          tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
          intensity={30}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 4.5v15M4.5 12h15"
            stroke={colors.secondary}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: 16,
            fontWeight: '400',
            color: colors.secondary,
          }}
        >
          {t.common.addTask}
        </Text>
      </View>
    </AnimatedPressable>
  );
}
