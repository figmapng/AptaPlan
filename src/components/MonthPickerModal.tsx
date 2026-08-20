import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { useTheme } from '@/context/theme-context';
import { months } from '@/services/date-service';
import { AnimatedPressable } from './AnimatedPressable';

interface MonthPickerModalProps {
  visible: boolean;
  currentDate: Date;
  onSelectMonth: (selectedDate: Date) => void;
  onClose: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_WIDTH = SCREEN_WIDTH - 40; // 20px paddingHorizontal on sheet

export function MonthPickerModal({
  visible,
  currentDate,
  onSelectMonth,
  onClose,
}: MonthPickerModalProps) {
  const { colors, isDark } = useTheme();
  const [selectedYear, setSelectedYear] = useState(() => currentDate.getFullYear());
  const translateY = useRef(new Animated.Value(420)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const today = new Date();

  // Synchronously reset scroll position to index 1 BEFORE screen paint to prevent flickering (like CalendarModal)
  useLayoutEffect(() => {
    scrollViewRef.current?.scrollTo({ x: ITEM_WIDTH, animated: false });
  }, [selectedYear]);

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

  const handleTodayClick = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (selectedYear !== today.getFullYear()) {
      setSelectedYear(today.getFullYear());
    } else {
      onSelectMonth(new Date());
      handleClose();
    }
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={handleClose}>
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { backgroundColor: colors.sheetBg, transform: [{ translateY }] }]}>
          <View style={[styles.dragPill, { backgroundColor: isDark ? '#3D4452' : '#D1D5DB' }]} />
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Айды таңдау</Text>
            <AnimatedPressable
              activeScale={0.92}
              style={[styles.todayBadge, { backgroundColor: isDark ? '#0284C725' : '#01B7FF14' }]}
              onPress={handleTodayClick}
            >
              <Text style={[styles.todayText, { color: colors.today }]}>Бүгін</Text>
            </AnimatedPressable>
          </View>

          {/* Year Navigator */}
          <View style={styles.yearRow}>
            <AnimatedPressable
              activeScale={0.88}
              style={styles.arrowBtn}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                scrollViewRef.current?.scrollTo({ x: 0, animated: true });
              }}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path d="M15 18l-6-6 6-6" stroke={colors.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </AnimatedPressable>

            <Text style={[styles.yearText, { color: colors.text }]}>{selectedYear} жыл</Text>

            <AnimatedPressable
              activeScale={0.88}
              style={styles.arrowBtn}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                scrollViewRef.current?.scrollTo({ x: ITEM_WIDTH * 2, animated: true });
              }}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path d="M9 18l6-6-6-6" stroke={colors.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </AnimatedPressable>
          </View>

          {/* Horizontal Months Grid Carousel for Years (Paging ScrollView like CalendarModal) */}
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
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedYear((prev) => prev - 1);
              } else if (page === 2) {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedYear((prev) => prev + 1);
              }
            }}
            style={{ width: ITEM_WIDTH, height: 274 }}
          >
            <View style={{ width: ITEM_WIDTH, height: 274 }}>
              <MonthGridMatrix
                year={selectedYear - 1}
                currentDate={currentDate}
                today={today}
                onSelectMonth={(targetDate) => {
                  onSelectMonth(targetDate);
                  handleClose();
                }}
              />
            </View>

            <View style={{ width: ITEM_WIDTH, height: 274 }}>
              <MonthGridMatrix
                year={selectedYear}
                currentDate={currentDate}
                today={today}
                onSelectMonth={(targetDate) => {
                  onSelectMonth(targetDate);
                  handleClose();
                }}
              />
            </View>

            <View style={{ width: ITEM_WIDTH, height: 274 }}>
              <MonthGridMatrix
                year={selectedYear + 1}
                currentDate={currentDate}
                today={today}
                onSelectMonth={(targetDate) => {
                  onSelectMonth(targetDate);
                  handleClose();
                }}
              />
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function MonthGridMatrix({
  year,
  currentDate,
  today,
  onSelectMonth,
}: {
  year: number;
  currentDate: Date;
  today: Date;
  onSelectMonth: (date: Date) => void;
}) {
  const { colors } = useTheme();
  const currentMonthIdx = currentDate.getMonth();
  const isCurrentYear = year === currentDate.getFullYear();

  return (
    <View style={styles.grid}>
      {months.map((monthName, idx) => {
        const isSelected = isCurrentYear && idx === currentMonthIdx;
        const isActualTodayMonth = today.getFullYear() === year && today.getMonth() === idx;

        return (
          <AnimatedPressable
            key={monthName}
            activeScale={0.94}
            style={[
              styles.monthCard,
              { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
              isSelected && { backgroundColor: colors.today, borderColor: colors.today },
              isActualTodayMonth && !isSelected && { borderColor: colors.today },
            ]}
            onPress={() => onSelectMonth(new Date(year, idx, 1))}
          >
            <Text
              style={[
                styles.monthText,
                { color: colors.text },
                isSelected && styles.monthTextSelected,
                isActualTodayMonth && !isSelected && { color: colors.today, fontWeight: '700' },
              ]}
            >
              {monthName[0].toUpperCase() + monthName.slice(1)}
            </Text>

            {isActualTodayMonth && (
              <View style={[styles.todayDot, { backgroundColor: colors.today }, isSelected && styles.todayDotSelected]} />
            )}
          </AnimatedPressable>
        );
      })}
    </View>
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
    paddingTop: 14,
    paddingBottom: 36,
    gap: 0,
    boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
  },
  dragPill: {
    width: 38,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 16,
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
    backgroundColor: '#01B7FF14',
  },
  todayText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#01B7FF',
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginTop: 8,
    marginBottom: 20,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearText: {
    fontSize: 17,
    fontWeight: '600',
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
    backgroundColor: '#01B7FF',
    borderColor: '#01B7FF',
  },
  monthCardToday: {
    borderColor: '#01B7FF',
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
    color: '#01B7FF',
    fontWeight: '700',
  },
  todayDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#01B7FF',
  },
  todayDotSelected: {
    backgroundColor: '#FFFFFF',
  },
});
