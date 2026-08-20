import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { TaskRepeat } from '@/types/task';
import { colors as defaultColors } from '@/constants/colors';
import { useTheme } from '@/context/theme-context';
import { getShortRepeatLabel, repeatLabels } from './RepeatChip';
import { AnimatedPressable } from './AnimatedPressable';
import { CustomRepeatConfig, CustomRepeatModal, CustomUnit } from './CustomRepeatModal';

interface RepeatActionSheetProps {
  visible: boolean;
  selectedRepeat: TaskRepeat | null;
  selectedRepeatInterval?: number;
  selectedCustomLabel?: string;
  selectedCustomUnit?: CustomUnit | null;
  selectedCustomConfig?: CustomRepeatConfig | null;
  onSelectRepeat: (
    repeat: TaskRepeat,
    interval?: number,
    customLabel?: string,
    customUnit?: CustomUnit,
    customConfig?: CustomRepeatConfig
  ) => void;
  onClose: () => void;
}

const repeatOptions: TaskRepeat[] = [
  'none',
  'daily',
  'weekdays',
  'weekends',
  'weekly',
  'monthly',
  'yearly',
  'custom',
];

export function RepeatActionSheet({
  visible,
  selectedRepeat,
  selectedRepeatInterval = 1,
  selectedCustomLabel,
  selectedCustomUnit,
  selectedCustomConfig,
  onSelectRepeat,
  onClose,
}: RepeatActionSheetProps) {
  const { colors, isDark } = useTheme();
  const translateY = useRef(new Animated.Value(420)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [showCustomModal, setShowCustomModal] = useState(false);

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.impactAsync(style);
    }
  };

  const handleClose = () => {
    triggerHaptic();
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 160, useNativeDriver: false }),
      Animated.timing(translateY, { toValue: 420, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: false }),
    ]).start(() => onCloseRef.current());
  };

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: false }),
        Animated.spring(translateY, { toValue: 0, friction: 8, tension: 85, useNativeDriver: false }),
      ]).start();
    } else {
      translateY.setValue(420);
      backdropOpacity.setValue(0);
      setShowCustomModal(false);
    }
  }, [visible, translateY, backdropOpacity]);

  if (!visible) return null;

  const current = selectedRepeat || 'none';

  const handleOptionClick = (opt: TaskRepeat) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    if (opt === 'custom') {
      setShowCustomModal(true);
    } else {
      onSelectRepeat(opt, 1, undefined, undefined, undefined);
      handleClose();
    }
  };

  return (
    <>
      <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <Animated.View style={[styles.sheet, { backgroundColor: colors.sheetBg, transform: [{ translateY }] }]}>
          <View style={[styles.dragPill, { backgroundColor: isDark ? '#3D4452' : '#D1D5DB' }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Қайталау жиілігі</Text>
            <AnimatedPressable
              activeScale={0.88}
              style={[styles.closeBtn, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Жабу"
            >
              <CloseXIcon color={colors.text} />
            </AnimatedPressable>
          </View>

          <View style={styles.optionsList}>
            {repeatOptions.map((opt) => {
              const isCustomSelected = (selectedRepeatInterval > 1 || current === 'custom') && opt === 'custom';
              const isStandardSelected = selectedRepeatInterval <= 1 && current !== 'custom' && current === opt;
              const isSelected = isCustomSelected || isStandardSelected;

              const shortCustomLabel = selectedCustomLabel || getShortRepeatLabel(current, selectedRepeatInterval);
              const labelText =
                opt === 'custom' && isSelected && shortCustomLabel
                  ? `Арнайы (${shortCustomLabel})`
                  : repeatLabels[opt];

              const iconColor = isSelected ? colors.today : colors.secondary;

              return (
                <AnimatedPressable
                  key={opt}
                  activeScale={0.97}
                  style={[
                    styles.optionItem,
                    { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                    isSelected && [styles.optionItemActive, { backgroundColor: isDark ? '#0284C725' : '#01B7FF12', borderColor: colors.today }],
                  ]}
                  onPress={() => handleOptionClick(opt)}
                >
                  <View style={styles.optionLeftContent}>
                    <OptionIcon opt={opt} color={iconColor} />
                    <Text style={[styles.optionText, { color: colors.text }, isSelected && [styles.optionTextActive, { color: colors.today }]]}>
                      {labelText}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.checkmarkBadge}>
                      <CheckIcon color={colors.today} />
                    </View>
                  )}
                </AnimatedPressable>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>

      {/* Custom Interval Picker Modal */}
      <CustomRepeatModal
        visible={showCustomModal}
        currentRepeat={selectedRepeat}
        currentInterval={selectedRepeatInterval}
        currentCustomUnit={selectedCustomUnit}
        currentCustomConfig={selectedCustomConfig}
        onConfirm={(targetRepeat, interval, customLabel, customUnit, customConfig) => {
          onSelectRepeat(targetRepeat, interval, customLabel, customUnit, customConfig);
          setShowCustomModal(false);
          handleClose();
        }}
        onClose={() => setShowCustomModal(false)}
      />
    </>
  );
}

function OptionIcon({ opt, color }: { opt: TaskRepeat; color: string }) {
  switch (opt) {
    case 'none':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M18.364 5.636A9 9 0 105.636 18.364 9 9 0 0018.364 5.636zM4.93 4.93l14.14 14.14"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'daily':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 3v2m0 14v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M3 12h2m14 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41M12 7a5 5 0 100 10 5 5 0 000-10z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'weekdays':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'weekends':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'weekly':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="4" width="18" height="17" rx="3" stroke={color} strokeWidth="2" />
          <Path d="M3 9h18M8 2v4M16 2v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Path d="M7 14h2M11 14h2M15 14h2" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'monthly':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
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
    case 'yearly':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
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
    case 'custom':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    default:
      return null;
  }
}

function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CloseXIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
    zIndex: 1000,
    elevation: 1000,
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  dragPill: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.checkboxBorder,
    marginBottom: 10,
  },
  header: {
    width: '100%',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    width: '100%',
    gap: 6,
  },
  optionItem: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  optionLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionItemActive: {
    backgroundColor: '#01B7FF12',
    borderColor: '#01B7FF',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#23262D',
  },
  optionTextActive: {
    color: '#01B7FF',
    fontWeight: '700',
  },
  checkmarkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
