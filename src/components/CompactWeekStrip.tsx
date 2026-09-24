import React, { useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { addDays, differenceInCalendarDays, isSameDay, isToday, startOfWeek } from 'date-fns';
import { colors as defaultColors } from '@/constants/colors';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/use-i18n';
import { usePlanner } from '@/store/planner-store';

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
  originDate,
  onSelectDate,
  carouselX,
  screenWidth = 375,
  pageIndex = 0,
  style,
}: CompactWeekStripProps) {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const { settings } = usePlanner();
  const [rowWidth, setRowWidth] = React.useState<number>(0);

  const firstDay = settings?.firstDayOfWeek ?? 'mon';
  const weekStartsOn: 0 | 1 | 6 = firstDay === 'sun' ? 0 : firstDay === 'sat' ? 6 : 1;

  const currentDayDate = useMemo(() => {
    if (!selectedDate || isNaN(selectedDate.getTime())) return new Date();
    return selectedDate;
  }, [selectedDate]);

  const currentWeekStart = useMemo(
    () => startOfWeek(currentDayDate, { weekStartsOn }),
    [currentDayDate, weekStartsOn]
  );

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  // Calculate day index within current week (0 to 6)
  const selectedDayIndex = useMemo(() => {
    return days.findIndex((d) => isSameDay(d, currentDayDate));
  }, [days, currentDayDate]);

  const prevWeekStartRef = useRef<number>(currentWeekStart.getTime());
  const animatedIndex = useRef(new Animated.Value(selectedDayIndex >= 0 ? selectedDayIndex : 0)).current;

  React.useEffect(() => {
    if (selectedDayIndex < 0) return;
    const weekChanged = currentWeekStart.getTime() !== prevWeekStartRef.current;
    prevWeekStartRef.current = currentWeekStart.getTime();

    if (weekChanged) {
      animatedIndex.setValue(selectedDayIndex);
    } else {
      Animated.spring(animatedIndex, {
        toValue: selectedDayIndex,
        stiffness: 350,
        damping: 28,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedDayIndex, currentWeekStart]);

  // Day width inside week row
  const cellWidth = rowWidth > 0 ? rowWidth / 7 : (screenWidth - 32 - 8) / 7;

  const indicatorTranslateX = animatedIndex.interpolate({
    inputRange: [0, 1, 2, 3, 4, 5, 6],
    outputRange: [
      0 * cellWidth,
      1 * cellWidth,
      2 * cellWidth,
      3 * cellWidth,
      4 * cellWidth,
      5 * cellWidth,
      6 * cellWidth,
    ],
  });

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
      <View
        style={styles.weekRow}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0 && Math.abs(w - rowWidth) > 1) {
            setRowWidth(w);
          }
        }}
      >
        {/* Smooth animated sliding pill indicator */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.slidingIndicator,
            {
              width: cellWidth,
              backgroundColor: isToday(currentDayDate)
                ? colors.tintBg
                : (isDark ? 'rgba(255, 255, 255, 0.08)' : colors.cardHeaderBg),
              transform: [{ translateX: indicatorTranslateX }],
            },
          ]}
        />

        {days.map((d, i) => {
          const isSelected = isSameDay(d, currentDayDate);
          const isTodayDay = isToday(d);
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          const dayNum = d.getDate();
          const dayShort = (t.date.weekdaysShort[d.getDay()] || '');
          const formattedDayShort = dayShort.charAt(0).toUpperCase() + dayShort.slice(1);

          const labelColor = isTodayDay
            ? colors.today
            : isWeekend
            ? colors.weekend
            : isSelected
            ? colors.text
            : colors.secondary;

          const numColor = isTodayDay
            ? colors.today
            : isWeekend
            ? colors.weekend
            : isSelected
            ? colors.text
            : colors.secondary;

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
    borderRadius: 24,
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
  slidingIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    height: 44,
    borderRadius: 16,
    borderCurve: 'continuous',
    zIndex: 0,
  },
  dayCell: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderCurve: 'continuous',
    zIndex: 1,
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
