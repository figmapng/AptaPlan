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

          // Subtle, soft colors matching clean iOS design
          const labelColor = isSelected
            ? (isDark ? '#E2E8F0' : '#475569')
            : (isDark ? '#64748B' : '#94A3B8');

          const numColor = isTodayDay
            ? colors.today
            : isSelected
            ? (isDark ? '#F8FAFC' : '#1E293B')
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
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F3F5',
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
                      fontWeight: isSelected ? '700' : '500',
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
    height: 54,
    marginHorizontal: 16,
    borderRadius: 18,
    borderCurve: 'continuous',
    paddingHorizontal: 4,
    paddingVertical: 5,
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
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  selectedCell: {
    borderWidth: 0,
  },
  cellContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  cellLabel: {
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
  },
  cellNum: {
    fontSize: 15,
    lineHeight: 18,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
