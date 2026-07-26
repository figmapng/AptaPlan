import React, { useRef, useState } from 'react';
import { Animated, GestureResponderEvent, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  activeScale?: number;
  enableHaptics?: boolean;
  hapticStyle?: Haptics.ImpactFeedbackStyle;
}

export function AnimatedPressable({
  children,
  style,
  activeScale = 0.96,
  enableHaptics = true,
  hapticStyle = Haptics.ImpactFeedbackStyle.Light,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...rest
}: AnimatedPressableProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isPressed, setIsPressed] = useState(false);

  const handlePressIn = (event: GestureResponderEvent) => {
    if (!disabled) {
      setIsPressed(true);
      Animated.spring(scaleAnim, {
        toValue: activeScale,
        speed: 24,
        bounciness: 0,
        useNativeDriver: true,
      }).start();
      if (enableHaptics && process.env.EXPO_OS === 'ios') {
        void Haptics.impactAsync(hapticStyle);
      }
    }
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    if (!disabled) {
      setIsPressed(false);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 300,
        useNativeDriver: true,
      }).start();
    }
    onPressOut?.(event);
  };

  const resolvedStyle = typeof style === 'function' ? style({ pressed: isPressed }) : style;

  return (
    <AnimatedPressableComponent
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[
        resolvedStyle,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      {children}
    </AnimatedPressableComponent>
  );
}
