import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { RepeatConfig, RepeatCustomUnit, RepeatMonthlyMode, TaskRepeat } from '@/types/task';
import { colors } from '@/constants/colors';
import { usePlanner } from '@/store/planner-store';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, describeLocalizedCustomRepeat } from '@/i18n/use-i18n';
import { AnimatedPressable } from './AnimatedPressable';

export type CustomUnit = RepeatCustomUnit;
export type MonthlyMode = RepeatMonthlyMode;
export type CustomRepeatConfig = RepeatConfig;

export const getOrderedWeekdayIndices = (firstDay: 'mon' | 'sat' | 'sun' = 'mon'): number[] => {
  if (firstDay === 'sun') return [0, 1, 2, 3, 4, 5, 6];
  if (firstDay === 'sat') return [6, 0, 1, 2, 3, 4, 5];
  return [1, 2, 3, 4, 5, 6, 0]; // default 'mon'
};

interface CustomRepeatModalProps {
  visible: boolean;
  currentRepeat?: TaskRepeat | null;
  currentInterval?: number;
  currentCustomUnit?: CustomUnit | null;
  currentCustomConfig?: CustomRepeatConfig | null;
  onConfirm: (
    repeatType: TaskRepeat,
    interval: number,
    customLabel?: string,
    customUnit?: CustomUnit,
    customConfig?: CustomRepeatConfig
  ) => void;
  onClose: () => void;
}

export function describeCustomRepeat(config: RepeatConfig): string {
  return describeLocalizedCustomRepeat(config, 'kk');
}

export function CustomRepeatModal({
  visible,
  currentRepeat,
  currentInterval = 1,
  currentCustomUnit,
  currentCustomConfig,
  onConfirm,
  onClose,
}: CustomRepeatModalProps) {
  const { colors } = useTheme();
  const { t, language, describeCustomRepeat: getLocalizedDescription } = useI18n();
  const planner = usePlanner();
  const firstDayOfWeek = planner.settings?.firstDayOfWeek || 'mon';
  const orderedWeekdayIndices = getOrderedWeekdayIndices(firstDayOfWeek);

  const translateY = useRef(new Animated.Value(420)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const unitLabels: Record<CustomUnit, string> = {
    hourly: t.repeat.hourly,
    daily: t.repeat.daily,
    weekly: t.repeat.weekly,
    monthly: t.repeat.monthly,
    yearly: t.repeat.yearly,
  };

  const weekdaysFull = t.date.weekdays;
  const monthsShort = t.date.monthsShort;
  const monthsFull = t.date.monthsFull;
  const weekPositions = t.date.weekPositions;

  const [unit, setUnit] = useState<CustomUnit>(() => {
    if (currentCustomConfig) return currentCustomConfig.unit;
    if (currentCustomUnit) return currentCustomUnit;
    if (currentRepeat === 'hourly') return 'daily';
    if (currentRepeat === 'daily') return 'daily';
    if (currentRepeat === 'weekly') return 'weekly';
    if (currentRepeat === 'monthly') return 'monthly';
    if (currentRepeat === 'yearly') return 'yearly';
    return 'daily';
  });
  const [interval, setIntervalVal] = useState<number>(() => Math.max(1, currentInterval));
  const [showUnitMenu, setShowUnitMenu] = useState(false);

  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1]);

  const [monthlyMode, setMonthlyMode] = useState<MonthlyMode>('dates');
  const [selectedMonthDate, setSelectedMonthDate] = useState<number>(1);
  const [selectedPosIdx, setSelectedPosIdx] = useState<number>(0);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(1);

  const [selectedYearlyMonth, setSelectedYearlyMonth] = useState<number>(7);
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
      if (currentCustomConfig) {
        setUnit(currentCustomConfig.unit);
        setIntervalVal(currentCustomConfig.interval);
        if (currentCustomConfig.selectedWeekdays) {
          setSelectedWeekdays(currentCustomConfig.selectedWeekdays);
        }
        if (currentCustomConfig.monthlyMode) {
          setMonthlyMode(currentCustomConfig.monthlyMode);
        }
        if (currentCustomConfig.selectedMonthDate !== undefined) {
          setSelectedMonthDate(currentCustomConfig.selectedMonthDate);
        }
        if (currentCustomConfig.selectedPosIdx !== undefined) {
          setSelectedPosIdx(currentCustomConfig.selectedPosIdx);
        }
        if (currentCustomConfig.selectedDayIdx !== undefined) {
          setSelectedDayIdx(currentCustomConfig.selectedDayIdx);
        }
        if (currentCustomConfig.selectedYearlyMonth !== undefined) {
          setSelectedYearlyMonth(currentCustomConfig.selectedYearlyMonth);
        }
        if (currentCustomConfig.yearlyEnableWeekdays !== undefined) {
          setYearlyEnableWeekdays(currentCustomConfig.yearlyEnableWeekdays);
        }
      } else {
        if (currentCustomUnit) setUnit(currentCustomUnit);
        else if (currentRepeat === 'hourly') setUnit('hourly');
        else if (currentRepeat === 'daily') setUnit('daily');
        else if (currentRepeat === 'weekly') setUnit('weekly');
        else if (currentRepeat === 'monthly') setUnit('monthly');
        else if (currentRepeat === 'yearly') setUnit('yearly');
        else setUnit('hourly');

        setIntervalVal(Math.max(1, currentInterval));
      }

      setShowUnitMenu(false);

      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: false }),
        Animated.spring(translateY, { toValue: 0, friction: 8, tension: 85, useNativeDriver: false }),
      ]).start();
    } else {
      translateY.setValue(420);
      backdropOpacity.setValue(0);
    }
  }, [visible, currentRepeat, currentInterval, currentCustomUnit, currentCustomConfig, translateY, backdropOpacity]);

  if (!visible) return null;

  const handleIncrement = () => {
    triggerHaptic();
    setIntervalVal((prev) => Math.min(prev + 1, 99));
  };

  const handleDecrement = () => {
    triggerHaptic();
    setIntervalVal((prev) => Math.max(prev - 1, 1));
  };

  const getShortCustomLabel = (): string =>
    getLocalizedDescription({
      unit,
      interval,
      selectedWeekdays,
      monthlyMode,
      selectedMonthDate,
      selectedPosIdx,
      selectedDayIdx,
      selectedYearlyMonth,
      yearlyEnableWeekdays,
    });

  const handleConfirm = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const config: CustomRepeatConfig = {
      unit,
      interval,
      selectedWeekdays,
      monthlyMode,
      selectedMonthDate,
      selectedPosIdx,
      selectedDayIdx,
      selectedYearlyMonth,
      yearlyEnableWeekdays,
    };
    onConfirm('custom', interval, getShortCustomLabel(), unit, config);
    handleClose();
  };

  const toggleWeekday = (idx: number) => {
    triggerHaptic();
    setSelectedWeekdays((prev) => {
      if (prev.includes(idx)) {
        if (prev.length === 1) return prev;
        return prev.filter((i) => i !== idx);
      }
      return [...prev, idx];
    });
  };

  const getSummarySentence = () => {
    return describeLocalizedCustomRepeat(
      {
        unit,
        interval,
        selectedWeekdays,
        monthlyMode,
        selectedMonthDate,
        selectedPosIdx,
        selectedDayIdx,
        selectedYearlyMonth,
        yearlyEnableWeekdays,
      },
      language
    );
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: backdropOpacity, backgroundColor: colors.modalOverlay }]}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <Animated.View style={[styles.sheet, { backgroundColor: colors.sheetBg, transform: [{ translateY }] }]}>
        <View style={[styles.dragPill, { backgroundColor: colors.dragPill }]} />

        <View style={styles.header}>
          <AnimatedPressable
            activeScale={0.88}
            style={[styles.backBtn, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel={t.common.back}
          >
            <BackChevronIcon color={colors.secondary} />
          </AnimatedPressable>

          <Text style={[styles.title, { color: colors.text }]}>{t.repeat.customTitle}</Text>

          <AnimatedPressable
            activeScale={0.88}
            style={[styles.checkCircleBtn, { backgroundColor: colors.today, borderColor: colors.today }]}
            onPress={handleConfirm}
            accessibilityRole="button"
            accessibilityLabel={t.common.confirm}
          >
            <CheckMarkIcon color="#FFFFFF" />
          </AnimatedPressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={{ width: '100%' }}
        >
          <View style={[styles.groupedCard, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <Pressable
              style={styles.formRow}
              onPress={() => {
                triggerHaptic();
                setShowUnitMenu((prev) => !prev);
              }}
            >
              <Text style={styles.rowLabel}>{t.repeat.frequency}</Text>
              <View style={styles.selectorBtn}>
                <Text style={[styles.selectorText, { color: colors.today }]}>{unitLabels[unit]}</Text>
                <SelectorChevronIcon color={colors.today} />
              </View>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: colors.inputBorder }]} />

            <View style={styles.formRow}>
              <Text style={styles.rowLabel}>{t.repeat.every}</Text>
              <View style={[styles.stepperContainer, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}>
                <AnimatedPressable
                  activeScale={0.85}
                  style={[styles.stepBtn, { backgroundColor: colors.card }, interval <= 1 && styles.stepBtnDisabled]}
                  onPress={handleDecrement}
                  disabled={interval <= 1}
                >
                  <MinusIcon color={interval <= 1 ? colors.checkboxBorder : colors.today} />
                </AnimatedPressable>

                <View style={styles.numBox}>
                  <Text style={styles.numText}>{interval}</Text>
                </View>

                <AnimatedPressable activeScale={0.85} style={[styles.stepBtn, { backgroundColor: colors.card }]} onPress={handleIncrement}>
                  <PlusIcon color={colors.today} />
                </AnimatedPressable>
              </View>
            </View>
          </View>

          <Text style={styles.summaryText}>{getSummarySentence()}</Text>

          {unit === 'weekly' && (
            <View style={[styles.groupedCard, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, marginTop: 16 }]}>
              {orderedWeekdayIndices.map((dayIdx, i) => {
                const dayName = weekdaysFull[dayIdx];
                const isSelected = selectedWeekdays.includes(dayIdx);
                return (
                  <View key={`${dayName}-${dayIdx}`}>
                    {i > 0 && <View style={[styles.divider, { backgroundColor: colors.inputBorder }]} />}
                    <Pressable style={styles.formRow} onPress={() => toggleWeekday(dayIdx)}>
                      <Text style={styles.rowLabel}>{dayName}</Text>
                      {isSelected && <CheckIcon color={colors.today} />}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}

          {unit === 'monthly' && (
            <View style={[styles.groupedCard, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, marginTop: 16 }]}>
              <Pressable style={styles.formRow} onPress={() => { triggerHaptic(); setMonthlyMode('dates'); }}>
                <Text style={styles.rowLabel}>{t.repeat.selectDates}</Text>
                {monthlyMode === 'dates' && <CheckIcon color={colors.today} />}
              </Pressable>

              <View style={[styles.divider, { backgroundColor: colors.inputBorder }]} />

              <Pressable style={styles.formRow} onPress={() => { triggerHaptic(); setMonthlyMode('dayOfWeek'); }}>
                <Text style={styles.rowLabel}>{t.repeat.selectDayOfWeek}</Text>
                {monthlyMode === 'dayOfWeek' && <CheckIcon color={colors.today} />}
              </Pressable>

              {monthlyMode === 'dates' && (
                <View style={styles.daysGridContainer}>
                  {Array.from({ length: 5 }, (_, rowIdx) => {
                    const rowDates = Array.from({ length: 7 }, (__, colIdx) => {
                      const d = rowIdx * 7 + colIdx + 1;
                      return d <= 31 ? d : null;
                    });
                    return (
                      <View key={`row-${rowIdx}`} style={styles.dayGridRow}>
                        {rowDates.map((d, colIdx) => {
                          if (d === null) {
                            return <View key={`empty-${colIdx}`} style={styles.dayGridCell} />;
                          }
                          const isSelected = selectedMonthDate === d;
                          return (
                            <Pressable
                              key={d}
                              style={[styles.dayGridCell, isSelected && { backgroundColor: colors.today, borderRadius: 8 }]}
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
                    data={orderedWeekdayIndices}
                    selectedIndex={Math.max(0, orderedWeekdayIndices.indexOf(selectedDayIdx))}
                    onSelect={(orderIdx) => setSelectedDayIdx(orderedWeekdayIndices[orderIdx])}
                    getLabel={(dayIdx) => weekdaysFull[dayIdx].toLowerCase()}
                  />
                </View>
              )}
            </View>
          )}

          {unit === 'yearly' && (
            <>
              <View style={[styles.groupedCard, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, marginTop: 16 }]}>
                <View style={styles.monthsGridContainer}>
                  {monthsShort.map((mShort, mIdx) => {
                    const isSelected = selectedYearlyMonth === mIdx;
                    return (
                      <Pressable
                        key={`${mShort}-${mIdx}`}
                        style={[
                          styles.monthGridCell,
                          isSelected && { backgroundColor: colors.today },
                        ]}
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

              <View style={[styles.groupedCard, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, marginTop: 14 }]}>
                <View style={styles.formRow}>
                  <Text style={styles.rowLabel}>{t.repeat.weekdays}</Text>
                  <View style={styles.switchWrapper}>
                    <Switch
                      value={yearlyEnableWeekdays}
                      onValueChange={(v) => {
                        triggerHaptic();
                        setYearlyEnableWeekdays(v);
                      }}
                      trackColor={{ false: colors.inputBorder, true: colors.today }}
                      ios_backgroundColor={colors.inputBorder}
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
                      data={orderedWeekdayIndices}
                      selectedIndex={Math.max(0, orderedWeekdayIndices.indexOf(selectedDayIdx))}
                      onSelect={(orderIdx) => setSelectedDayIdx(orderedWeekdayIndices[orderIdx])}
                      getLabel={(dayIdx) => weekdaysFull[dayIdx].toLowerCase()}
                    />
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>

        {showUnitMenu && (
          <Pressable style={styles.popoverOverlay} onPress={() => setShowUnitMenu(false)}>
            <View style={[styles.popoverMenu, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}>
              <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                {(['daily', 'weekly', 'monthly', 'yearly'] as CustomUnit[]).map((u, idx, arr) => {
                  const isSelected = unit === u;
                  const isFirst = idx === 0;
                  const isLast = idx === arr.length - 1;
                  return (
                    <Pressable
                      key={u}
                      style={[
                        styles.menuItem,
                        { backgroundColor: isSelected ? `${colors.today}14` : 'transparent' },
                        isFirst && styles.menuItemFirst,
                        isLast && styles.menuItemLast,
                      ]}
                      onPress={() => {
                        triggerHaptic();
                        setUnit(u);
                        setShowUnitMenu(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.menuItemText,
                          { color: colors.text },
                          isSelected && { color: colors.today, fontWeight: '700' },
                        ]}
                      >
                        {unitLabels[u]}
                      </Text>
                      {isSelected && <CheckIcon color={colors.today} />}
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
function BackChevronIcon({ color = '#000000' }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{ marginLeft: -1 }}>
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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

function SelectorChevronIcon({ color = colors.today }: { color?: string }) {
  return (
    <Svg width={12} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M7 9l5-5 5 5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 15l5 5 5-5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
    zIndex: 1000,
    elevation: 1000,
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.background,
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
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.checkboxBorder,
    marginBottom: 10,
  },
  header: {
    width: '100%',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 12,
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  checkCircleBtn: {
    position: 'absolute',
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.today,
    borderWidth: 1.5,
    borderColor: colors.today,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  groupedCard: {
    width: '100%',
    backgroundColor: colors.inputBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.inputBorder,
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
    color: colors.text,
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
    color: colors.today,
  },
  divider: {
    height: 1,
    backgroundColor: colors.inputBorder,
    marginLeft: 16,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBorder,
    padding: 3,
    borderRadius: 14,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    backgroundColor: 'transparent',
  },
  numBox: {
    minWidth: 36,
    height: 32,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  summaryText: {
    width: '100%',
    paddingHorizontal: 4,
    fontSize: 13,
    fontWeight: '400',
    color: colors.secondary,
    lineHeight: 18,
    marginTop: 6,
  },
  daysGridContainer: {
    flexDirection: 'column',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: colors.inputBorder,
  },
  dayGridRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayGridCell: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayGridCellSelected: {
    backgroundColor: colors.today,
    borderRadius: 4,
  },
  dayGridText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
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
    borderColor: colors.inputBorder,
  },
  monthGridCellSelected: {
    backgroundColor: colors.today,
  },
  monthGridText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  monthGridTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pickerWheelBox: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.inputBorder,
    backgroundColor: colors.card,
    paddingVertical: 4,
  },
  pickerWheelRow: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  pickerWheelRowActive: {
    backgroundColor: colors.inputBg,
  },
  pickerWheelText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  pickerWheelTextActive: {
    color: colors.today,
    fontWeight: '700',
  },
  popoverOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  popoverMenu: {
    position: 'absolute',
    top: 92,
    right: 20,
    width: 190,
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 20,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  menuItemFirst: {
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  menuItemLast: {
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
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
    color: colors.today,
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
    color: colors.today,
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
  const { colors, isDark } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: selectedIndex * WHEEL_ITEM_HEIGHT, animated: false });
  }, [selectedIndex]);

  return (
    <View style={styles.wheelColumnContainer}>
      <View pointerEvents="none" style={[styles.wheelCenterHighlight, { backgroundColor: isDark ? '#282F3E' : '#E5E5EA80' }]} />

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
              <Text
                style={[
                  styles.wheelItemText,
                  { color: colors.secondary },
                  isSelected && [styles.wheelItemTextSelected, { color: colors.today }],
                ]}
              >
                {getLabel(item)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
