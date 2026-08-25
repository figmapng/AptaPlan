import React, { useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
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
}

export function CompactWeekStrip({
  selectedDate,
  onSelectDate,
  carouselX,
  screenWidth = 375,
  pageIndex = 0,
}: CompactWeekStripProps) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const currentDayDate = selectedDate;

  const currentWeekStart = useMemo(
    () => startOfWeek(currentDayDate, { weekStartsOn: 1 }),
    [currentDayDate]
  );

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  const currentDayInWeek = useMemo(
    () => Math.round((currentDayDate.getTime() - currentWeekStart.getTime()) / (24 * 60 * 60 * 1000)),
    [currentDayDate, currentWeekStart]
  );

  const stripWidth = screenWidth - 32; // marginHorizontal 16 * 2
  const cellWidth = stripWidth / 7;

  const curIsToday = isToday(currentDayDate);
  const curIsWeekend = currentDayDate.getDay() === 0 || currentDayDate.getDay() === 6;
  const activeBorderColor = curIsToday
    ? colors.today
    : curIsWeekend
    ? colors.weekendNumBg
    : colors.cardBorder;

  const dayDragOffset = useMemo(
    () => (carouselX ? Animated.add(carouselX, pageIndex * screenWidth) : new Animated.Value(0)),
    [carouselX, pageIndex, screenWidth]
  );

  // Selection Indicator frame positioning (glides between day cells)
  const indicatorTranslateX = useMemo(() => {
    if (!carouselX) return currentDayInWeek * cellWidth;
    return dayDragOffset.interpolate({
      inputRange: [-screenWidth, 0, screenWidth],
      outputRange: [
        Math.min(6 * cellWidth, (currentDayInWeek + 1) * cellWidth),
        currentDayInWeek * cellWidth,
        Math.max(0, (currentDayInWeek - 1) * cellWidth),
      ],
      extrapolate: 'clamp',
    });
  }, [dayDragOffset, currentDayInWeek, cellWidth, screenWidth, carouselX]);

  return (
    <View style={[styles.container, { width: stripWidth }]}>
      {/* Selection indicator frame */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.animatedIndicator,
          {
            width: cellWidth - 3,
            transform: [{ translateX: indicatorTranslateX }],
            borderColor: activeBorderColor,
          },
        ]}
      />

      <View style={styles.weekRow}>
        {days.map((d) => {
          const isSelected = isSameDay(d, currentDayDate);
          const isDayToday = isToday(d);
          const dayNum = d.getDate();
          const dayShort = (t.date.weekdaysShort[d.getDay()] || '').toUpperCase();
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;

          const isTeenNumber = dayNum >= 10 && dayNum <= 19 && dayNum !== 11;
          const opticalLabelStyle = isTeenNumber ? { transform: [{ translateX: 0.75 }] } : null;

          let numColor = colors.secondary;
          let labelColor = colors.secondary;
          let numWeight: '500' | '600' | '700' | '800' = '500';
          let labelWeight: '500' | '600' | '700' | '800' = '500';

          if (isSelected) {
            if (isDayToday) {
              numColor = colors.today;
              labelColor = colors.today;
              numWeight = '800';
              labelWeight = '800';
            } else if (isWeekend) {
              numColor = colors.weekend;
              labelColor = colors.weekend;
              numWeight = '700';
              labelWeight = '700';
            } else {
              numColor = colors.text;
              labelColor = colors.text;
              numWeight = '700';
              labelWeight = '700';
            }
          } else {
            if (isDayToday) {
              numColor = colors.today;
              labelColor = colors.today;
              numWeight = '500';
              labelWeight = '500';
            } else if (isWeekend) {
              numColor = colors.weekend;
              labelColor = colors.weekend;
              numWeight = '500';
              labelWeight = '500';
            } else {
              numColor = colors.secondary;
              labelColor = colors.secondary;
              numWeight = '500';
              labelWeight = '500';
            }
          }

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
                    { color: numColor, fontWeight: numWeight },
                  ]}
                >
                  {dayNum}
                </Text>
                <Text
                  style={[
                    styles.cellLabel,
                    { color: labelColor, fontWeight: labelWeight },
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
    marginHorizontal: 16,
    marginBottom: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  weekRow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  cellLabel: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0,
    textAlign: 'center',
    alignSelf: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
