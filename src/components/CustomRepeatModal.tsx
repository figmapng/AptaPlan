import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { TaskRepeat } from '@/types/task';
import { AnimatedPressable } from './AnimatedPressable';

interface CustomRepeatModalProps {
  visible: boolean;
  currentRepeat?: TaskRepeat | null;
  currentInterval?: number;
  onConfirm: (repeatType: TaskRepeat, interval: number) => void;
  onClose: () => void;
}

type CustomUnit = 'daily' | 'weekly' | 'monthly' | 'yearly';

const unitLabels: Record<CustomUnit, string> = {
  daily: 'Күн сайын',
  weekly: 'Апта сайын',
  monthly: 'Ай сайын',
  yearly: 'Жыл сайын',
};

export function CustomRepeatModal({
  visible,
  currentRepeat,
  currentInterval = 1,
  onConfirm,
  onClose,
}: CustomRepeatModalProps) {
  const translateY = useRef(new Animated.Value(420)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [unit, setUnit] = useState<CustomUnit>(() => {
    if (currentRepeat === 'weekly') return 'weekly';
    if (currentRepeat === 'monthly') return 'monthly';
    if (currentRepeat === 'yearly') return 'yearly';
    return 'daily';
  });
  const [interval, setIntervalVal] = useState<number>(() => Math.max(1, currentInterval));
  const [showUnitMenu, setShowUnitMenu] = useState(false);

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
      if (currentRepeat === 'weekly') setUnit('weekly');
      else if (currentRepeat === 'monthly') setUnit('monthly');
      else if (currentRepeat === 'yearly') setUnit('yearly');
      else setUnit('daily');

      setIntervalVal(Math.max(1, currentInterval));
      setShowUnitMenu(false);

      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: false }),
        Animated.spring(translateY, { toValue: 0, friction: 8, tension: 85, useNativeDriver: false }),
      ]).start();
    } else {
      translateY.setValue(420);
      backdropOpacity.setValue(0);
    }
  }, [visible, currentRepeat, currentInterval, translateY, backdropOpacity]);

  if (!visible) return null;

  const handleIncrement = () => {
    triggerHaptic();
    setIntervalVal((prev) => Math.min(prev + 1, 99));
  };

  const handleDecrement = () => {
    triggerHaptic();
    setIntervalVal((prev) => Math.max(prev - 1, 1));
  };

  const handleConfirm = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const targetRepeat: TaskRepeat = unit === 'daily' ? 'custom' : unit;
    onConfirm(targetRepeat, interval);
    handleClose();
  };

  // Human readable Kazakh sentence
  const getSummarySentence = () => {
    if (unit === 'daily') {
      return interval === 1
        ? 'Тапсырма күн сайын қайталанып отырады.'
        : `Тапсырма әр ${interval} күн сайын қайталанып отырады.`;
    }
    if (unit === 'weekly') {
      return interval === 1
        ? 'Тапсырма апта сайын қайталанып отырады.'
        : `Тапсырма әр ${interval} апта сайын қайталанып отырады.`;
    }
    if (unit === 'monthly') {
      return interval === 1
        ? 'Тапсырма ай сайын қайталанып отырады.'
        : `Тапсырма әр ${interval} ай сайын қайталанып отырады.`;
    }
    return interval === 1
      ? 'Тапсырма жыл сайын қайталанып отырады.'
      : `Тапсырма әр ${interval} жыл сайын қайталанып отырады.`;
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.dragPill} />

        {/* Header with Title and Blue Circular Checkmark Button */}
        <View style={styles.header}>
          <Text style={styles.title}>Реттеу</Text>

          <AnimatedPressable
            activeScale={0.88}
            style={styles.checkCircleBtn}
            onPress={handleConfirm}
            accessibilityRole="button"
            accessibilityLabel="Қолдану"
          >
            <CheckMarkIcon color="#FFFFFF" />
          </AnimatedPressable>
        </View>

        {/* iOS Grouped Form Card */}
        <View style={styles.groupedCard}>
          {/* Row 1: Frequency Dropdown */}
          <Pressable
            style={styles.formRow}
            onPress={() => {
              triggerHaptic();
              setShowUnitMenu((prev) => !prev);
            }}
          >
            <Text style={styles.rowLabel}>Жиілігі</Text>
            <View style={styles.selectorBtn}>
              <Text style={styles.selectorText}>{unitLabels[unit]}</Text>
              <SelectorChevronIcon color="#8E8E93" />
            </View>
          </Pressable>

          <View style={styles.divider} />

          {/* Row 2: Every / Interval Counter */}
          <View style={styles.formRow}>
            <Text style={styles.rowLabel}>Әрбір</Text>
            <View style={styles.stepperContainer}>
              <AnimatedPressable
                activeScale={0.85}
                style={[styles.stepBtn, interval <= 1 && styles.stepBtnDisabled]}
                onPress={handleDecrement}
                disabled={interval <= 1}
              >
                <MinusIcon color={interval <= 1 ? '#C7C7CC' : '#01B7FF'} />
              </AnimatedPressable>

              <View style={styles.numBox}>
                <Text style={styles.numText}>{interval}</Text>
              </View>

              <AnimatedPressable activeScale={0.85} style={styles.stepBtn} onPress={handleIncrement}>
                <PlusIcon color="#01B7FF" />
              </AnimatedPressable>
            </View>
          </View>
        </View>

        {/* Footer Summary Sentence */}
        <Text style={styles.summaryText}>{getSummarySentence()}</Text>

        {/* iOS Popover Dropdown Menu */}
        {showUnitMenu && (
          <View style={styles.popoverMenu}>
            {(['daily', 'weekly', 'monthly', 'yearly'] as CustomUnit[]).map((u) => {
              const isSelected = unit === u;
              return (
                <Pressable
                  key={u}
                  style={[styles.menuItem, isSelected && styles.menuItemActive]}
                  onPress={() => {
                    triggerHaptic();
                    setUnit(u);
                    setShowUnitMenu(false);
                  }}
                >
                  <Text style={[styles.menuItemText, isSelected && styles.menuItemTextActive]}>
                    {unitLabels[u]}
                  </Text>
                  {isSelected && <CheckIcon color="#01B7FF" />}
                </Pressable>
              );
            })}
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

// Icons
function CheckMarkIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SelectorChevronIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M7 10l5-5 5 5M7 14l5 5 5-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PlusIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    </Svg>
  );
}

function MinusIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
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
    backgroundColor: '#F2F2F7', // Native iOS grouped sheet background
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
    minHeight: 280,
  },
  dragPill: {
    width: 38,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#C7C7CC',
    marginBottom: 12,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.3,
  },
  checkCircleBtn: {
    position: 'absolute',
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#01B7FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#01B7FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  groupedCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 10,
  },
  formRow: {
    width: '100%',
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  selectorText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8E8E93',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginLeft: 16,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    backgroundColor: '#F8F8FA',
  },
  numBox: {
    minWidth: 36,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  summaryText: {
    width: '100%',
    paddingHorizontal: 4,
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    lineHeight: 18,
  },
  popoverMenu: {
    position: 'absolute',
    top: 110,
    right: 20,
    width: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 2000,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  menuItemActive: {
    backgroundColor: '#F2F2F7',
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
  },
  menuItemTextActive: {
    color: '#01B7FF',
    fontWeight: '600',
  },
});
