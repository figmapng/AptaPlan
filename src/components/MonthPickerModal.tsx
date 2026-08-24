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
import { usePlanner } from '@/store/planner-store';
import { AnimatedPressable } from './AnimatedPressable';
import { YearCycleMonthPicker } from './YearCycleMonthPicker';

interface MonthPickerModalProps {
  visible: boolean;
  currentDate: Date;
  onSelectMonth: (selectedDate: Date) => void;
  onClose: () => void;
  locale?: 'kz' | 'ru' | 'en';
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export function MonthPickerModal({
  visible,
  currentDate,
  onSelectMonth,
  onClose,
  locale,
}: MonthPickerModalProps) {
  const { colors, isDark } = useTheme();
  const { t, language } = useI18n();
  const { settings } = usePlanner();
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
  const pickerStyle = settings.monthPickerStyle || 'circular';

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
              accessibilityLabel={language === 'en' ? 'Previous year' : language === 'ru' ? 'Предыдущий год' : 'Алдыңғы жыл'}
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
              accessibilityLabel={language === 'en' ? 'Next year' : language === 'ru' ? 'Следующий год' : 'Келесі жыл'}
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

          {/* Month Picker View: Circular Racetrack vs Grid */}
          {pickerStyle === 'circular' ? (
            <YearCycleMonthPicker
              year={selectedYear}
              selectedMonth={selectedMonth}
              currentDate={today}
              locale={locale || (language === 'en' ? 'en' : language === 'ru' ? 'ru' : 'kz')}
              onSelectMonth={handleSelectMonth}
              onChangeYear={setSelectedYear}
            />
          ) : (
            <MonthGridMatrix
              year={selectedYear}
              selectedMonth={selectedMonth}
              today={today}
              onSelectMonth={handleSelectMonth}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

function MonthGridMatrix({
  year,
  selectedMonth,
  today,
  onSelectMonth,
}: {
  year: number;
  selectedMonth: number;
  today: Date;
  onSelectMonth: (monthIndex: number) => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const monthNames = t.date.monthsFull;
  const isActualCurrentYear = today.getFullYear() === year;
  const actualCurrentMonthIdx = today.getMonth();

  return (
    <View style={styles.grid}>
      {monthNames.map((name, idx) => {
        const isSelected = idx === selectedMonth;
        const isCurrentMonth = isActualCurrentYear && idx === actualCurrentMonthIdx;

        return (
          <AnimatedPressable
            key={`${name}-${idx}`}
            activeScale={0.93}
            style={[
              styles.monthGridCard,
              { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
              isSelected && { backgroundColor: colors.today, borderColor: colors.today },
              isCurrentMonth && !isSelected && { borderColor: colors.today, borderWidth: 1.5 },
            ]}
            onPress={() => onSelectMonth(idx)}
          >
            <Text
              style={[
                styles.monthGridText,
                { color: colors.text },
                isSelected && { color: '#FFFFFF', fontWeight: '700' },
                isCurrentMonth && !isSelected && { color: colors.today, fontWeight: '700' },
              ]}
            >
              {name}
            </Text>
            {isCurrentMonth && (
              <View
                style={[
                  styles.gridTodayDot,
                  { backgroundColor: isSelected ? '#FFFFFF' : colors.today },
                ]}
              />
            )}
          </AnimatedPressable>
        );
      })}
    </View>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 16,
    rowGap: 10,
  },
  monthGridCard: {
    width: '31%',
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  monthGridText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  gridTodayDot: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
