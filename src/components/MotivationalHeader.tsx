import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { format } from 'date-fns';
import { months, shortMonths, weekdays, toDateKey } from '@/services/date-service';
import { useTheme } from '@/hooks/use-theme';
import type { Task } from '@/types/task';

const MOTIVATIONAL_QUOTES = [
  "Бүгінгі әрбір кішкентай қадам — ертеңгі үлкен жеңіс!",
  "Бүгінгі күнді тиімді өткізіп, мақсатыңа бір қадам жақында!",
  "Табыстың сыры — күнделікті табандылық пен төзімде.",
  "Бүгінгі жоспарланған істі кейінге қалдырма, сенің қолыңнан келеді!",
  "Әрбір жаңа күн — жаңа мүмкіндіктер мен биік белестерге жол.",
  "Мақсатқа жетудің ең қысқа жолы — дәл қазір бастау!",
  "Уақытыңды дұрыс басқарсаң, армандарыңа тез жетесің.",
];

interface WeatherState {
  temp: number;
  emoji: string;
  cityName: string;
  sunrise: string;
  sunset: string;
}

interface MotivationalHeaderProps {
  tasks: Task[];
  insetsTop: number;
  onClose?: () => void;
  anim?: Animated.Value;
}

export function MotivationalHeader({ tasks, insetsTop, onClose, anim }: MotivationalHeaderProps) {
  const { colors, isDark } = useTheme();
  const fallbackAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = anim || fallbackAnim;

  // Sequential Staggered Fade-In (Бірінен соң бірі біртіндеп мөлдірлікпен пайда болу)
  const topRowOpacity = progressAnim.interpolate({
    inputRange: [0, 0.1, 0.35],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const textOpacity = progressAnim.interpolate({
    inputRange: [0.25, 0.7],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const statsOpacity = progressAnim.interpolate({
    inputRange: [0.55, 0.95],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const indicatorOpacity = progressAnim.interpolate({
    inputRange: [0.75, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const today = new Date();
  const dayNum = format(today, 'dd');
  const monthFull = months[today.getMonth()][0].toUpperCase() + months[today.getMonth()].slice(1);
  const yearFull = today.getFullYear();
  const dayOfWeek = weekdays[today.getDay()];

  const todayKey = toDateKey(today);
  const todayTasks = useMemo(() => tasks.filter((t) => t.date === todayKey), [tasks, todayKey]);
  const completedCount = useMemo(() => todayTasks.filter((t) => t.isCompleted).length, [todayTasks]);

  // Select quote based on day of year
  const startOfYear = new Date(today.getFullYear(), 0, 0);
  const diff = today.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const quote = MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];

  // Greeting based on time of day
  const hour = today.getHours();
  const greeting = hour < 12 ? 'Қайырлы таң' : hour < 18 ? 'Қайырлы күн' : 'Қайырлы кеш';

  // ── Calculate remaining time until the end of the year ───────────────
  const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59);
  const totalDaysLeft = Math.max(0, Math.ceil((endOfYear.getTime() - today.getTime()) / oneDay));
  const monthsLeft = Math.max(0, 11 - today.getMonth());
  const weeksLeft = Math.floor(totalDaysLeft / 7);

  // ── Live Weather State ────────────────────────────────────────────────
  const [weather, setWeather] = useState<WeatherState>({
    temp: 25,
    emoji: '🌤️',
    cityName: 'Алматы',
    sunrise: '05:42',
    sunset: '20:18',
  });

  useEffect(() => {
    let isMounted = true;
    const fetchWeather = async () => {
      try {
        const response = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=43.238947&longitude=76.889709&current_weather=true&daily=sunrise,sunset&timezone=auto'
        );
        if (response.ok) {
          const data = await response.json();
          if (data.current_weather && isMounted) {
            const temp = Math.round(data.current_weather.temperature);
            const code = data.current_weather.weathercode;
            
            let emoji = '☀️';
            if (code <= 3) emoji = '🌤️';
            else if (code <= 48) emoji = '🌫️';
            else if (code <= 67 || (code >= 80 && code <= 82)) emoji = '🌧️';
            else if (code <= 77 || code >= 85) emoji = '❄️';
            else if (code >= 95) emoji = '⛈️';

            let sunriseStr = '05:42';
            let sunsetStr = '20:18';

            if (data.daily?.sunrise?.[0]) {
              const srDate = new Date(data.daily.sunrise[0]);
              sunriseStr = format(srDate, 'HH:mm');
            }
            if (data.daily?.sunset?.[0]) {
              const ssDate = new Date(data.daily.sunset[0]);
              sunsetStr = format(ssDate, 'HH:mm');
            }

            setWeather({
              temp,
              emoji,
              cityName: 'Алматы',
              sunrise: sunriseStr,
              sunset: sunsetStr,
            });
          }
        }
      } catch (err) {
        // Fallback to initial state if network is offline
      }
    };

    void fetchWeather();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insetsTop, 12) + 8 }]}>
      {/* 1. Top Header Row: Date & Close Button (First Sequential Fade-In) */}
      <Animated.View style={[styles.topRow, { opacity: topRowOpacity }]}>
        <View style={styles.dateGroup}>
          <View style={styles.dateCardBadgeOuter}>
            <View style={styles.dateCardBadgeInner}>
              <Text style={styles.dateCardBadgeText}>{dayNum}</Text>
            </View>
          </View>
          <View style={styles.dateSubGroup}>
            <Text style={styles.monthYearText}>{`${monthFull} ${yearFull}`}</Text>
            <Text style={styles.weekdayText}>{dayOfWeek}</Text>
          </View>
        </View>

        {onClose && (
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path d="M18 6L6 18M6 6l12 12" stroke="#8E8E93" strokeWidth="2.2" strokeLinecap="round" />
            </Svg>
          </Pressable>
        )}
      </Animated.View>

      {/* 2. Motivational Text & Daily Summary (Second Sequential Fade-In) */}
      <Animated.View style={[styles.contentSection, { opacity: textOpacity }]}>
        <Text style={styles.greetingText}>{greeting}.</Text>
        
        <Text style={styles.bodyText}>
          Бүгін сізде <Text style={styles.boldText}>🗓️ {todayTasks.length} тапсырма</Text>
          {completedCount > 0 ? (
            <> және <Text style={styles.boldText}>☑️ {completedCount} орындалды</Text></>
          ) : null}
          . {quote}
        </Text>
      </Animated.View>

      {/* 3. Metrics Row: Weather, Sunrise/Sunset & Year Countdown (Third Sequential Fade-In) */}
      <Animated.View style={[styles.statsRow, { opacity: statsOpacity }]}>
        {/* Weather Badge */}
        <View style={styles.statBadge}>
          <Text style={styles.statText}>
            {`${weather.emoji} ${weather.temp > 0 ? `+${weather.temp}` : weather.temp}°C · ${weather.cityName}`}
          </Text>
        </View>

        {/* Sunrise & Sunset Badge */}
        <View style={styles.statBadge}>
          <Text style={styles.statText}>
            {`☀️ ${weather.sunrise} · 🌙 ${weather.sunset}`}
          </Text>
        </View>

        {/* Year Countdown Badge */}
        <View style={styles.statBadge}>
          <Text style={styles.statText}>
            <Text style={{ opacity: 0.65 }}>⏳ Жыл бітуіне: </Text>
            {`${totalDaysLeft} күн қалды (яғни ~${monthsLeft} ай)`}
          </Text>
        </View>
      </Animated.View>

      {/* 4. Pull Indicator Pill (Fourth Sequential Fade-In) */}
      <Animated.View style={{ opacity: indicatorOpacity }}>
        <Pressable onPress={onClose} style={styles.pullIndicatorWrapper} hitSlop={16}>
          <View style={styles.dragIndicator} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#18181A',
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateCardBadgeOuter: {
    backgroundColor: '#D1D1D6',
    borderRadius: 11,
    paddingTop: 7.5,
    paddingRight: 2,
    paddingBottom: 2,
    paddingLeft: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCardBadgeInner: {
    backgroundColor: '#18181A',
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCardBadgeText: {
    fontSize: 28,
    lineHeight: 31,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  dateSubGroup: {
    marginLeft: 4,
    justifyContent: 'center',
  },
  monthYearText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    color: '#E5E5EA',
    letterSpacing: 0.1,
  },
  weekdayText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: '#98989D',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnPressed: {
    opacity: 0.7,
  },
  contentSection: {
    marginBottom: 16,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#D1D1D6',
    lineHeight: 25,
    letterSpacing: -0.2,
  },
  boldText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E5E5EA',
  },
  pullIndicatorWrapper: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});
