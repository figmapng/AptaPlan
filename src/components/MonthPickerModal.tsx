import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { months } from '@/services/date-service';
import { AnimatedPressable } from './AnimatedPressable';

interface MonthPickerModalProps {
  visible: boolean;
  currentDate: Date;
  onSelectMonth: (selectedDate: Date) => void;
  onClose: () => void;
}

export function MonthPickerModal({
  visible,
  currentDate,
  onSelectMonth,
  onClose,
}: MonthPickerModalProps) {
  const [selectedYear, setSelectedYear] = useState(() => currentDate.getFullYear());
  const translateY = useRef(new Animated.Value(420)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const today = new Date();
  const currentMonthIdx = currentDate.getMonth();
  const isCurrentYear = selectedYear === currentDate.getFullYear();

  useEffect(() => {
    if (visible) {
      setSelectedYear(currentDate.getFullYear());
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, friction: 9, tension: 85, useNativeDriver: true }),
      ]).start();
    } else {
      translateY.setValue(420);
      backdropOpacity.setValue(0);
    }
  }, [visible, currentDate, translateY, backdropOpacity]);

  if (!visible) return null;

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 420, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const handleMonthClick = (monthIdx: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const targetDate = new Date(selectedYear, monthIdx, 1);
    onSelectMonth(targetDate);
    handleClose();
  };

  const handleTodayClick = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectMonth(new Date());
    handleClose();
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={handleClose}>
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.dragPill} />
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Айды таңдау</Text>
            <AnimatedPressable activeScale={0.92} style={styles.todayBadge} onPress={handleTodayClick}>
              <Text style={styles.todayText}>Бүгін</Text>
            </AnimatedPressable>
          </View>

          {/* Year Navigator */}
          <View style={styles.yearRow}>
            <AnimatedPressable
              activeScale={0.88}
              style={styles.arrowBtn}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedYear((y) => y - 1);
              }}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path d="M15 18l-6-6 6-6" stroke={colors.text} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </AnimatedPressable>

            <Text style={styles.yearText}>{selectedYear} жыл</Text>

            <AnimatedPressable
              activeScale={0.88}
              style={styles.arrowBtn}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedYear((y) => y + 1);
              }}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path d="M9 18l6-6-6-6" stroke={colors.text} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </AnimatedPressable>
          </View>

          {/* Months 3x4 Grid */}
          <View style={styles.grid}>
            {months.map((monthName, idx) => {
              const isSelected = isCurrentYear && idx === currentMonthIdx;
              const isActualTodayMonth = today.getFullYear() === selectedYear && today.getMonth() === idx;

              return (
                <AnimatedPressable
                  key={monthName}
                  activeScale={0.94}
                  style={[
                    styles.monthCard,
                    isSelected && styles.monthCardSelected,
                    isActualTodayMonth && !isSelected && styles.monthCardToday,
                  ]}
                  onPress={() => handleMonthClick(idx)}
                >
                  <Text
                    style={[
                      styles.monthText,
                      isSelected && styles.monthTextSelected,
                      isActualTodayMonth && !isSelected && styles.monthTextToday,
                    ]}
                  >
                    {monthName[0].toUpperCase() + monthName.slice(1)}
                  </Text>

                  {isActualTodayMonth && (
                    <View style={[styles.todayDot, isSelected && styles.todayDotSelected]} />
                  )}
                </AnimatedPressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 36,
    gap: 16,
    boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
  },
  dragPill: {
    width: 38,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
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
    backgroundColor: '#2F7DF214',
  },
  todayText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2F7DF2',
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F6F8FB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
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
    gap: 10,
  },
  monthCard: {
    width: '31%',
    height: 58,
    borderRadius: 14,
    backgroundColor: '#F6F8FB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EAEFF5',
    position: 'relative',
  },
  monthCardSelected: {
    backgroundColor: '#2F7DF2',
    borderColor: '#2F7DF2',
  },
  monthCardToday: {
    borderColor: '#2F7DF2',
  },
  monthText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  monthTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  monthTextToday: {
    color: '#2F7DF2',
    fontWeight: '700',
  },
  todayDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2F7DF2',
  },
  todayDotSelected: {
    backgroundColor: '#FFFFFF',
  },
});
