import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { addMonths } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { usePlanner } from '@/store/planner-store';
import { fromDateKey, getNextWeekMondayKey, getThisWeekendKey, getTodayKey, getTomorrowKey, kzMonthsFull, toDateKey } from '@/utils/dateHelpers';
import { AnimatedPressable } from './AnimatedPressable';
import { MonthPickerModal } from './MonthPickerModal';

interface CalendarModalProps {
  visible: boolean;
  selectedDate: string | null;
  onSelectDate: (dateKey: string) => void;
  onRemoveDate?: () => void;
  onClose: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - 40; // 20px horizontal padding on sheet
const ITEM_WIDTH = CARD_WIDTH - 14; // exact internal container width for each month grid

type WeekdayHeaderInfo = { label: string; isWeekend: boolean; dayIndex: number };

function getWeekdayHeaders(firstDayOfWeek: 'mon' | 'sat' | 'sun'): WeekdayHeaderInfo[] {
  if (firstDayOfWeek === 'sun') {
    return [
      { label: 'Жс', isWeekend: true, dayIndex: 0 },
      { label: 'Дс', isWeekend: false, dayIndex: 1 },
      { label: 'Сс', isWeekend: false, dayIndex: 2 },
      { label: 'Ср', isWeekend: false, dayIndex: 3 },
      { label: 'Бс', isWeekend: false, dayIndex: 4 },
      { label: 'Жм', isWeekend: false, dayIndex: 5 },
      { label: 'Сб', isWeekend: true, dayIndex: 6 },
    ];
  }
  if (firstDayOfWeek === 'sat') {
    return [
      { label: 'Сб', isWeekend: true, dayIndex: 6 },
      { label: 'Жс', isWeekend: true, dayIndex: 0 },
      { label: 'Дс', isWeekend: false, dayIndex: 1 },
      { label: 'Сс', isWeekend: false, dayIndex: 2 },
      { label: 'Ср', isWeekend: false, dayIndex: 3 },
      { label: 'Бс', isWeekend: false, dayIndex: 4 },
      { label: 'Жм', isWeekend: false, dayIndex: 5 },
    ];
  }
  // Default 'mon'
  return [
    { label: 'Дс', isWeekend: false, dayIndex: 1 },
    { label: 'Сс', isWeekend: false, dayIndex: 2 },
    { label: 'Ср', isWeekend: false, dayIndex: 3 },
    { label: 'Бс', isWeekend: false, dayIndex: 4 },
    { label: 'Жм', isWeekend: false, dayIndex: 5 },
    { label: 'Сб', isWeekend: true, dayIndex: 6 },
    { label: 'Жс', isWeekend: true, dayIndex: 0 },
  ];
}

export function CalendarModal({
  visible,
  selectedDate,
  onSelectDate,
  onRemoveDate,
  onClose,
}: CalendarModalProps) {
  const planner = usePlanner();
  const firstDayOfWeek = (planner?.settings?.firstDayOfWeek as 'mon' | 'sat' | 'sun') || 'mon';
  const weekdayHeaders = getWeekdayHeaders(firstDayOfWeek);
  const translateY = useRef(new Animated.Value(420)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [tempSelectedDate, setTempSelectedDate] = useState<string | null>(selectedDate);
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => {
    return selectedDate ? fromDateKey(selectedDate) : new Date();
  });
  const [showMonthPicker, setShowMonthPicker] = useState(false);

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

  // Sheet PanResponder for vertical swipe down to dismiss sheet (Must be declared before any conditional return)
  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          gestureState.dy > 25 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.4
        );
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 70 || gestureState.vy > 0.6) {
          handleClose();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      setTempSelectedDate(selectedDate);
      const initialDate = selectedDate ? fromDateKey(selectedDate) : new Date();
      setCurrentMonthDate(initialDate);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: false }),
        Animated.spring(translateY, { toValue: 0, friction: 8, tension: 85, useNativeDriver: false }),
      ]).start();
    } else {
      translateY.setValue(420);
      backdropOpacity.setValue(0);
      setShowMonthPicker(false);
    }
  }, [visible, selectedDate, translateY, backdropOpacity]);

  // Synchronously reset scroll position to index 1 BEFORE screen paint to prevent flickering
  useLayoutEffect(() => {
    scrollViewRef.current?.scrollTo({ x: ITEM_WIDTH, animated: false });
  }, [currentMonthDate]);

  if (!visible) return null;

  const handleQuickSelect = (key: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setTempSelectedDate(key);
    const d = fromDateKey(key);
    setCurrentMonthDate(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  const handleSelectDay = (dateStr: string) => {
    triggerHaptic();
    setTempSelectedDate(dateStr);
  };

  const handleConfirm = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    if (tempSelectedDate) {
      onSelectDate(tempSelectedDate);
    }
    handleClose();
  };

  const handlePrevMonth = () => {
    triggerHaptic();
    scrollViewRef.current?.scrollTo({ x: 0, animated: true });
  };

  const handleNextMonth = () => {
    triggerHaptic();
    scrollViewRef.current?.scrollTo({ x: ITEM_WIDTH * 2, animated: true });
  };

  const todayKey = getTodayKey();
  const tomorrowKey = getTomorrowKey();
  const weekendKey = getThisWeekendKey();
  const nextWeekKey = getNextWeekMondayKey();

  // 3-Month Carousel Data: [prevMonth, currMonth, nextMonth]
  const prevMonthDate = addMonths(currentMonthDate, -1);
  const nextMonthDate = addMonths(currentMonthDate, 1);

  const quickOptions = [
    { key: todayKey, label: 'Бүгін', icon: SunIcon, color: '#F59E0B' },
    { key: tomorrowKey, label: 'Ертең', icon: TomorrowIcon, color: '#0284C7' },
    { key: weekendKey, label: 'Демалыс күні', icon: WeekendIcon, color: '#FF5A5F' },
    { key: nextWeekKey, label: 'Келесі апта', icon: NextWeekIcon, color: '#8B5CF6' },
  ];

  // Capitalized Month Title
  const currYear = currentMonthDate.getFullYear();
  const currMonthIdx = currentMonthDate.getMonth();
  const monthName = kzMonthsFull[currMonthIdx];
  const capitalizedMonthTitle = `${monthName[0].toUpperCase()}${monthName.slice(1)} ${currYear}`;

  return (
    <>
      <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
          {...sheetPanResponder.panHandlers}
        >
          <View style={styles.dragPill} />

          {/* Top Sheet Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Күнді таңдау</Text>
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

          {/* Quick Date Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRow}
            style={styles.quickScroll}
          >
            {quickOptions.map((opt) => {
              const isSelected = tempSelectedDate === opt.key;
              const IconComp = opt.icon;
              const iconColor = isSelected ? '#FFFFFF' : opt.color;

              return (
                <AnimatedPressable
                  key={opt.label}
                  activeScale={0.92}
                  style={[
                    styles.quickBtn,
                    isSelected && { backgroundColor: opt.color, borderColor: opt.color },
                  ]}
                  onPress={() => handleQuickSelect(opt.key)}
                >
                  <IconComp color={iconColor} />
                  <Text style={[styles.quickText, isSelected && styles.quickTextActive]}>
                    {opt.label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </ScrollView>

          {/* Calendar Card Container */}
          <View style={styles.calendarCard}>
            {/* 1. FIXED STATIC MONTH HEADER (Clickable to open Month & Year Picker) */}
            <View style={styles.monthHeader}>
              <AnimatedPressable activeScale={0.88} style={styles.arrowBtn} onPress={handlePrevMonth}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path d="M15 18l-6-6 6-6" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </AnimatedPressable>

              <AnimatedPressable
                activeScale={0.93}
                style={styles.monthTitleBtn}
                onPress={() => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                  setShowMonthPicker(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Ай мен жылды таңдау"
              >
                <Text style={styles.monthTitle}>{capitalizedMonthTitle}</Text>
                <ChevronDownIcon color="#1C1C1E" />
              </AnimatedPressable>

              <AnimatedPressable activeScale={0.88} style={styles.arrowBtn} onPress={handleNextMonth}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path d="M9 18l6-6-6-6" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </AnimatedPressable>
            </View>

            {/* 2. FIXED STATIC WEEKDAY TITLES ROW */}
            <View style={styles.weekHeader}>
              {weekdayHeaders.map((w, idx) => (
                <Text
                  key={`${w.label}-${idx}`}
                  style={[
                    styles.weekTitle,
                    w.isWeekend && styles.weekTitleWeekend,
                  ]}
                >
                  {w.label}
                </Text>
              ))}
            </View>

            {/* 3. HORIZONTAL DAYS GRID CAROUSEL */}
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={ITEM_WIDTH}
              snapToAlignment="center"
              contentOffset={{ x: ITEM_WIDTH, y: 0 }}
              scrollEventThrottle={16}
              onMomentumScrollEnd={(e) => {
                const page = Math.round(e.nativeEvent.contentOffset.x / ITEM_WIDTH);
                if (page === 0) {
                  triggerHaptic();
                  setCurrentMonthDate((prev) => addMonths(prev, -1));
                } else if (page === 2) {
                  triggerHaptic();
                  setCurrentMonthDate((prev) => addMonths(prev, 1));
                }
              }}
              style={{ width: ITEM_WIDTH, height: 240 }}
            >
              <View style={{ width: ITEM_WIDTH, height: 240 }}>
                <DaysGridMatrix
                  monthDate={prevMonthDate}
                  selectedDate={tempSelectedDate}
                  todayKey={todayKey}
                  firstDayOfWeek={firstDayOfWeek}
                  onSelectDay={handleSelectDay}
                />
              </View>

              <View style={{ width: ITEM_WIDTH, height: 240 }}>
                <DaysGridMatrix
                  monthDate={currentMonthDate}
                  selectedDate={tempSelectedDate}
                  todayKey={todayKey}
                  firstDayOfWeek={firstDayOfWeek}
                  onSelectDay={handleSelectDay}
                />
              </View>

              <View style={{ width: ITEM_WIDTH, height: 240 }}>
                <DaysGridMatrix
                  monthDate={nextMonthDate}
                  selectedDate={tempSelectedDate}
                  todayKey={todayKey}
                  firstDayOfWeek={firstDayOfWeek}
                  onSelectDay={handleSelectDay}
                />
              </View>
            </ScrollView>
          </View>

          {/* Action Button Row */}
          <View style={styles.btnRow}>
            {onRemoveDate && (
              <AnimatedPressable
                activeScale={0.94}
                style={[styles.removeBtn, !tempSelectedDate && styles.removeBtnDisabled]}
                onPress={() => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                  onRemoveDate();
                  handleClose();
                }}
              >
                <TrashIcon color={tempSelectedDate ? '#FF4B3E' : '#A0A5B1'} />
                <Text style={[styles.removeText, !tempSelectedDate && styles.removeTextDisabled]}>
                  Күнді өшіру
                </Text>
              </AnimatedPressable>
            )}

            <AnimatedPressable
              activeScale={0.94}
              style={[styles.confirmBtn, !onRemoveDate && styles.confirmBtnFull]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmText}>Сақтау</Text>
            </AnimatedPressable>
          </View>
        </Animated.View>
      </Animated.View>

      {/* Month & Year Picker Modal */}
      <MonthPickerModal
        visible={showMonthPicker}
        currentDate={currentMonthDate}
        onSelectMonth={(targetDate) => {
          setCurrentMonthDate(targetDate);
          setShowMonthPicker(false);
        }}
        onClose={() => setShowMonthPicker(false)}
      />
    </>
  );
}

// Pure Days Grid Component (Only renders the 42 day cells matrix)
interface DaysGridMatrixProps {
  monthDate: Date;
  selectedDate: string | null;
  todayKey: string;
  firstDayOfWeek: 'mon' | 'sat' | 'sun';
  onSelectDay: (dateStr: string) => void;
}

function DaysGridMatrix({
  monthDate,
  selectedDate,
  todayKey,
  firstDayOfWeek,
  onSelectDay,
}: DaysGridMatrixProps) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  // Generate days for fixed 6-week matrix (42 cells)
  const firstDay = new Date(year, month, 1);
  const rawDayOfWeek = firstDay.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  let startOffset = 0;
  if (firstDayOfWeek === 'mon') {
    startOffset = (rawDayOfWeek + 6) % 7;
  } else if (firstDayOfWeek === 'sat') {
    startOffset = (rawDayOfWeek + 1) % 7;
  } else {
    startOffset = rawDayOfWeek;
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isWeekend: boolean }[] = [];

  // Trailing days from previous month
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevDate = new Date(year, month - 1, d);
    const dayOfWeek = prevDate.getDay();
    days.push({
      dateStr: toDateKey(prevDate),
      dayNum: d,
      isCurrentMonth: false,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  // Days in current month
  for (let d = 1; d <= daysInMonth; d++) {
    const currDate = new Date(year, month, d);
    const dayOfWeek = currDate.getDay();
    days.push({
      dateStr: toDateKey(currDate),
      dayNum: d,
      isCurrentMonth: true,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  // Leading days for next month to strictly complete 42 cells (6 rows x 7 days)
  let nextDay = 1;
  const totalCells = 42;
  while (days.length < totalCells) {
    const nextDate = new Date(year, month + 1, nextDay);
    const dayOfWeek = nextDate.getDay();
    days.push({
      dateStr: toDateKey(nextDate),
      dayNum: nextDay,
      isCurrentMonth: false,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
    nextDay++;
  }

  return (
    <View style={styles.daysGrid}>
      {days.map((item, idx) => {
        const isSelected = selectedDate === item.dateStr;
        const isToday = todayKey === item.dateStr;

        return (
          <AnimatedPressable
            key={`${item.dateStr}-${idx}`}
            activeScale={0.9}
            style={styles.dayCell}
            onPress={() => onSelectDay(item.dateStr)}
          >
            <View
              style={[
                styles.dayBadge,
                isSelected && styles.dayBadgeSelected,
                isToday && !isSelected && styles.dayBadgeToday,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  item.isWeekend && item.isCurrentMonth && styles.dayTextWeekend,
                  !item.isCurrentMonth && (item.isWeekend ? styles.dayTextOtherMonthWeekend : styles.dayTextOtherMonth),
                  isToday && !isSelected && styles.dayTextToday,
                  isSelected && styles.dayTextSelected,
                ]}
              >
                {item.dayNum}
              </Text>
            </View>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

// Icons
function SunIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth="2.3" />
      <Path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke={color}
        strokeWidth="2.3"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function TomorrowIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 18a5 5 0 00-10 0M12 3v7M9 6l3-3 3 3M2 18h20"
        stroke={color}
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function WeekendIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8h1a3 3 0 010 6h-1M3 8h15v8a4 4 0 01-4 4H7a4 4 0 01-4-4V8zM7 2v3M11 2v3M15 2v3"
        stroke={color}
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function NextWeekIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13 5l7 7-7 7M5 5l7 7-7 7"
        stroke={color}
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

function ChevronDownIcon({ color = '#1C1C1E' }: { color?: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
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
  quickScroll: {
    width: '100%',
    marginBottom: 14,
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  quickBtn: {
    height: 38,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  quickBtnActive: {
    backgroundColor: '#01B7FF',
    borderColor: '#01B7FF',
  },
  quickText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  quickTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  calendarCard: {
    width: '100%',
    backgroundColor: colors.inputBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    padding: 8,
    marginBottom: 14,
    alignItems: 'center',
    overflow: 'hidden',
  },
  monthHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  monthTitleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  arrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  weekTitle: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#707684',
  },
  weekTitleWeekend: {
    color: colors.weekend,
    fontWeight: '700',
  },
  daysGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeSelected: {
    backgroundColor: '#01B7FF',
  },
  dayBadgeToday: {
    backgroundColor: '#01B7FF15',
    borderWidth: 1.5,
    borderColor: '#01B7FF',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#23262D',
  },
  dayTextWeekend: {
    color: colors.weekend,
    fontWeight: '600',
  },
  dayTextOtherMonth: {
    color: '#CBD5E1',
    fontWeight: '400',
  },
  dayTextOtherMonthWeekend: {
    color: '#FFB8B3',
    fontWeight: '400',
  },
  dayTextToday: {
    color: '#01B7FF',
    fontWeight: '700',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
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
