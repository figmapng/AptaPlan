import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/use-i18n';
import { AnimatedPressable } from './AnimatedPressable';
import { YearCycleMonthPicker } from './YearCycleMonthPicker';

interface MonthPickerModalProps {
  visible: boolean;
  currentDate: Date;
  onSelectMonth: (selectedDate: Date) => void;
  onClose: () => void;
  locale?: 'kz' | 'ru';
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export function MonthPickerModal({
  visible,
  currentDate,
  onSelectMonth,
  onClose,
  locale = 'kz',
}: MonthPickerModalProps) {
  const { colors, isDark } = useTheme();
  const { t, language } = useI18n();
  const [selectedYear, setSelectedYear] = useState(() => currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => currentDate.getMonth());
  const translateY = useRef(new Animated.Value(480)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  const today = new Date();

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      setSelectedYear(currentDate.getFullYear());
      setSelectedMonth(currentDate.getMonth());
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, friction: 9, tension: 85, useNativeDriver: true }),
      ]).start();
    } else {
      translateY.setValue(480);
      backdropOpacity.setValue(0);
    }
  }, [visible, translateY, backdropOpacity]);

  const handleClose = () => {
    onClose();
  };

  const handleTodayClick = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
    onSelectMonth(now);
    onClose();
  };

  const handlePrevYear = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedYear((y) => y - 1);
  };

  const handleNextYear = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedYear((y) => y + 1);
  };

  const handleSelectMonth = (monthIndex: number) => {
    const targetDate = new Date(selectedYear, monthIndex, 1);
    setSelectedMonth(monthIndex);
    onSelectMonth(targetDate);
    onClose();
  };

  const yearLabel = language === 'en' ? `${selectedYear}` : language === 'ru' ? `${selectedYear} г.` : `${selectedYear} жыл`;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropOpacity, backgroundColor: colors.modalOverlay },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.sheetBg, transform: [{ translateY }] },
          ]}
        >
          <View style={[styles.dragPill, { backgroundColor: colors.dragPill }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{t.date.selectMonth}</Text>
            <AnimatedPressable
              activeScale={0.92}
              style={[styles.todayBadge, { backgroundColor: `${colors.today}18` }]}
              onPress={handleTodayClick}
              accessible
              accessibilityRole="button"
              accessibilityLabel={t.date.today}
            >
              <Text style={[styles.todayText, { color: colors.today }]}>{t.date.today}</Text>
            </AnimatedPressable>
          </View>

          {/* Year Navigator (‹ 2026 ›) */}
          <View style={styles.yearRow}>
            <AnimatedPressable
              activeScale={0.88}
              style={styles.arrowBtn}
              onPress={handlePrevYear}
              accessible
              accessibilityRole="button"
              accessibilityLabel={language === 'ru' ? 'Предыдущий год' : 'Алдыңғы жыл'}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M15 18l-6-6 6-6"
                  stroke={colors.text}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </AnimatedPressable>

            <Text style={[styles.yearText, { color: colors.text }]}>{yearLabel}</Text>

            <AnimatedPressable
              activeScale={0.88}
              style={styles.arrowBtn}
              onPress={handleNextYear}
              accessible
              accessibilityRole="button"
              accessibilityLabel={language === 'ru' ? 'Следующий год' : 'Келесі жыл'}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M9 18l6-6-6-6"
                  stroke={colors.text}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </AnimatedPressable>
          </View>

          {/* Year Cycle Racetrack Picker */}
          <YearCycleMonthPicker
            year={selectedYear}
            selectedMonth={selectedMonth}
            currentDate={today}
            locale={language === 'ru' ? 'ru' : 'kz'}
            onSelectMonth={handleSelectMonth}
            onChangeYear={setSelectedYear}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    backgroundColor: colors.sheetBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 36,
    boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
  },
  dragPill: {
    width: 38,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.dragPill,
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.4,
  },
  todayBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: `${colors.today}14`,
  },
  todayText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.today,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 2,
    marginTop: 4,
    marginBottom: 6,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    fontVariant: ['tabular-nums'],
  },
});
