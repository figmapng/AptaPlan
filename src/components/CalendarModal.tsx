import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { getNextWeekKey, getTodayKey, getTomorrowKey } from '@/utils/dateHelpers';
import { AnimatedPressable } from './AnimatedPressable';

// Configure Kazakh locale for react-native-calendars
LocaleConfig.locales['kz'] = {
  monthNames: ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым', 'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан'],
  monthNamesShort: ['Қаң', 'Ақп', 'Нау', 'Сәу', 'Мам', 'Мау', 'Шіл', 'Там', 'Қыр', 'Қаз', 'Қар', 'Жел'],
  dayNames: ['Жексенбі', 'Дүйсенбі', 'Сейсенбі', 'Сәрсенбі', 'Бейсенбі', 'Жұма', 'Сенбі'],
  dayNamesShort: ['Жек', 'Дүй', 'Сей', 'Сәр', 'Бей', 'Жұм', 'Сен'],
  today: 'Бүгін',
};
LocaleConfig.defaultLocale = 'kz';

interface CalendarModalProps {
  visible: boolean;
  selectedDate: string | null;
  onSelectDate: (dateKey: string) => void;
  onRemoveDate?: () => void;
  onClose: () => void;
}

export function CalendarModal({ visible, selectedDate, onSelectDate, onRemoveDate, onClose }: CalendarModalProps) {
  const translateY = useRef(new Animated.Value(380)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.spring(translateY, { toValue: 0, friction: 8, tension: 90, useNativeDriver: false }),
      ]).start();
    } else {
      translateY.setValue(380);
      backdropOpacity.setValue(0);
    }
  }, [visible, translateY, backdropOpacity]);

  if (!visible) return null;

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 160, useNativeDriver: false }),
      Animated.timing(translateY, { toValue: 380, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: false }),
    ]).start(() => onClose());
  };

  const handleQuickSelect = (key: string) => {
    onSelectDate(key);
    handleClose();
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.dragPill} />
        <Text style={styles.title}>Күнді таңдау</Text>

        <View style={styles.quickRow}>
          <AnimatedPressable activeScale={0.92} style={styles.quickBtn} onPress={() => handleQuickSelect(getTodayKey())}>
            <Text style={styles.quickText}>Бүгін</Text>
          </AnimatedPressable>
          <AnimatedPressable activeScale={0.92} style={styles.quickBtn} onPress={() => handleQuickSelect(getTomorrowKey())}>
            <Text style={styles.quickText}>Ертең</Text>
          </AnimatedPressable>
          <AnimatedPressable activeScale={0.92} style={styles.quickBtn} onPress={() => handleQuickSelect(getNextWeekKey())}>
            <Text style={styles.quickText}>Келесі апта</Text>
          </AnimatedPressable>
        </View>

        <Calendar
          current={selectedDate || getTodayKey()}
          markedDates={
            selectedDate
              ? {
                  [selectedDate]: { selected: true, selectedColor: '#7ED321' },
                }
              : {}
          }
          onDayPress={(day) => {
            onSelectDate(day.dateString);
            handleClose();
          }}
          theme={{
            selectedDayBackgroundColor: '#7ED321',
            todayTextColor: '#7ED321',
            arrowColor: '#23262D',
            textDayFontWeight: '500',
            textMonthFontWeight: '700',
            textDayHeaderFontWeight: '600',
          }}
          style={styles.calendar}
        />

        {onRemoveDate && (
          <AnimatedPressable activeScale={0.94} style={styles.removeBtn} onPress={() => { onRemoveDate(); handleClose(); }}>
            <Text style={styles.removeText}>Күнді өшіру</Text>
          </AnimatedPressable>
        )}
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
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F5F5F7',
  },
  quickText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#23262D',
  },
  calendar: {
    width: '100%',
    borderRadius: 16,
  },
  removeBtn: {
    marginTop: 16,
    paddingVertical: 10,
  },
  removeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF4B3E',
  },
});
