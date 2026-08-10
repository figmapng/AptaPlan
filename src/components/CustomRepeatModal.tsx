import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { TaskRepeat } from '@/types/task';
import { AnimatedPressable } from './AnimatedPressable';

export type CustomUnit = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';

interface CustomRepeatModalProps {
  visible: boolean;
  currentRepeat?: TaskRepeat | null;
  currentInterval?: number;
  currentCustomUnit?: CustomUnit | null;
  onConfirm: (repeatType: TaskRepeat, interval: number, customLabel?: string, customUnit?: CustomUnit) => void;
  onClose: () => void;
}
type MonthlyMode = 'dates' | 'dayOfWeek';

const unitLabels: Record<CustomUnit, string> = {
  hourly: 'Сағат сайын',
  daily: 'Күн сайын',
  weekly: 'Апта сайын',
  monthly: 'Ай сайын',
  yearly: 'Жыл сайын',
};

const kzWeekdaysFull = [
  'Жексенбі',
  'Дүйсенбі',
  'Сейсенбі',
  'Сәрсенбі',
  'Бейсенбі',
  'Жұма',
  'Сенбі',
];

const kzMonthsShort = [
  'қаңт.',
  'ақп.',
  'наур.',
  'сәу.',
  'мам.',
  'маус.',
  'шіл.',
  'там.',
  'қырк.',
  'қаз.',
  'қар.',
  'желт.',
];

const kzMonthsFull = [
  'қаңтар',
  'ақпан',
  'наурыз',
  'сәуір',
  'мамыр',
  'маусым',
  'шілде',
  'тамыз',
  'қыркүйек',
  'қазан',
  'қараша',
  'желтоқсан',
];

const weekPositions = ['бірінші', 'екінші', 'үшінші', 'төртінші', 'соңғы'];

export function CustomRepeatModal({
  visible,
  currentRepeat,
  currentInterval = 1,
  currentCustomUnit,
  onConfirm,
  onClose,
}: CustomRepeatModalProps) {
  const translateY = useRef(new Animated.Value(420)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [unit, setUnit] = useState<CustomUnit>(() => {
    if (currentCustomUnit) return currentCustomUnit;
    if (currentRepeat === 'monthly') return 'monthly';
    if (currentRepeat === 'yearly') return 'yearly';
    if (currentRepeat === 'daily') return 'daily';
    if (currentRepeat === 'hourly') return 'hourly';
    return 'weekly';
  });
  const [interval, setIntervalVal] = useState<number>(() => Math.max(1, currentInterval));
  const [showUnitMenu, setShowUnitMenu] = useState(false);

  // Weekly state: selected weekdays (index 0..6)
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1]); // default Mon

  // Monthly state: mode ('dates' | 'dayOfWeek'), selected date numbers (1..31)
  const [monthlyMode, setMonthlyMode] = useState<MonthlyMode>('dates');
  const [selectedMonthDate, setSelectedMonthDate] = useState<number>(1);
  const [selectedPosIdx, setSelectedPosIdx] = useState<number>(0); // 0=бірінші
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(1); // 1=Дүйсенбі

  // Yearly state: selected month (0..11), enableWeekdays toggle
  const [selectedYearlyMonth, setSelectedYearlyMonth] = useState<number>(7); // Aug default
  const [yearlyEnableWeekdays, setYearlyEnableWeekdays] = useState(false);

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
      if (currentCustomUnit) setUnit(currentCustomUnit);
      else if (currentRepeat === 'monthly') setUnit('monthly');
      else if (currentRepeat === 'yearly') setUnit('yearly');
      else if (currentRepeat === 'daily') setUnit('daily');
      else if (currentRepeat === 'hourly') setUnit('hourly');
      else setUnit('weekly');

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
  }, [visible, currentRepeat, currentInterval, currentCustomUnit, translateY, backdropOpacity]);

  if (!visible) return null;

  const handleIncrement = () => {
    triggerHaptic();
    setIntervalVal((prev) => Math.min(prev + 1, 99));
  };

  const handleDecrement = () => {
    triggerHaptic();
    setIntervalVal((prev) => Math.max(prev - 1, 1));
  };

  const getShortCustomLabel = (): string => {
    if (unit === 'hourly') {
      return interval === 1 ? 'Сағат сайын' : `Әр ${interval} сағатта`;
    }

    if (unit === 'daily') {
      return interval === 1 ? 'Күн сайын' : `Әр ${interval} күнде`;
    }

    if (unit === 'weekly') {
      const shortDays = ['Жс', 'Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб'];
      const sorted = [...selectedWeekdays].sort((a, b) => a - b);
      const daysText = sorted.map((i) => shortDays[i]).join(', ');
      const isAllDays = sorted.length === 7;
      if (interval === 1) {
        return isAllDays ? 'Апта сайын' : `Апта сайын (${daysText})`;
      }
      return isAllDays ? `Әр ${interval} аптада` : `Әр ${interval} аптада (${daysText})`;
    }

    if (unit === 'monthly') {
      if (monthlyMode === 'dates') {
        return interval === 1
          ? `Ай сайын (${selectedMonthDate}-күні)`
          : `Әр ${interval} айда (${selectedMonthDate}-күні)`;
      }
      const posShort = ['1-ші', '2-ші', '3-ші', '4-ші', 'соңғы'][selectedPosIdx];
      const dayText = kzWeekdaysFull[selectedDayIdx].toLowerCase();
      return interval === 1
        ? `Ай сайын (${posShort} ${dayText})`
        : `Әр ${interval} айда (${posShort} ${dayText})`;
    }

    // yearly
    const mShort = kzMonthsShort[selectedYearlyMonth];
    if (yearlyEnableWeekdays) {
      const posShort = ['1-ші', '2-ші', '3-ші', '4-ші', 'соңғы'][selectedPosIdx];
      const dayText = kzWeekdaysFull[selectedDayIdx].toLowerCase();
      return interval === 1
        ? `Жыл сайын (${posShort} ${dayText}, ${mShort})`
        : `Әр ${interval} жылда (${posShort} ${dayText}, ${mShort})`;
    }
    return interval === 1 ? `Жыл сайын (${mShort})` : `Әр ${interval} жылда (${mShort})`;
  };

  const handleConfirm = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm('custom', interval, getShortCustomLabel());
    handleClose();
  };

  const toggleWeekday = (idx: number) => {
    triggerHaptic();
    setSelectedWeekdays((prev) => {
      if (prev.includes(idx)) {
        if (prev.length === 1) return prev; // keep at least one
        return prev.filter((i) => i !== idx);
      }
      return [...prev, idx];
    });
  };

  // Human readable Kazakh summary sentence
  const getSummarySentence = () => {
    if (unit === 'hourly') {
      return interval === 1
        ? 'Тапсырма сағат сайын қайталанып отырады.'
        : `Тапсырма әр ${interval} сағат сайын қайталанып отырады.`;
    }

    if (unit === 'daily') {
      return interval === 1
        ? 'Тапсырма күн сайын қайталанып отырады.'
        : `Тапсырма әр ${interval} күн сайын қайталанып отырады.`;
    }

    if (unit === 'weekly') {
      const selectedNames = selectedWeekdays
        .sort((a, b) => a - b)
        .map((i) => kzWeekdaysFull[i].toLowerCase())
        .join(', ');
      return interval === 1
        ? `Тапсырма апта сайын, келесі күндері қайталанады: ${selectedNames}.`
        : `Тапсырма әр ${interval} апта сайын, келесі күндері қайталанады: ${selectedNames}.`;
    }

    if (unit === 'monthly') {
      if (monthlyMode === 'dates') {
        return interval === 1
          ? `Тапсырма ай сайын ${selectedMonthDate}-күні қайталанып отырады.`
          : `Тапсырма әр ${interval} ай сайын ${selectedMonthDate}-күні қайталанып отырады.`;
      }
      const posText = weekPositions[selectedPosIdx];
      const dayText = kzWeekdaysFull[selectedDayIdx].toLowerCase();
      return interval === 1
        ? `Тапсырма ай сайын (${posText} ${dayText}) қайталанып отырады.`
        : `Тапсырма әр ${interval} ай сайын (${posText} ${dayText}) қайталанып отырады.`;
    }

    // yearly
    const monthNameFull = kzMonthsFull[selectedYearlyMonth];
    if (yearlyEnableWeekdays) {
      const posText = weekPositions[selectedPosIdx];
      const dayText = kzWeekdaysFull[selectedDayIdx].toLowerCase();
      return interval === 1
        ? `Тапсырма жыл сайын (${posText} ${dayText}) таңдалған айда қайталанады: ${monthNameFull}.`
        : `Тапсырма әр ${interval} жыл сайын (${posText} ${dayText}) таңдалған айда қайталанады: ${monthNameFull}.`;
    }
    return interval === 1
      ? `Тапсырма жыл сайын таңдалған айда қайталанады: ${monthNameFull}.`
      : `Тапсырма әр ${interval} жыл сайын таңдалған айда қайталанады: ${monthNameFull}.`;
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.dragPill} />

        {/* Header with Back Button, Title, and Blue Circular Checkmark Button */}
        <View style={styles.header}>
          <AnimatedPressable
            activeScale={0.88}
            style={styles.backBtn}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Артқа қайту"
          >
            <BackChevronIcon color="#01B7FF" />
            <Text style={styles.backBtnText}>Артқа</Text>
          </AnimatedPressable>

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

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={{ width: '100%' }}
        >
          {/* Card 1: Frequency & Every Stepper */}
          <View style={styles.groupedCard}>
            {/* Frequency Dropdown Row */}
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
                <SelectorChevronIcon color="#01B7FF" />
              </View>
            </Pressable>

            <View style={styles.divider} />

            {/* Every Stepper Row */}
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

          {/* Card 2 (Conditional per unit) */}

          {/* WEEKLY: Weekdays Picker List */}
          {unit === 'weekly' && (
            <View style={[styles.groupedCard, { marginTop: 16 }]}>
              {kzWeekdaysFull.map((dayName, idx) => {
                const isSelected = selectedWeekdays.includes(idx);
                return (
                  <View key={dayName}>
                    {idx > 0 && <View style={styles.divider} />}
                    <Pressable style={styles.formRow} onPress={() => toggleWeekday(idx)}>
                      <Text style={styles.rowLabel}>{dayName}</Text>
                      {isSelected && <CheckIcon color="#01B7FF" />}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}

          {/* MONTHLY: Dates Grid or Day of Week Mode */}
          {unit === 'monthly' && (
            <View style={[styles.groupedCard, { marginTop: 16 }]}>
              <Pressable style={styles.formRow} onPress={() => { triggerHaptic(); setMonthlyMode('dates'); }}>
                <Text style={styles.rowLabel}>Даталарды таңдау</Text>
                {monthlyMode === 'dates' && <CheckIcon color="#01B7FF" />}
              </Pressable>

              <View style={styles.divider} />

              <Pressable style={styles.formRow} onPress={() => { triggerHaptic(); setMonthlyMode('dayOfWeek'); }}>
                <Text style={styles.rowLabel}>Апта күнін таңдау</Text>
                {monthlyMode === 'dayOfWeek' && <CheckIcon color="#01B7FF" />}
              </Pressable>

              {monthlyMode === 'dates' && (
                <View style={styles.daysGridContainer}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                    const isSelected = selectedMonthDate === d;
                    return (
                      <Pressable
                        key={d}
                        style={[styles.dayGridCell, isSelected && styles.dayGridCellSelected]}
                        onPress={() => {
                          triggerHaptic();
                          setSelectedMonthDate(d);
                        }}
                      >
                        <Text style={[styles.dayGridText, isSelected && styles.dayGridTextSelected]}>
                          {d}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {monthlyMode === 'dayOfWeek' && (
                <View style={styles.pickerWheelBox}>
                  <WheelPickerColumn
                    data={weekPositions}
                    selectedIndex={selectedPosIdx}
                    onSelect={(idx) => setSelectedPosIdx(idx)}
                    getLabel={(item) => item}
                  />
                  <WheelPickerColumn
                    data={kzWeekdaysFull}
                    selectedIndex={selectedDayIdx}
                    onSelect={(idx) => setSelectedDayIdx(idx)}
                    getLabel={(item) => item.toLowerCase()}
                  />
                </View>
              )}
            </View>
          )}

          {/* YEARLY: 12-Month Grid + Weekdays Switch & Picker Wheel */}
          {unit === 'yearly' && (
            <>
              <View style={[styles.groupedCard, { marginTop: 16 }]}>
                <View style={styles.monthsGridContainer}>
                  {kzMonthsShort.map((mShort, mIdx) => {
                    const isSelected = selectedYearlyMonth === mIdx;
                    return (
                      <Pressable
                        key={mShort}
                        style={[styles.monthGridCell, isSelected && styles.monthGridCellSelected]}
                        onPress={() => {
                          triggerHaptic();
                          setSelectedYearlyMonth(mIdx);
                        }}
                      >
                        <Text style={[styles.monthGridText, isSelected && styles.monthGridTextSelected]}>
                          {mShort}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={[styles.groupedCard, { marginTop: 14 }]}>
                <View style={styles.formRow}>
                  <Text style={styles.rowLabel}>Апта күндері</Text>
                  <View style={styles.switchWrapper}>
                    <Switch
                      value={yearlyEnableWeekdays}
                      onValueChange={(v) => {
                        triggerHaptic();
                        setYearlyEnableWeekdays(v);
                      }}
                      trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                      ios_backgroundColor="#E5E5EA"
                      style={{ transform: [{ scaleX: 0.88 }, { scaleY: 0.88 }] }}
                    />
                  </View>
                </View>

                {yearlyEnableWeekdays && (
                  <View style={styles.pickerWheelBox}>
                    <WheelPickerColumn
                      data={weekPositions}
                      selectedIndex={selectedPosIdx}
                      onSelect={(idx) => setSelectedPosIdx(idx)}
                      getLabel={(item) => item}
                    />
                    <WheelPickerColumn
                      data={kzWeekdaysFull}
                      selectedIndex={selectedDayIdx}
                      onSelect={(idx) => setSelectedDayIdx(idx)}
                      getLabel={(item) => item.toLowerCase()}
                    />
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>

        {/* iOS Popover Dropdown Menu */}
        {showUnitMenu && (
          <Pressable style={styles.popoverOverlay} onPress={() => setShowUnitMenu(false)}>
            <View style={styles.popoverMenu}>
              <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                {(['hourly', 'daily', 'weekly', 'monthly', 'yearly'] as CustomUnit[]).map((u) => {
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
              </ScrollView>
            </View>
          </Pressable>
        )}
      </Animated.View>
    </Animated.View>
  );
}

// Icons
function BackChevronIcon({ color = '#01B7FF' }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

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

function SelectorChevronIcon({ color = '#01B7FF' }: { color?: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
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
    paddingBottom: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
    minHeight: 380,
    maxHeight: '88%',
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
    marginBottom: 14,
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingRight: 8,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#01B7FF',
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
  scrollContent: {
    paddingBottom: 20,
  },
  groupedCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  formRow: {
    width: '100%',
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  switchWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 4,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
    backgroundColor: 'transparent',
  },
  selectorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#01B7FF',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginLeft: 16,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 3,
    borderRadius: 12,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  stepBtnDisabled: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  numBox: {
    minWidth: 40,
    height: 32,
    paddingHorizontal: 8,
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
    marginTop: 6,
  },
  daysGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  dayGridCell: {
    width: `${100 / 7}%`,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayGridCellSelected: {
    backgroundColor: '#01B7FF',
    borderRadius: 4,
  },
  dayGridText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  dayGridTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  monthsGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthGridCell: {
    width: '25%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  monthGridCellSelected: {
    backgroundColor: '#01B7FF',
  },
  monthGridText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  monthGridTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pickerWheelBox: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
  },
  pickerWheelRow: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  pickerWheelRowActive: {
    backgroundColor: '#F2F2F7',
  },
  pickerWheelText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  pickerWheelTextActive: {
    color: '#01B7FF',
    fontWeight: '700',
  },
  popoverOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  popoverMenu: {
    position: 'absolute',
    top: 92,
    right: 20,
    width: 190,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 20,
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
  wheelColumnContainer: {
    flex: 1,
    height: 114,
    overflow: 'hidden',
    position: 'relative',
  },
  wheelCenterHighlight: {
    position: 'absolute',
    top: 38,
    left: 4,
    right: 4,
    height: 38,
    backgroundColor: '#E5E5EA80',
    borderRadius: 8,
    zIndex: 0,
  },
  wheelItemRow: {
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#8E8E93',
    opacity: 0.6,
  },
  wheelItemTextSelected: {
    fontSize: 16,
    fontWeight: '700',
    color: '#01B7FF',
    opacity: 1,
  },
});

interface WheelPickerColumnProps<T> {
  data: T[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  getLabel: (item: T) => string;
}

const WHEEL_ITEM_HEIGHT = 38;

function WheelPickerColumn<T>({
  data,
  selectedIndex,
  onSelect,
  getLabel,
}: WheelPickerColumnProps<T>) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: selectedIndex * WHEEL_ITEM_HEIGHT, animated: false });
  }, [selectedIndex]);

  return (
    <View style={styles.wheelColumnContainer}>
      <View pointerEvents="none" style={styles.wheelCenterHighlight} />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: WHEEL_ITEM_HEIGHT }}
        nestedScrollEnabled
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT);
          const clamped = Math.max(0, Math.min(idx, data.length - 1));
          if (clamped !== selectedIndex) {
            void Haptics.selectionAsync();
            onSelect(clamped);
          }
        }}
      >
        {data.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <Pressable
              key={`${getLabel(item)}-${idx}`}
              style={styles.wheelItemRow}
              onPress={() => {
                void Haptics.selectionAsync();
                onSelect(idx);
                scrollRef.current?.scrollTo({ y: idx * WHEEL_ITEM_HEIGHT, animated: true });
              }}
            >
              <Text style={[styles.wheelItemText, isSelected && styles.wheelItemTextSelected]}>
                {getLabel(item)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
