import { getDeviceScreenRadius, getConcentricRadius } from '../screen-radius';
import { Platform, Dimensions } from 'react-native';

describe('screen-radius utility', () => {
  it('returns 0 for Home button devices (insets.bottom === 0, insets.top <= 24)', () => {
    Platform.OS = 'ios';
    (Platform as any).isPad = false;
    const radius = getDeviceScreenRadius({ top: 20, bottom: 0, left: 0, right: 0 });
    expect(radius).toBe(0);
  });

  it('calculates concentric radius correctly', () => {
    // 55 - 16 = 39
    expect(getConcentricRadius(55, 16)).toBe(39);
    // 47.33 - 16 = 31
    expect(getConcentricRadius(47.33, 16)).toBe(31);
    // 0 -> fallback minRadius 16
    expect(getConcentricRadius(0, 16)).toBe(16);
  });

  it('detects Dynamic Island iPhone 14/15/16/17 radius as 55pt', () => {
    Platform.OS = 'ios';
    (Platform as any).isPad = false;
    const radius = getDeviceScreenRadius({ top: 59, bottom: 34, left: 0, right: 0 });
    expect(radius).toBe(55);
  });

  it('detects iPhone 12/13/14 notch radius as 47.33pt', () => {
    Platform.OS = 'ios';
    (Platform as any).isPad = false;
    const radius = getDeviceScreenRadius({ top: 47, bottom: 34, left: 0, right: 0 });
    expect(radius).toBe(47.33);
  });
});
