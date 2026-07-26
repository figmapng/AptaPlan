import React, { createContext, useContext, useRef, useState } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, isToday } from 'date-fns';
import { colors } from '@/constants/colors';
import { months, toDateKey, weekdays } from '@/services/date-service';
import type { Task } from '@/types/task';

type Frame = { x: number; y: number; width: number; height: number };
type Transition = { date: Date; tasks: Task[]; frame: Frame; phase: 'opening' | 'closing' };
type ContextValue = {
  openCard: (date: Date, tasks: Task[], frame: Frame) => void;
  closeCard: () => void;
  beginInteractiveClose: () => void;
  updateInteractiveClose: (translationY: number) => void;
  endInteractiveClose: (translationY: number, velocityY: number) => void;
  activeDate: string | null;
};

const CardTransitionContext = createContext<ContextValue | null>(null);

export function CardTransitionProvider({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Matched Geometry transition progress values
  const progress = useRef(new Animated.Value(0)).current;
  const contentProgress = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  const origin = useRef<Omit<Transition, 'phase'> | null>(null);
  const transitionRef = useRef<Transition | null>(null);
  const closeStarted = useRef(false);
  const [transition, setTransition] = useState<Transition | null>(null);

  const targetHeight = Math.min(
    height - insets.top - 102,
    Math.max(270, 106 + Math.min(transition?.tasks.length ?? 0, 5) * 54)
  );

  const openCard = (date: Date, tasks: Task[], frame: Frame) => {
    if (transitionRef.current) return;
    closeStarted.current = false;
    const next = { date, tasks, frame };
    origin.current = next;
    transitionRef.current = { ...next, phase: 'opening' };
    setTransition(transitionRef.current);
    progress.setValue(0);
    contentProgress.setValue(0);
    overlayOpacity.setValue(1);

    requestAnimationFrame(() => {
      Animated.timing(progress, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (!finished) return;
        router.push(`/day/${toDateKey(date)}?shared=1`);
        setTimeout(() => {
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 140,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }).start(() => {
            transitionRef.current = null;
            setTransition(null);
          });
        }, 100);
      });
      setTimeout(() => {
        Animated.timing(contentProgress, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      }, 240);
    });
  };

  const returnToHome = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const finishClose = () => {
    const previous = origin.current;
    if (closeStarted.current) return;
    closeStarted.current = true;

    // Pop detail screen back to home
    returnToHome();

    if (!previous) {
      origin.current = null;
      closeStarted.current = false;
      transitionRef.current = null;
      setTransition(null);
      return;
    }

    // Now spring the overlay modal card from fullscreen back to home grid position!
    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(progress, {
          toValue: 0,
          stiffness: 220,
          damping: 26,
          mass: 0.8,
          overshootClamping: true,
          useNativeDriver: false,
        }),
        Animated.timing(contentProgress, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
      ]).start(({ finished }) => {
        if (!finished) return;
        origin.current = null;
        closeStarted.current = false;
        transitionRef.current = null;
        setTransition(null);
      });
    });
  };

  const closeCard = () => {
    closeStarted.current = false;
    const previous = origin.current;
    if (!previous) {
      returnToHome();
      return;
    }
    transitionRef.current = { ...previous, phase: 'closing' };
    setTransition(transitionRef.current);
    progress.setValue(1);
    contentProgress.setValue(1);
    overlayOpacity.setValue(1);
    finishClose();
  };

  const beginInteractiveClose = () => {
    closeStarted.current = false;
    const previous = origin.current;
    if (!previous) return;
    transitionRef.current = { ...previous, phase: 'closing' };
    setTransition(transitionRef.current);
    progress.setValue(1);
    contentProgress.setValue(1);
    overlayOpacity.setValue(1);
  };

  const updateInteractiveClose = (translationY: number) => {
    if (!origin.current || !transitionRef.current || translationY <= 0) return;
    const cardProgress = Math.max(0, Math.min(1, 1 - translationY / 280));
    const detailProgress = Math.max(0, Math.min(1, 1 - translationY / 100));
    progress.setValue(cardProgress);
    contentProgress.setValue(detailProgress);
  };

  const endInteractiveClose = (translationY: number, velocityY: number) => {
    if (!origin.current || !transitionRef.current) return;
    if (translationY > 90 || velocityY > 0.6) {
      finishClose();
      return;
    }
    Animated.parallel([
      Animated.spring(progress, {
        toValue: 1,
        stiffness: 220,
        damping: 26,
        mass: 0.8,
        overshootClamping: true,
        useNativeDriver: false,
      }),
      Animated.timing(contentProgress, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(() => {
      if (transitionRef.current?.phase !== 'closing') {
        transitionRef.current = null;
        setTransition(null);
      }
    });
  };

  const value: ContextValue = {
    openCard,
    closeCard,
    beginInteractiveClose,
    updateInteractiveClose,
    endInteractiveClose,
    activeDate: transition ? toDateKey(transition.date) : null,
  };

  const current = transition;
  const day = current?.date;
  const weekend = day ? day.getDay() === 0 || day.getDay() === 6 : false;
  const today = day ? isToday(day) : false;

  return (
    <CardTransitionContext.Provider value={value}>
      {children}
      <Modal visible={current !== null} transparent animationType="none" statusBarTranslucent>
        {current && (
          <View pointerEvents="none" style={{ flex: 1 }}>
            {/* Backdrop Dimming Overlay */}
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: 'rgba(0,0,0,0.28)',
                  opacity: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                },
              ]}
            />

            {/* Matched Geometry Morphing Card */}
            <Animated.View
              style={{
                position: 'absolute',
                opacity: overlayOpacity,
                left: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [current.frame.x, 16],
                }),
                top: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [current.frame.y, insets.top + 4],
                }),
                width: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [current.frame.width, width - 32],
                }),
                height: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [current.frame.height, targetHeight],
                }),
                overflow: 'hidden',
                backgroundColor: colors.card,
                borderRadius: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 20],
                }),
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: today ? colors.activeCardBorder : colors.cardBorder,
                boxShadow: '0 4px 16px rgba(31,32,38,0.12)',
              }}
            >
              {/* Header Morphing */}
              <Animated.View
                style={{
                  height: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [34, 48],
                  }),
                  paddingHorizontal: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 12],
                  }),
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: today ? colors.activeHeaderBg : colors.card,
                  borderBottomWidth: 1,
                  borderBottomColor: today ? colors.activeHeaderBg : colors.divider,
                }}
              >
                <Animated.View
                  style={{
                    backgroundColor: today ? 'white' : '#F0F0F2',
                    borderRadius: 6,
                    paddingHorizontal: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [5, 8],
                    }),
                    paddingVertical: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [2, 4],
                    }),
                  }}
                >
                  <Animated.Text
                    style={{
                      fontSize: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [12, 14],
                      }),
                      fontWeight: '600',
                      color: today ? colors.activeHeaderBg : weekend ? colors.sundayText : colors.dateNumText,
                    }}
                  >
                    {format(day!, 'dd')}
                    <Animated.Text style={{ opacity: progress }}> {months[day!.getMonth()]}</Animated.Text>
                  </Animated.Text>
                </Animated.View>
                <Animated.Text
                  style={{
                    flex: 1,
                    fontSize: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 16],
                    }),
                    fontWeight: '700',
                    color: today ? 'white' : weekend ? colors.sundayText : colors.text,
                  }}
                >
                  {weekdays[day!.getDay()]}
                </Animated.Text>
              </Animated.View>

              {/* Content Morphing */}
              <Animated.View
                style={{
                  opacity: contentProgress,
                  transform: [
                    {
                      translateY: contentProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [12, 0],
                      }),
                    },
                  ],
                  paddingHorizontal: 12,
                  paddingTop: 14,
                  gap: 8,
                }}
              >
                {current.tasks.slice(0, 5).map((task) => (
                  <View
                    key={`${task.id}:${task.date}`}
                    style={{
                      minHeight: 36,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 7,
                        borderWidth: 1.5,
                        borderColor: '#D1D5DB',
                      }}
                    />
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        fontSize: 16,
                        fontWeight: '500',
                        color: task.isCompleted ? '#ADB3BD' : '#1F2937',
                      }}
                    >
                      {task.title}
                    </Text>
                  </View>
                ))}
              </Animated.View>
            </Animated.View>
          </View>
        )}
      </Modal>
    </CardTransitionContext.Provider>
  );
}

export function useCardTransition() {
  const value = useContext(CardTransitionContext);
  if (!value) throw new Error('CardTransitionProvider missing');
  return value;
}

const styles = StyleSheet.create({});
