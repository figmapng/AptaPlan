import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { AnimatedPressable } from './AnimatedPressable';

export type ViewMode = 'day' | 'week' | 'month' | 'year';

interface ViewModeModalProps {
  visible: boolean;
  currentMode: ViewMode;
  onSelectMode: (mode: ViewMode) => void;
  onClose: () => void;
  buttonBounds?: { x: number; y: number; width: number; height: number } | null;
  topOffset?: number;
}

export function ViewModeModal({
  visible,
  currentMode,
  onSelectMode,
  onClose,
  buttonBounds,
  topOffset = 60,
}: ViewModeModalProps) {
  const { width: screenWidth } = useWindowDimensions();
  const anim = useRef(new Animated.Value(0)).current;

  const triggerHaptic = () => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  useEffect(() => {
    if (visible) {
      Animated.spring(anim, {
        toValue: 1,
        friction: 8,
        tension: 90,
        useNativeDriver: true,
      }).start();
    } else {
      anim.setValue(0);
    }
  }, [visible, anim]);

  if (!visible) return null;

  const handleSelect = (mode: ViewMode) => {
    triggerHaptic();
    onSelectMode(mode);
    onClose();
  };

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 0],
  });

  const cardWidth = 175;
  const arrowWidth = 30;

  let top = topOffset;
  let popoverLeft = screenWidth - cardWidth - 16;
  let arrowLeft = cardWidth - 45;

  if (buttonBounds && buttonBounds.width > 0 && buttonBounds.height > 0) {
    top = buttonBounds.y + buttonBounds.height + 6;
    // Center arrow on the whole mode button (buttonCenterX)
    const buttonCenterX = buttonBounds.x + buttonBounds.width / 2;
    popoverLeft = Math.max(12, Math.min(buttonCenterX - cardWidth / 2, screenWidth - cardWidth - 12));
    arrowLeft = buttonCenterX - popoverLeft - arrowWidth / 2;
    arrowLeft = Math.max(12, Math.min(arrowLeft, cardWidth - arrowWidth - 12));
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.dropdownWrapper,
            { top, left: popoverLeft, width: cardWidth },
            { opacity, transform: [{ scale }, { translateY }] },
          ]}
        >
          {/* Callout arrow pointing upward — SVG rounded */}
          <View style={[styles.arrowWrapper, { left: arrowLeft }]}>
            <CalloutArrow />
          </View>
          <View style={styles.dropdownCard}>


          {/* Option 1: Week */}
          <AnimatedPressable
            activeScale={0.96}
            style={[styles.optionItem, currentMode === 'week' && styles.optionItemActive]}
            onPress={() => handleSelect('week')}
          >
            <View style={styles.optionLeft}>
              <WeekViewIcon color={currentMode === 'week' ? colors.today : colors.text} />
              <Text style={[styles.optionText, currentMode === 'week' && styles.optionTextActive]}>
                Апта
              </Text>
            </View>
            {currentMode === 'week' && <CheckmarkIcon color={colors.today} />}
          </AnimatedPressable>

          <View style={styles.divider} />

          {/* Option 2: Month */}
          <AnimatedPressable
            activeScale={0.96}
            style={[styles.optionItem, currentMode === 'month' && styles.optionItemActive]}
            onPress={() => handleSelect('month')}
          >
            <View style={styles.optionLeft}>
              <MonthViewIcon color={currentMode === 'month' ? colors.today : colors.text} />
              <Text style={[styles.optionText, currentMode === 'month' && styles.optionTextActive]}>
                Ай
              </Text>
            </View>
            {currentMode === 'month' && <CheckmarkIcon color={colors.today} />}
          </AnimatedPressable>

          <View style={styles.divider} />

          {/* Option 3: Year */}
          <AnimatedPressable
            activeScale={0.96}
            style={[styles.optionItem, currentMode === 'year' && styles.optionItemActive]}
            onPress={() => handleSelect('year')}
          >
            <View style={styles.optionLeft}>
              <YearViewIcon color={currentMode === 'year' ? colors.today : colors.text} />
              <Text style={[styles.optionText, currentMode === 'year' && styles.optionTextActive]}>
                Жыл
              </Text>
            </View>
            {currentMode === 'year' && <CheckmarkIcon color={colors.today} />}
          </AnimatedPressable>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function DayViewIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="17" rx="3" stroke={color} strokeWidth="2" />
      <Path d="M3 9h18M8 2v4M16 2v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="12" cy="14" r="2" fill={color} />
    </Svg>
  );
}

function WeekViewIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="17" rx="3" stroke={color} strokeWidth="2" />
      <Path d="M3 9h18M8 2v4M16 2v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M7 14h2M11 14h2M15 14h2" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function MonthViewIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="17" rx="3" stroke={color} strokeWidth="2" />
      <Path d="M3 9h18M8 2v4M16 2v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="8" cy="13" r="1.25" fill={color} />
      <Circle cx="12" cy="13" r="1.25" fill={color} />
      <Circle cx="16" cy="13" r="1.25" fill={color} />
      <Circle cx="8" cy="17" r="1.25" fill={color} />
      <Circle cx="12" cy="17" r="1.25" fill={color} />
      <Circle cx="16" cy="17" r="1.25" fill={color} />
    </Svg>
  );
}

function YearViewIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <Path
        d="M3.6 9h16.8M3.6 15h16.8M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckmarkIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Rounded callout arrow — smooth bezier tip and base corners, like the reference */
function CalloutArrow() {
  return (
    <Svg width={30} height={15} viewBox="0 0 30 15">
      <Path
        d="M0 15 C5 15, 10 8, 13 3 Q15 0 17 3 C20 8, 25 15, 30 15 Z"
        fill={colors.background}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  dropdownWrapper: {
    position: 'absolute',
  },
  arrowWrapper: {
    position: 'absolute',
    top: -13,
    zIndex: 2,
  },
  dropdownCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 6,
    boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
    elevation: 20,
    zIndex: 1,
  },
  optionItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.inputBg,
  },
  optionItemActive: {
    backgroundColor: '#01B7FF12',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  optionTextActive: {
    color: colors.today,
    fontWeight: '700',
  },
  divider: {
    height: 6,
  },
});
