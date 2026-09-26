import React from 'react';
import { Platform } from 'react-native';
import {
  GlassView as ExpoGlassView,
  GlassContainer,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
  type GlassViewProps as BaseGlassViewProps,
  type GlassStyle,
  type GlassColorScheme,
} from 'expo-glass-effect';

export type GlassViewProps = BaseGlassViewProps & {
  borderRadius?: number;
  borderCurve?: 'continuous' | 'circular';
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderBottomLeftRadius?: number;
  borderBottomRightRadius?: number;
};

export const GlassView = ExpoGlassView as unknown as React.ComponentType<GlassViewProps>;

export {
  GlassContainer,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
  type GlassStyle,
  type GlassColorScheme,
};

let cachedSupported: boolean | null = null;

/**
 * Safely checks if Apple native Liquid Glass effect is available on the current device and runtime.
 */
export function checkIsLiquidGlassSupported(): boolean {
  if (Platform.OS !== 'ios') {
    return false;
  }
  if (cachedSupported !== null) {
    return cachedSupported;
  }
  try {
    const lga = Boolean(isLiquidGlassAvailable?.());
    const gea = Boolean(isGlassEffectAPIAvailable?.());
    cachedSupported = lga && gea;
    return cachedSupported;
  } catch {
    cachedSupported = false;
    return false;
  }
}
