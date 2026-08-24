import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { THEME_LIST } from '@/constants/themes';
import { type ThemeId } from '@/types/settings';
import { usePlanner } from '@/store/planner-store';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/use-i18n';
import { AnimatedPressable } from '@/components/AnimatedPressable';

export default function AppearanceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const { t } = useI18n();
  const { settings, setPref } = usePlanner();

  // App icon state (ready for future expansion)
  const [selectedIcon, setSelectedIcon] = useState<string>(settings.appIcon || 'default');

  const handleSelectTheme = (themeId: ThemeId) => {
    if (settings.haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    void setPref('theme', themeId);
  };

  const handleSelectMode = (mode: 'light' | 'dark' | 'system') => {
    if (settings.haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    void setThemeMode(mode);
  };

  const handleSelectIcon = (iconId: string) => {
    if (settings.haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedIcon(iconId);
    void setPref('appIcon' as any, iconId);
  };

  const handleSelectMonthPickerStyle = (style: 'circular' | 'grid') => {
    if (settings.haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    void setPref('monthPickerStyle', style);
  };

  const appIcons = [
    { id: 'default', label: t.settings.iconNames.default || 'Default', bg: '#01B7FF', mark: '#FFFFFF' },
    { id: 'amber', label: t.settings.iconNames.amber || 'Amber', bg: '#FFAA01', mark: '#FFFFFF' },
    { id: 'emerald', label: t.settings.iconNames.emerald || 'Emerald', bg: '#10B981', mark: '#FFFFFF' },
    { id: 'dark', label: t.settings.iconNames.dark || 'Dark', bg: '#1E293B', mark: '#01B7FF' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <AnimatedPressable
          activeScale={0.85}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/settings');
            }
          }}
          style={[styles.backButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
          accessibilityLabel={t.common.back}
        >
          <Ionicons name="chevron-back" size={20} color={colors.secondary} style={{ marginLeft: -1 }} />
        </AnimatedPressable>

        <Text style={[styles.headerTitle, { color: colors.text }]}>{t.settings.appearance}</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        {/* ── Section 1: Акцент түсі (Accent Color) ── */}
        <View style={styles.sectionHeaderContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.settings.accentColor}</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.secondary }]}>
            {t.settings.accentColorSubtitle}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, paddingHorizontal: 0, paddingVertical: 12 }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.themeCarousel}
          >
            {THEME_LIST.map((th) => {
              const isSelected = (settings.theme || 'ocean') === th.id;
              const localizedName = t.settings.themeNames[th.id] || th.name;
              return (
                <AnimatedPressable
                  key={th.id}
                  activeScale={0.92}
                  onPress={() => handleSelectTheme(th.id)}
                  style={styles.themeCarouselItem}
                  accessibilityRole="button"
                  accessibilityLabel={localizedName}
                >
                  <View
                    style={[
                      styles.themeBubbleOuter,
                      isSelected && {
                        borderColor: th.primary,
                        backgroundColor: '#FFFFFF',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.themeBubble,
                        { backgroundColor: th.primary },
                      ]}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                      )}
                    </View>
                  </View>
                </AnimatedPressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Section 2: Режим (Mode: Light / Dark / System) ── */}
        <View style={[styles.sectionHeaderContainer, { marginTop: 24 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.settings.themeMode}</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.secondary }]}>
            {t.settings.themeModeSubtitle}
          </Text>
        </View>

        <View style={styles.modeRow}>
          {/* Light Mode */}
          <AnimatedPressable
            activeScale={0.96}
            onPress={() => handleSelectMode('light')}
            style={[
              styles.modeCard,
              { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
              themeMode === 'light' && { borderColor: colors.today, borderWidth: 2 },
            ]}
          >
            {/* Light Mockup Preview */}
            <View style={styles.modePreviewLight}>
              <View style={styles.modePreviewHeaderLight}>
                <View style={{ width: 14, height: 3, borderRadius: 1.5, backgroundColor: '#CBD5E1' }} />
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.today }} />
              </View>
              <View style={styles.modePreviewCardLight} />
              <View style={[styles.modePreviewCardLight, { width: '70%' }]} />
            </View>
            <Text style={[styles.modeLabel, { color: colors.text }, themeMode === 'light' && { fontWeight: '700', color: colors.today }]}>
              {t.settings.modeLight}
            </Text>
          </AnimatedPressable>

          {/* Dark Mode */}
          <AnimatedPressable
            activeScale={0.96}
            onPress={() => handleSelectMode('dark')}
            style={[
              styles.modeCard,
              { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
              themeMode === 'dark' && { borderColor: colors.today, borderWidth: 2 },
            ]}
          >
            {/* Dark Mockup Preview */}
            <View style={styles.modePreviewDark}>
              <View style={styles.modePreviewHeaderDark}>
                <View style={{ width: 14, height: 3, borderRadius: 1.5, backgroundColor: '#475569' }} />
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.today }} />
              </View>
              <View style={styles.modePreviewCardDark} />
              <View style={[styles.modePreviewCardDark, { width: '70%' }]} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.modeLabel, { color: colors.text }, themeMode === 'dark' && { fontWeight: '700', color: colors.today }]}>
                {t.settings.modeDark}
              </Text>
            </View>
          </AnimatedPressable>

          {/* System Mode */}
          <AnimatedPressable
            activeScale={0.96}
            onPress={() => handleSelectMode('system')}
            style={[
              styles.modeCard,
              { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
              themeMode === 'system' && { borderColor: colors.today, borderWidth: 2 },
            ]}
          >
            {/* System Split Mockup Preview */}
            <View style={styles.modePreviewSystem}>
              <View style={styles.modePreviewSystemLeft}>
                <View style={{ width: 6, height: 3, borderRadius: 1.5, backgroundColor: '#CBD5E1', marginBottom: 4 }} />
                <View style={{ width: '80%', height: 10, borderRadius: 2, backgroundColor: '#FFFFFF', borderWidth: 0.5, borderColor: '#E2E8F0' }} />
              </View>
              <View style={styles.modePreviewSystemRight}>
                <View style={{ width: 6, height: 3, borderRadius: 1.5, backgroundColor: '#475569', marginBottom: 4 }} />
                <View style={{ width: '80%', height: 10, borderRadius: 2, backgroundColor: '#334155' }} />
              </View>
            </View>
            <Text style={[styles.modeLabel, { color: colors.text }, themeMode === 'system' && { fontWeight: '700', color: colors.today }]}>
              {t.settings.modeSystem}
            </Text>
          </AnimatedPressable>
        </View>

        {/* ── Section 3: Айды таңдау көрінісі (Month Picker Style) ── */}
        <View style={[styles.sectionHeaderContainer, { marginTop: 24 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.settings.monthPickerStyle}</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.secondary }]}>
            {t.settings.monthPickerStyleSubtitle}
          </Text>
        </View>

        <View style={styles.monthPickerStyleRow}>
          {/* Circular (Year Cycle) */}
          <AnimatedPressable
            activeScale={0.96}
            onPress={() => handleSelectMonthPickerStyle('circular')}
            style={[
              styles.pickerStyleCard,
              { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
              (settings.monthPickerStyle || 'circular') === 'circular' && { borderColor: colors.today, borderWidth: 2 },
            ]}
          >
            <View style={styles.circularMockupContainer}>
              <View style={[styles.circularMockupTrack, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }]}>
                {/* 4 Quadrant Season Color Bars */}
                <View style={[styles.seasonQuadrant, { top: 0, left: 10, right: 10, height: 6, backgroundColor: isDark ? '#2E2215' : '#FEF9C3' }]} />
                <View style={[styles.seasonQuadrant, { right: 0, top: 10, bottom: 10, width: 6, backgroundColor: isDark ? '#142E1F' : '#DCFCE7' }]} />
                <View style={[styles.seasonQuadrant, { bottom: 0, left: 10, right: 10, height: 6, backgroundColor: isDark ? '#182438' : '#DBEAFE' }]} />
                <View style={[styles.seasonQuadrant, { left: 0, top: 10, bottom: 10, width: 6, backgroundColor: isDark ? '#2B1E17' : '#FFEDD5' }]} />
                {/* Selected month highlight pill */}
                <View style={[styles.mockupSelectedPill, { backgroundColor: colors.today }]} />
                {/* Center Badge */}
                <View style={[styles.mockupCenterBadge, { backgroundColor: colors.sheetBg }]}>
                  <View style={{ width: 14, height: 3, borderRadius: 1.5, backgroundColor: colors.today }} />
                </View>
              </View>
            </View>
            <Text
              style={[
                styles.pickerStyleLabel,
                { color: colors.text },
                (settings.monthPickerStyle || 'circular') === 'circular' && { fontWeight: '700', color: colors.today },
              ]}
            >
              {t.settings.monthPickerStyles.circular}
            </Text>
          </AnimatedPressable>

          {/* Grid (12 Months) */}
          <AnimatedPressable
            activeScale={0.96}
            onPress={() => handleSelectMonthPickerStyle('grid')}
            style={[
              styles.pickerStyleCard,
              { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
              settings.monthPickerStyle === 'grid' && { borderColor: colors.today, borderWidth: 2 },
            ]}
          >
            <View style={styles.gridMockupContainer}>
              <View style={styles.gridMockupMatrix}>
                {[...Array(12)].map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.gridMockupCell,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                      i === 4 && { backgroundColor: colors.today },
                    ]}
                  />
                ))}
              </View>
            </View>
            <Text
              style={[
                styles.pickerStyleLabel,
                { color: colors.text },
                settings.monthPickerStyle === 'grid' && { fontWeight: '700', color: colors.today },
              ]}
            >
              {t.settings.monthPickerStyles.grid}
            </Text>
          </AnimatedPressable>
        </View>

        {/* ── Section 4: Қосымша белгішесі (App Icon) ── */}
        <View style={[styles.sectionHeaderContainer, { marginTop: 24 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.settings.appIcon}</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.secondary }]}>
            {t.settings.appIconSubtitle}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <View style={styles.iconGrid}>
            {appIcons.map((ico) => {
              const isSelected = selectedIcon === ico.id;
              return (
                <AnimatedPressable
                  key={ico.id}
                  activeScale={0.92}
                  onPress={() => handleSelectIcon(ico.id)}
                  style={styles.iconGridItem}
                  accessibilityRole="button"
                  accessibilityLabel={ico.label}
                >
                  <View
                    style={[
                      styles.appIconMockup,
                      { backgroundColor: ico.bg },
                      isSelected && { borderWidth: 2, borderColor: colors.today },
                    ]}
                  >
                    <Ionicons name="calendar" size={24} color={ico.mark} />
                    {isSelected && (
                      <View style={[styles.iconCheckmarkBadge, { backgroundColor: colors.today }]}>
                        <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.iconItemLabel,
                      {
                        color: isSelected ? colors.text : colors.secondary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {ico.label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 38,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionHeaderContainer: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  themeCarousel: {
    paddingHorizontal: 16,
    gap: 12,
    alignItems: 'center',
  },
  themeCarouselItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeBubbleOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 3,
    elevation: 2,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
    gap: 8,
  },
  modePreviewLight: {
    width: '100%',
    height: 58,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 6,
    gap: 4,
  },
  modePreviewHeaderLight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  modePreviewCardLight: {
    width: '100%',
    height: 12,
    borderRadius: 3,
    backgroundColor: '#F1F5F9',
  },
  modePreviewDark: {
    width: '100%',
    height: 58,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 6,
    gap: 4,
  },
  modePreviewHeaderDark: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  modePreviewCardDark: {
    width: '100%',
    height: 12,
    borderRadius: 3,
    backgroundColor: '#334155',
  },
  modePreviewSystem: {
    width: '100%',
    height: 58,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  modePreviewSystemLeft: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 6,
  },
  modePreviewSystemRight: {
    flex: 1,
    backgroundColor: '#1E293B',
    padding: 6,
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  iconGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconGridItem: {
    width: '22%',
    alignItems: 'center',
    gap: 6,
  },
  appIconMockup: {
    width: 52,
    height: 52,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  iconCheckmarkBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  iconItemLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  monthPickerStyleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerStyleCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
    gap: 8,
  },
  circularMockupContainer: {
    width: '100%',
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularMockupTrack: {
    width: 68,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  seasonQuadrant: {
    position: 'absolute',
    borderRadius: 3,
  },
  mockupSelectedPill: {
    position: 'absolute',
    top: 2,
    right: 6,
    width: 14,
    height: 12,
    borderRadius: 6,
  },
  mockupCenterBadge: {
    width: 32,
    height: 22,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pickerStyleLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  gridMockupContainer: {
    width: '100%',
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridMockupMatrix: {
    width: 72,
    height: 52,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  gridMockupCell: {
    width: '30%',
    height: 10,
    borderRadius: 2.5,
  },
});
