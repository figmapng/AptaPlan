import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { TaskRepeat } from '@/types/task';
import { getShortRepeatLabel, repeatLabels } from './RepeatChip';
import { AnimatedPressable } from './AnimatedPressable';
import { CustomRepeatModal, CustomUnit } from './CustomRepeatModal';

interface RepeatActionSheetProps {
  visible: boolean;
  selectedRepeat: TaskRepeat | null;
  selectedRepeatInterval?: number;
  selectedCustomLabel?: string;
  selectedCustomUnit?: CustomUnit | null;
  onSelectRepeat: (repeat: TaskRepeat, interval?: number, customLabel?: string, customUnit?: CustomUnit) => void;
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
  onSelectRepeat,
  onClose,
}: RepeatActionSheetProps) {
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
      onSelectRepeat(opt, 1, undefined, undefined);
      handleClose();
    }
  };

  return (
    <>
      <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.dragPill} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Қайталау жиілігі</Text>
            <AnimatedPressable
              activeScale={0.88}
              style={styles.closeBtn}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Жабу"
            >
              <CloseXIcon color="#6B7280" />
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

              return (
                <AnimatedPressable
                  key={opt}
                  activeScale={0.97}
                  style={[styles.optionItem, isSelected && styles.optionItemActive]}
                  onPress={() => handleOptionClick(opt)}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                    {labelText}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkmarkBadge}>
                      <CheckIcon color="#01B7FF" />
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
        onConfirm={(targetRepeat, interval, customLabel, customUnit) => {
          onSelectRepeat(targetRepeat, interval, customLabel, customUnit);
          setShowCustomModal(false);
          handleClose();
        }}
        onClose={() => setShowCustomModal(false)}
      />
    </>
  );
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
    backgroundColor: '#FFFFFF',
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
    width: 38,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#D1D5DB',
    marginBottom: 12,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#EAEFF5',
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
