import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AnimatedPressable } from './AnimatedPressable';

interface TimeModalProps {
  visible: boolean;
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
  onRemoveTime?: () => void;
  onClose: () => void;
}

const parseTime = (timeStr: string | null): Date => {
  const d = new Date();
  if (timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d;
};

export function TimeModal({ visible, selectedTime, onSelectTime, onRemoveTime, onClose }: TimeModalProps) {
  const translateY = useRef(new Animated.Value(340)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [date, setDate] = useState<Date>(() => parseTime(selectedTime));

  useEffect(() => {
    if (visible) {
      setDate(parseTime(selectedTime));
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.spring(translateY, { toValue: 0, friction: 8, tension: 90, useNativeDriver: false }),
      ]).start();
    } else {
      translateY.setValue(340);
      backdropOpacity.setValue(0);
    }
  }, [visible, selectedTime, translateY, backdropOpacity]);

  if (!visible) return null;

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 160, useNativeDriver: false }),
      Animated.timing(translateY, { toValue: 340, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: false }),
    ]).start(() => onClose());
  };

  const handleConfirm = () => {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    onSelectTime(`${hh}:${mm}`);
    handleClose();
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.dragPill} />
        <Text style={styles.title}>Уақытты таңдау</Text>

        <DateTimePicker
          value={date}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          textColor="#23262D"
          onChange={(_, sel) => {
            if (sel) setDate(sel);
          }}
          style={styles.picker}
        />

        <View style={styles.btnRow}>
          {onRemoveTime && (
            <AnimatedPressable activeScale={0.93} style={styles.removeBtn} onPress={() => { onRemoveTime(); handleClose(); }}>
              <Text style={styles.removeText}>Уақытты өшіру</Text>
            </AnimatedPressable>
          )}
          <AnimatedPressable activeScale={0.94} style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmText}>Сақтау</Text>
          </AnimatedPressable>
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
    marginBottom: 12,
  },
  picker: {
    width: '100%',
    height: 180,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
    width: '100%',
    justifyContent: 'center',
  },
  removeBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  removeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF4B3E',
  },
  confirmBtn: {
    backgroundColor: '#7ED321',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 20,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
