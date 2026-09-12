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
          const dayShort = (t.date.weekdaysShort[d.getDay()] || '').toUpperCase();

          const isWeekend = d.getDay() === 0 || d.getDay() === 6;

          // Only active (today) day has the theme accent color
          // Inactive days look like inactive card colors
          const numColor = isTodayDay
            ? colors.today
            : isSelected
            ? (isDark ? colors.text : '#31383E')
            : (isDark ? '#7E8B9F' : '#9CA3AF');

          // Weekdays (non-weekend) have a richer/darker color (#31383E), weekend days are muted (#9CA3AF)
          const labelColor = isTodayDay
            ? colors.today
            : isSelected
            ? (isDark ? colors.text : '#31383E')
            : isWeekend
            ? (isDark ? '#7E8B9F' : '#9CA3AF')
            : (isDark ? '#D1D5DB' : '#31383E');

          const fontWeight = (isSelected || isTodayDay) ? '700' : '600';

          return (
            <Pressable
              key={`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${i}`}
              onPress={() => onSelectDate(d)}
              hitSlop={4}
              style={styles.dayCell}
            >
              <View style={styles.cellContent}>
                <Text
                  style={[
                    styles.cellNum,
                    { color: numColor, fontWeight },
                  ]}
                >
                  {dayNum}
                </Text>
                <Text
                  style={[
                    styles.cellLabel,
                    { color: labelColor, fontWeight },
                  ]}
                >
                  {dayShort}
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
    height: 56,
    marginHorizontal: 16,
    borderRadius: 20,
    borderCurve: 'continuous',
    paddingHorizontal: 6,
    paddingVertical: 6,
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
    paddingHorizontal: 4,
  },
  dayCell: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  cellContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  cellNum: {
    fontSize: 17,
    lineHeight: 20,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  cellLabel: {
    fontSize: 11,
    lineHeight: 13,
    textAlign: 'center',
  },
});
