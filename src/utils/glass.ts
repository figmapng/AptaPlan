import { Platform } from 'react-native';
import {
  GlassView,
  GlassContainer,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
  type GlassViewProps,
  type GlassStyle,
  type GlassColorScheme,
} from 'expo-glass-effect';

export {
  GlassView,
  GlassContainer,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
  type GlassViewProps,
  type GlassStyle,
  type GlassColorScheme,
};

/**
 * Safely checks if Apple native Liquid Glass effect is available on the current device and runtime.
 */
export function checkIsLiquidGlassSupported(): boolean {
  if (Platform.OS !== 'ios') {
    return false;
  }
  try {
    return Boolean(isLiquidGlassAvailable?.() && isGlassEffectAPIAvailable?.());
  } catch {
    return false;
  }
}
