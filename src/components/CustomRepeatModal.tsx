import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { AnimatedPressable } from './AnimatedPressable';

interface CustomRepeatModalProps {
  visible: boolean;
  currentInterval: number;
  onConfirm: (interval: number) => void;
  onClose: () => void;
}

const presetIntervals = [2, 3, 5, 7, 10, 14, 30];

export function CustomRepeatModal({
  visible,
  currentInterval,
  onConfirm,
  onClose,
}: CustomRepeatModalProps) {
  const translateY = useRef(new Animated.Value(420)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [interval, setIntervalVal] = useState<number>(currentInterval || 2);

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
      setIntervalVal(currentInterval && currentInterval > 1 ? currentInterval : 2);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: false }),
        Animated.spring(translateY, { toValue: 0, friction: 8, tension: 85, useNativeDriver: false }),
      ]).start();
    } else {
      translateY.setValue(420);
      backdropOpacity.setValue(0);
    }
  }, [visible, currentInterval, translateY, backdropOpacity]);

  if (!visible) return null;

  const handleIncrement = () => {
    triggerHaptic();
    setIntervalVal((prev) => Math.min(prev + 1, 365));
  };

  const handleDecrement = () => {
    triggerHaptic();
    setIntervalVal((prev) => Math.max(prev - 1, 2));
  };

  const handlePresetSelect = (val: number) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setIntervalVal(val);
  };

  const handleApply = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm(interval);
    handleClose();
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.dragPill} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Арнайы қайталау</Text>
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

        {/* Counter Control Box */}
        <View style={styles.counterCard}>
          <Text style={styles.subtitle}>Қайталау жиілігі:</Text>
          <View style={styles.counterRow}>
            <AnimatedPressable
              activeScale={0.88}
              style={[styles.stepBtn, interval <= 2 && styles.stepBtnDisabled]}
              onPress={handleDecrement}
              disabled={interval <= 2}
            >
              <MinusIcon color={interval <= 2 ? '#D1D5DB' : '#01B7FF'} />
            </AnimatedPressable>

            <View style={styles.numBadge}>
              <Text style={styles.numText}>Әр {interval}</Text>
              <Text style={styles.unitText}>күн сайын</Text>
            </View>

            <AnimatedPressable activeScale={0.88} style={styles.stepBtn} onPress={handleIncrement}>
              <PlusIcon color="#01B7FF" />
            </AnimatedPressable>
          </View>
        </View>

        {/* Quick Presets */}
        <Text style={styles.sectionTitle}>Дайын ұсыныстар:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsRow}
        >
          {presetIntervals.map((val) => {
            const isSelected = interval === val;
            return (
              <AnimatedPressable
                key={val}
                activeScale={0.92}
                style={[styles.presetBtn, isSelected && styles.presetBtnActive]}
                onPress={() => handlePresetSelect(val)}
              >
                <Text style={[styles.presetText, isSelected && styles.presetTextActive]}>
                  {val} күнде 1 рет
                </Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>

        {/* Confirm Button */}
        <AnimatedPressable activeScale={0.94} style={styles.applyBtn} onPress={handleApply}>
          <Text style={styles.applyText}>Қолдану</Text>
        </AnimatedPressable>
      </Animated.View>
    </Animated.View>
  );
}

// Icons
function PlusIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    </Svg>
  );
}

function MinusIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
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
    marginBottom: 16,
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
  counterCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAEFF5',
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  stepBtnDisabled: {
    backgroundColor: '#F3F4F6',
    shadowOpacity: 0,
    elevation: 0,
  },
  numBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  numText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#01B7FF',
  },
  unitText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 2,
  },
  sectionTitle: {
    alignSelf: 'flex-start',
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 20,
  },
  presetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  presetBtnActive: {
    backgroundColor: '#01B7FF',
    borderColor: '#01B7FF',
  },
  presetText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  presetTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  applyBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: '#01B7FF',
    shadowColor: '#01B7FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  applyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
