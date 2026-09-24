import { Dimensions, Platform } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';

/**
 * Returns the physical screen corner radius in points for the current device.
 * Based on Apple official hardware specs and Android system metrics.
 */
export function getDeviceScreenRadius(insets: EdgeInsets): number {
  if (Platform.OS === 'android') {
    // Android devices with gesture navigation or display cutouts
    if (insets.top > 28 || insets.bottom > 0) {
      return 32;
    }
    return 16;
  }

  if (Platform.OS !== 'ios') {
    return 16;
  }

  // Home button iPhones (iPhone SE 2/3, iPhone 8/7/6s) -> square 0 corner radius
  if (insets.bottom === 0 && insets.top <= 24) {
    return 0;
  }

  // iPads
  if (Platform.isPad) {
    return insets.bottom > 0 ? 18 : 0;
  }

  const { width, height } = Dimensions.get('window');
  const screenLong = Math.max(width, height);
  const screenShort = Math.min(width, height);

  // iPhone 16 Pro, 16 Pro Max, 17, 17 Pro, 17 Pro Max (Ultra-slim bezels, 55-56pt)
  // Window width >= 402, insets.top >= 59
  if (screenShort >= 402 && insets.top >= 59) {
    return 55;
  }

  // iPhone 14 Pro, 14 Pro Max, 15, 15 Plus, 15 Pro, 15 Pro Max, 16, 16 Plus (Dynamic Island, 55pt)
  if (insets.top >= 54) {
    return 55;
  }

  // iPhone 12, 12 Pro, 13, 13 Pro, 14 (47.33pt)
  if (insets.top === 47) {
    return 47.33;
  }

  // iPhone 12 mini, 13 mini (44pt)
  if (insets.top === 50) {
    return 44;
  }

  // iPhone XR, 11 (41.5pt)
  if (insets.top === 48) {
    return 41.5;
  }

  // iPhone X, XS, 11 Pro (39pt)
  if (insets.top === 44) {
    return 39;
  }

  // Fallback for notched/pill iPhones
  if (insets.bottom >= 34) {
    return 47;
  }

  return 0;
}

/**
 * Calculates concentric corner radius for a nested card inside a container
 * with outerRadius and given margin M: R_inner = max(outerRadius - M, minRadius).
 */
export function getConcentricRadius(
  outerRadius: number,
  margin: number = 16,
  minRadius: number = 16
): number {
  if (outerRadius <= 0) {
    return minRadius;
  }
  return Math.max(Math.round(outerRadius - margin), minRadius);
}
