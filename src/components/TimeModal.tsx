import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
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

const quickTimePresets = ['08:00', '09:00', '10:00', '12:00', '14:00', '15:00', '18:00', '20:00', '21:00'];

export function TimeModal({
  visible,
  selectedTime,
  onSelectTime,
  onRemoveTime,
  onClose,
}: TimeModalProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(420)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [date, setDate] = useState<Date>(() => parseTime(selectedTime));

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
      setDate(parseTime(selectedTime));
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: false }),
        Animated.spring(translateY, { toValue: 0, friction: 8, tension: 85, useNativeDriver: false }),
      ]).start();
    } else {
      translateY.setValue(420);
      backdropOpacity.setValue(0);
    }
  }, [visible, selectedTime, translateY, backdropOpacity]);

  if (!visible) return null;

  const handleConfirm = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    onSelectTime(`${hh}:${mm}`);
    handleClose();
  };

  const handlePresetSelect = (timeStr: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    onSelectTime(timeStr);
    handleClose();
  };

  const currentHHMM = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  return (
    <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY }],
            paddingBottom: Math.max(insets.bottom + 16, 28),
          },
        ]}
      >
        <View style={styles.dragPill} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Уақытты таңдау</Text>
          <AnimatedPressable
            activeScale={0.88}
            style={styles.closeBtn}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Жабу"
          >
            <CloseXIcon color={colors.inputPlusIcon} />
          </AnimatedPressable>
        </View>

        {/* Quick Time Presets (Horizontal Scrollable Strip) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickScrollView}
          contentContainerStyle={styles.quickRowContent}
        >
          {quickTimePresets.map((t) => {
            const isSelected = selectedTime === t || currentHHMM === t;
            const iconColor = isSelected ? '#FFFFFF' : colors.inputPlusIcon;

            return (
              <AnimatedPressable
                key={t}
                activeScale={0.92}
                style={[
                  styles.quickBtn,
                  isSelected && styles.quickBtnActive,
                ]}
                onPress={() => handlePresetSelect(t)}
              >
                <ClockIcon color={iconColor} />
                <Text style={[styles.quickText, isSelected && styles.quickTextActive]}>
                  {t}
                </Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>

        {/* Time Picker Card Container */}
        <View style={styles.pickerCard}>
          <DateTimePicker
            value={date}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            textColor="#1C1C1E"
            onChange={(_, sel) => {
              if (sel) setDate(sel);
            }}
            style={styles.picker}
          />
        </View>

        {/* Action Button Row */}
        <View style={styles.btnRow}>
          {onRemoveTime && (
            <AnimatedPressable
              activeScale={0.94}
              style={[styles.removeBtn, !selectedTime && styles.removeBtnDisabled]}
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                onRemoveTime();
                handleClose();
              }}
            >
              <TrashIcon color={selectedTime ? '#FF4B3E' : '#A0A5B1'} />
              <Text style={[styles.removeText, !selectedTime && styles.removeTextDisabled]}>
                Уақытты өшіру
              </Text>
            </AnimatedPressable>
          )}

          <AnimatedPressable
            activeScale={0.94}
            style={[styles.confirmBtn, !onRemoveTime && styles.confirmBtnFull]}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmText}>Сақтау</Text>
          </AnimatedPressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// Icons
function ClockIcon({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2.2" />
      <Path d="M12 7v5l3 3" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TrashIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickScrollView: {
    width: '100%',
    marginBottom: 14,
  },
  quickRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
  },
  quickBtn: {
    height: 38,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  quickBtnActive: {
    backgroundColor: colors.today,
    borderColor: colors.today,
  },
  quickText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  quickTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pickerCard: {
    width: '100%',
    backgroundColor: colors.inputBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingVertical: 6,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    height: 180,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  removeBtn: {
    flex: 1,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 20,
    backgroundColor: '#FFF1F0',
    borderWidth: 1,
    borderColor: '#FFE0DE',
  },
  removeBtnDisabled: {
    backgroundColor: colors.inputBg,
    borderColor: colors.inputBorder,
  },
  removeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF4B3E',
  },
  removeTextDisabled: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#01B7FF',
    borderWidth: 1,
    borderColor: '#01B7FF',
  },
  confirmBtnFull: {
    flex: 1,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
