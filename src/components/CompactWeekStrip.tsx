import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { addDays, isSameDay, isToday, startOfWeek } from 'date-fns';
import { weekdaysShort } from '@/services/date-service';
import { colors } from '@/constants/colors';

interface CompactWeekStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  carouselX?: Animated.Value;
  screenWidth?: number;
  pageIndex?: number;
}

export function CompactWeekStrip({
  selectedDate,
  onSelectDate,
  carouselX,
  screenWidth = 375,
  pageIndex = 0,
}: CompactWeekStripProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Find index of selected date within current week (0 to 6)
  const selectedIndex = days.findIndex((d) => isSameDay(d, selectedDate));
  const safeSelectedIndex = selectedIndex >= 0 ? selectedIndex : 0;

  // Calculate cell width step
  const stripWidth = screenWidth - 32; // marginHorizontal 16 * 2
  const cellWidth = stripWidth / 7;

  // Base X position for selected item within 7-day strip
  const baseX = safeSelectedIndex * cellWidth;

  // Relative drag offset from active page index (prevents overflow on week change)
  const relativeDragX = carouselX
    ? Animated.add(carouselX, pageIndex * screenWidth)
    : 0;

  const animatedOffsetX = carouselX
    ? (relativeDragX as Animated.AnimatedAddition<number>).interpolate({
        inputRange: [-screenWidth, 0, screenWidth],
        outputRange: [cellWidth, 0, -cellWidth],
        extrapolate: 'clamp',
      })
    : 0;

  const translateX = Animated.add(baseX, animatedOffsetX);

  const selectedDay = days[safeSelectedIndex];
  const selectedIsToday = selectedDay ? isToday(selectedDay) : false;
  const selectedIsWeekend = selectedDay
    ? selectedDay.getDay() === 0 || selectedDay.getDay() === 6
    : false;

  const activeBorderColor = selectedIsToday
    ? '#90CBFF'
    : selectedIsWeekend
    ? '#FFCDC8'
    : colors.cardBorder;

  return (
    <View style={styles.container}>
      {/* Smooth Animated Selection Border Indicator */}
      <Animated.View
        style={[
          styles.animatedIndicator,
          {
            width: cellWidth - 3,
            transform: [{ translateX }],
            borderColor: activeBorderColor,
          },
        ]}
      />

      {days.map((d) => {
        const isSelected = isSameDay(d, selectedDate);
        const isDayToday = isToday(d);
        const dayNum = d.getDate();
        const dayShort = (weekdaysShort[d.getDay()] || '').toUpperCase();
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;

        // Optical center adjustment for 2-digit dates starting with '1' (10, 12..19)
        // Digit '1' is narrower than 0, 2..9, shifting visual center of number slightly right.
        const isTeenNumber = dayNum >= 10 && dayNum <= 19 && dayNum !== 11;
        const opticalLabelStyle = isTeenNumber ? { transform: [{ translateX: 0.75 }] } : null;

        return (
          <Pressable
            key={d.toISOString()}
            onPress={() => onSelectDate(d)}
            style={styles.dayCell}
          >
            <View style={styles.cellContent}>
              <Text
                style={[
                  styles.cellNum,
                  isDayToday
                    ? styles.cellNumToday
                    : isSelected
                    ? isWeekend
                      ? styles.cellNumSelectedWeekend
                      : styles.cellNumSelected
                    : isWeekend
                    ? styles.cellNumWeekend
                    : styles.cellNumUnselected,
                ]}
              >
                {dayNum}
              </Text>
              <Text
                style={[
                  styles.cellLabel,
                  isDayToday
                    ? styles.cellLabelToday
                    : isSelected
                    ? isWeekend
                      ? styles.cellLabelSelectedWeekend
                      : styles.cellLabelSelected
                    : isWeekend
                    ? styles.cellLabelWeekend
                    : styles.cellLabelUnselected,
                  opticalLabelStyle,
                ]}
              >
                {dayShort}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingVertical: 2,
    backgroundColor: 'transparent',
    marginHorizontal: 16,
    marginBottom: 4,
    position: 'relative',
  },
  animatedIndicator: {
    position: 'absolute',
    left: 1.5,
    top: 0,
    bottom: 0,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  dayCell: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    marginHorizontal: 1.5,
    position: 'relative',
    zIndex: 2,
  },
  cellContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  cellNum: {
    fontSize: 18,
    lineHeight: 20,
    textAlign: 'center',
    alignSelf: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  cellNumToday: {
    color: '#01B7FF',
    fontWeight: '800',
  },
  cellNumSelected: {
    color: colors.text,
    fontWeight: '700',
  },
  cellNumSelectedWeekend: {
    color: colors.weekend,
    fontWeight: '700',
  },
  cellNumUnselected: {
    color: colors.secondary,
    fontWeight: '500',
  },
  cellNumWeekend: {
    color: colors.weekend,
    fontWeight: '500',
  },
  cellLabel: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0,
    textAlign: 'center',
    alignSelf: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  cellLabelToday: {
    color: '#01B7FF',
    fontWeight: '800',
  },
  cellLabelSelected: {
    color: colors.text,
    fontWeight: '700',
  },
  cellLabelSelectedWeekend: {
    color: colors.weekend,
    fontWeight: '700',
  },
  cellLabelUnselected: {
    color: colors.secondary,
    fontWeight: '600',
  },
  cellLabelWeekend: {
    color: colors.weekendNumText,
    fontWeight: '600',
  },
});
