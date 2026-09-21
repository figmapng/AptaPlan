import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors as defaultColors } from '@/constants/colors';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/use-i18n';
import { AnimatedPressable } from '@/components/AnimatedPressable';

interface UserGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

export function UserGuideModal({ visible, onClose }: UserGuideModalProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const { colors } = useTheme();
  const { t } = useI18n();

  const icons = [
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" key="0">
      <Rect x="3" y="4" width="18" height="17" rx="4" stroke={colors.today} strokeWidth="2" />
      <Path d="M3 9h18M8 2v4M16 2v4" stroke={colors.today} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="8" cy="13" r="1.5" fill={colors.today} />
      <Circle cx="12" cy="13" r="1.5" fill={colors.today} />
      <Circle cx="16" cy="13" r="1.5" fill={colors.today} />
      <Circle cx="8" cy="17" r="1.5" fill={colors.today} />
      <Circle cx="12" cy="17" r="1.5" fill={colors.today} />
    </Svg>,
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" key="1">
      <Rect x="4" y="3" width="16" height="18" rx="4" stroke={colors.today} strokeWidth="2" />
      <Path d="M8 8h8M8 12h5" stroke={colors.today} strokeWidth="2" strokeLinecap="round" />
      <Path d="M12 16l-2-2m2 2l2-2" stroke={colors.today} strokeWidth="2" strokeLinecap="round" />
    </Svg>,
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" key="2">
      <Rect x="4" y="4" width="16" height="16" rx="4" fill={colors.today} fillOpacity="0.12" stroke={colors.today} strokeWidth="2" />
      <Path d="M8 12l2.5 2.5L16 9" stroke={colors.today} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>,
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" key="3">
      <Circle cx="12" cy="12" r="9" stroke={colors.today} strokeWidth="2" />
      <Path d="M9 14L5 10l4-4" stroke={colors.today} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 10h9a4 4 0 0 1 4 4v1" stroke={colors.today} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>,
  ];

  const slides = t.userGuide.slides.map((s, i) => ({
    ...s,
    icon: icons[i] || icons[0],
  }));

  const handleNext = () => {
    if (activeIndex < slides.length - 1) {
      setActiveIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  if (!visible) return null;

  const currentSlide = slides[activeIndex];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.modalOverlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          {/* Header Bar */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t.userGuide.title}</Text>
            <AnimatedPressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.inputBg }]}>
              <Text style={[styles.closeText, { color: colors.secondary }]}>✕</Text>
            </AnimatedPressable>
          </View>

          {/* Slide Content */}
          <View style={styles.slideCard}>
            <View style={[styles.iconContainer, { backgroundColor: colors.tintBg }]}>{currentSlide.icon}</View>
            <Text style={[styles.slideTitle, { color: colors.text }]}>{currentSlide.title}</Text>
            <Text style={[styles.slideSubtitle, { color: colors.today }]}>{currentSlide.subtitle}</Text>
            <Text style={[styles.slideDescription, { color: colors.secondary }]}>{currentSlide.description}</Text>
          </View>

          {/* Pagination Indicators */}
          <View style={styles.pagination}>
            {slides.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx === activeIndex
                    ? [styles.activeDot, { backgroundColor: colors.today }]
                    : [styles.inactiveDot, { backgroundColor: colors.inputBorder }],
                ]}
              />
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            {activeIndex < slides.length - 1 ? (
              <Pressable onPress={onClose} style={styles.skipBtn}>
                <Text style={[styles.skipText, { color: colors.secondary }]}>{t.userGuide.skip}</Text>
              </Pressable>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            <AnimatedPressable
              onPress={handleNext}
              style={[styles.nextBtn, { backgroundColor: colors.today }]}
            >
              <Text style={styles.nextText}>
                {activeIndex === slides.length - 1 ? t.userGuide.finish : t.userGuide.next}
              </Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: defaultColors.card,
    borderRadius: 24,
    padding: 24,
    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.2)',
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: defaultColors.text,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F3F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    color: defaultColors.secondary,
    fontWeight: '600',
  },
  slideCard: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  slideTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: defaultColors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  slideSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: defaultColors.today,
    textAlign: 'center',
    marginBottom: 12,
  },
  slideDescription: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    color: defaultColors.secondary,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 24,
    backgroundColor: defaultColors.today,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: '#E2E8F0',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: defaultColors.secondary,
  },
  nextBtn: {
    backgroundColor: defaultColors.today,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 16,
  },
  nextText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
});
