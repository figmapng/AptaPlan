import React, { useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { addDays, isSameDay, isToday, startOfWeek } from 'date-fns';
import { colors as defaultColors } from '@/constants/colors';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/use-i18n';

interface CompactWeekStripProps {
  selectedDate: Date;
  originDate?: Date;
  onSelectDate: (date: Date) => void;
  carouselX?: Animated.Value;
  screenWidth?: number;
  pageIndex?: number;
  style?: StyleProp<ViewStyle>;
}

export function CompactWeekStrip({
  selectedDate,
  onSelectDate,
  carouselX,
  screenWidth = 375,
  pageIndex = 0,
  style,
}: CompactWeekStripProps) {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  const currentDayDate = useMemo(() => {
    if (!selectedDate || isNaN(selectedDate.getTime())) return new Date();
    return selectedDate;
  }, [selectedDate]);

  const currentWeekStart = useMemo(
    () => startOfWeek(currentDayDate, { weekStartsOn: 1 }),
    [currentDayDate]
  );

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: isDark ? colors.cardBorder : 'transparent',
          borderWidth: isDark ? 1 : 0,
        },
        style,
      ]}
    >
      <View style={styles.weekRow}>
        {days.map((d, i) => {
          const isSelected = isSameDay(d, currentDayDate);
          const isTodayDay = isToday(d);
          const dayNum = d.getDate();
          const dayShort = (t.date.weekdaysShort[d.getDay()] || '');
          // Capitalize first letter e.g. "Ср", "Wed"
          const formattedDayShort = dayShort.charAt(0).toUpperCase() + dayShort.slice(1);

          const isWeekend = d.getDay() === 0 || d.getDay() === 6;

          // In user design:
          // Top is Day name ("Wed"), Bottom is Day number ("10")
          // Selected day has an elevated rounded rectangle/pill background
          const labelColor = isTodayDay
            ? colors.today
            : isSelected
            ? (isDark ? '#CBD5E1' : '#707684')
            : (isDark ? '#64748B' : '#9CA3AF');

          const numColor = isTodayDay
            ? colors.today
            : isSelected
            ? (isDark ? colors.text : '#1E293B')
            : isWeekend
            ? (isDark ? '#94A3B8' : '#64748B')
            : (isDark ? '#94A3B8' : '#64748B');

          return (
            <Pressable
              key={`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${i}`}
              onPress={() => onSelectDate(d)}
              hitSlop={4}
              style={[
                styles.dayCell,
                isSelected && [
                  styles.selectedCell,
                  {
                    backgroundColor: isDark ? '#2C3446' : '#EFF0F3',
                    borderColor: isDark ? '#3D485C' : '#E2E5EB',
                  },
                ],
              ]}
            >
              <View style={styles.cellContent}>
                <Text
                  style={[
                    styles.cellLabel,
                    {
                      color: labelColor,
                      fontWeight: isSelected ? '600' : '500',
                    },
                  ]}
                >
                  {formattedDayShort}
                </Text>
                <Text
                  style={[
                    styles.cellNum,
                    {
                      color: numColor,
                      fontWeight: isSelected ? '700' : '600',
                    },
                  ]}
                >
                  {dayNum}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 60,
    marginHorizontal: 16,
    borderRadius: 20,
    borderCurve: 'continuous',
    paddingHorizontal: 4,
    paddingVertical: 4,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayCell: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  selectedCell: {
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  cellContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  cellLabel: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  cellNum: {
    fontSize: 16,
    lineHeight: 19,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
