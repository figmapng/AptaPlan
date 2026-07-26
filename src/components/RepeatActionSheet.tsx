import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import type { TaskRepeat } from '@/types/task';
import { repeatLabels } from './RepeatChip';
import { AnimatedPressable } from './AnimatedPressable';

interface RepeatActionSheetProps {
  visible: boolean;
  selectedRepeat: TaskRepeat | null;
  onSelectRepeat: (repeat: TaskRepeat) => void;
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

export function RepeatActionSheet({ visible, selectedRepeat, onSelectRepeat, onClose }: RepeatActionSheetProps) {
  const translateY = useRef(new Animated.Value(400)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.spring(translateY, { toValue: 0, friction: 8, tension: 90, useNativeDriver: false }),
      ]).start();
    } else {
      translateY.setValue(400);
      backdropOpacity.setValue(0);
    }
  }, [visible, translateY, backdropOpacity]);

  if (!visible) return null;

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 160, useNativeDriver: false }),
      Animated.timing(translateY, { toValue: 400, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: false }),
    ]).start(() => onClose());
  };

  const current = selectedRepeat || 'none';

  return (
    <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.dragPill} />
        <Text style={styles.title}>Қайталау жиілігі</Text>

        <View style={styles.optionsList}>
          {repeatOptions.map((opt) => {
            const isSelected = current === opt;
            return (
              <AnimatedPressable
                key={opt}
                activeScale={0.97}
                style={[styles.optionItem, isSelected && styles.optionItemActive]}
                onPress={() => {
                  onSelectRepeat(opt);
                  handleClose();
                }}
              >
                <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                  {repeatLabels[opt]}
                </Text>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </AnimatedPressable>
            );
          })}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    zIndex: 1000,
    elevation: 1000,
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    alignItems: 'center',
  },
  dragPill: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#D1D5DB',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#23262D',
    marginBottom: 16,
  },
  optionsList: {
    width: '100%',
    gap: 4,
  },
  optionItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F7',
  },
  optionItemActive: {
    backgroundColor: '#EBF7D4',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#23262D',
  },
  optionTextActive: {
    color: '#3B6C10',
  },
  checkmark: {
    fontSize: 16,
    fontWeight: '800',
    color: '#7ED321',
  },
});
