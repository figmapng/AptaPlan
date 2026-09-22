import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
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
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const { t } = useI18n();
  const { settings, setPref } = usePlanner();
  const scrollRef = React.useRef<ScrollView>(null);

  // App icon state
  const [selectedIcon, setSelectedIcon] = useState<string>(settings.appIcon || 'default');

  const handleSelectTheme = (themeId: ThemeId) => {
    if (settings.haptics) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    void setPref('theme', themeId);
  };

  const handleSelectMode = (mode: 'light' | 'dark' | 'system') => {
    if (settings.haptics) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    void setThemeMode(mode);
  };

  const handleSelectIcon = (iconId: string) => {
    if (settings.haptics) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedIcon(iconId);
    void setPref('appIcon' as any, iconId);
  };

  const appIcons = [
    { id: 'default', label: t.settings.iconNames.default || 'Default', bg: '#0195FF', mark: '#FFFFFF' },
    { id: 'amber', label: t.settings.iconNames.amber || 'Amber', bg: '#F6C543', mark: '#FFFFFF' },
    { id: 'emerald', label: t.settings.iconNames.emerald || 'Emerald', bg: '#53B55A', mark: '#FFFFFF' },
    { id: 'dark', label: t.settings.iconNames.dark || 'Dark', bg: '#1C1C1E', mark: '#FFFFFF' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: t.settings.appearance,
        }}
      />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 36 },
        ]}
      >
        {/* ── Section 1: Акцент түсі (Accent Color) ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.settings.accentColor}</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.secondary }]}>
              {t.settings.accentColorSubtitle}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, paddingVertical: 14, paddingHorizontal: 10 }]}>
            <View style={styles.colorPaletteRow}>
              {THEME_LIST.map((th) => {
                const activeThemeId = THEME_LIST.some((t) => t.id === settings.theme) ? (settings.theme || 'ocean') : 'ocean';
                const isSelected = activeThemeId === th.id;
                const localizedName = t.settings.themeNames[th.id] || th.name;
                const isYellow = th.id === 'amber';
                const isBlack = th.id === 'minimal';
                const checkmarkColor = isYellow ? '#18181B' : '#FFFFFF';

                return (
                  <AnimatedPressable
                    key={th.id}
                    activeScale={0.88}
                    onPress={() => handleSelectTheme(th.id)}
                    style={styles.colorItem}
                    accessibilityRole="button"
                    accessibilityLabel={localizedName}
                  >
                    <View
                      style={[
                        styles.colorRing,
                        isSelected && {
                          borderColor: isBlack && isDark ? '#FFFFFF' : th.primary,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.colorDot,
                          { backgroundColor: th.primary },
                          isBlack && isDark && { borderColor: '#52525B', borderWidth: 1 },
                        ]}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={17} color={checkmarkColor} />
                        )}
                      </View>
                    </View>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Section 2: Режим (Mode: Light / Dark / System) ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
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
                {
                  backgroundColor: themeMode === 'light'
                    ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)')
                    : colors.card,
                  borderColor: themeMode === 'light' ? colors.today : colors.cardBorder,
                  borderWidth: themeMode === 'light' ? 2 : 1,
                },
              ]}
            >
              {/* Light Mockup Preview */}
              <View style={styles.modePreviewLight}>
                <View style={styles.modePreviewHeader}>
                  <View style={{ width: 18, height: 3.5, borderRadius: 2, backgroundColor: '#8E8E93' }} />
                  <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.today }} />
                </View>
                <View style={styles.modePreviewCardLight} />
                <View style={[styles.modePreviewCardLight, { width: '68%' }]} />
              </View>

              {/* Radio Indicator & Label */}
              <View style={styles.modeLabelRow}>
                <View
                  style={[
                    styles.modeRadio,
                    themeMode === 'light'
                      ? { backgroundColor: colors.today, borderColor: colors.today }
                      : { borderColor: colors.checkboxBorder },
                  ]}
                >
                  {themeMode === 'light' && (
                    <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                  )}
                </View>
                <Text
                  style={[
                    styles.modeLabel,
                    {
                      color: themeMode === 'light' ? colors.text : colors.secondary,
                      fontWeight: themeMode === 'light' ? '700' : '500',
                    },
                  ]}
                >
                  {t.settings.modeLight}
                </Text>
              </View>
            </AnimatedPressable>

            {/* Dark Mode */}
            <AnimatedPressable
              activeScale={0.96}
              onPress={() => handleSelectMode('dark')}
              style={[
                styles.modeCard,
                {
                  backgroundColor: themeMode === 'dark'
                    ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)')
                    : colors.card,
                  borderColor: themeMode === 'dark' ? colors.today : colors.cardBorder,
                  borderWidth: themeMode === 'dark' ? 2 : 1,
                },
              ]}
            >
              {/* Dark Mockup Preview */}
              <View style={styles.modePreviewDark}>
                <View style={styles.modePreviewHeader}>
                  <View style={{ width: 18, height: 3.5, borderRadius: 2, backgroundColor: '#8E8E93' }} />
                  <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.today }} />
                </View>
                <View style={styles.modePreviewCardDark} />
                <View style={[styles.modePreviewCardDark, { width: '68%' }]} />
              </View>

              {/* Radio Indicator & Label */}
              <View style={styles.modeLabelRow}>
                <View
                  style={[
                    styles.modeRadio,
                    themeMode === 'dark'
                      ? { backgroundColor: colors.today, borderColor: colors.today }
                      : { borderColor: colors.checkboxBorder },
                  ]}
                >
                  {themeMode === 'dark' && (
                    <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                  )}
                </View>
                <Text
                  style={[
                    styles.modeLabel,
                    {
                      color: themeMode === 'dark' ? colors.text : colors.secondary,
                      fontWeight: themeMode === 'dark' ? '700' : '500',
                    },
                  ]}
                >
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
                {
                  backgroundColor: themeMode === 'system'
                    ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)')
                    : colors.card,
                  borderColor: themeMode === 'system' ? colors.today : colors.cardBorder,
                  borderWidth: themeMode === 'system' ? 2 : 1,
                },
              ]}
            >
              {/* System Split Mockup Preview */}
              <View style={[styles.modePreviewSystem, { borderColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                <View style={styles.modePreviewSystemLeft}>
                  <View style={{ width: 12, height: 3, borderRadius: 1.5, backgroundColor: '#8E8E93', marginBottom: 5 }} />
                  <View style={{ width: '85%', height: 12, borderRadius: 3, backgroundColor: '#F2F2F7' }} />
                </View>
                <View style={styles.modePreviewSystemRight}>
                  <View style={{ width: 12, height: 3, borderRadius: 1.5, backgroundColor: '#8E8E93', marginBottom: 5 }} />
                  <View style={{ width: '85%', height: 12, borderRadius: 3, backgroundColor: '#2C2C2E' }} />
                </View>
              </View>

              {/* Radio Indicator & Label */}
              <View style={styles.modeLabelRow}>
                <View
                  style={[
                    styles.modeRadio,
                    themeMode === 'system'
                      ? { backgroundColor: colors.today, borderColor: colors.today }
                      : { borderColor: colors.checkboxBorder },
                  ]}
                >
                  {themeMode === 'system' && (
                    <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                  )}
                </View>
                <Text
                  style={[
                    styles.modeLabel,
                    {
                      color: themeMode === 'system' ? colors.text : colors.secondary,
                      fontWeight: themeMode === 'system' ? '700' : '500',
                    },
                  ]}
                >
                  {t.settings.modeSystem}
                </Text>
              </View>
            </AnimatedPressable>
          </View>
        </View>

        {/* ── Section 3: Қолданба белгішесі (App Icon) ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.settings.appIcon}</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.secondary }]}>
              {t.settings.appIconSubtitle}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, paddingVertical: 18, paddingHorizontal: 16 }]}>
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
                        isSelected && { borderWidth: 2.5, borderColor: colors.today },
                        ico.id === 'dark' && { borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.18)' : '#2C2C2E' },
                      ]}
                    >
                      <Ionicons name="calendar" size={24} color={ico.mark} />
                      {isSelected && (
                        <View style={[styles.iconCheckmarkBadge, { backgroundColor: colors.today, borderColor: colors.card }]}>
                          <Ionicons name="checkmark" size={11} color="#FFFFFF" />
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
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  section: {
    marginBottom: 26,
  },
  sectionHeaderContainer: {
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  card: {
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 1,
    padding: 16,
  },
  colorPaletteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  colorItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeCard: {
    flex: 1,
    borderRadius: 18,
    borderCurve: 'continuous',
    padding: 10,
    alignItems: 'center',
    gap: 10,
  },
  modePreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modePreviewLight: {
    width: '100%',
    height: 62,
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: 7,
    gap: 5,
  },
  modePreviewCardLight: {
    width: '100%',
    height: 12,
    borderRadius: 3.5,
    backgroundColor: '#F2F2F7',
  },
  modePreviewDark: {
    width: '100%',
    height: 62,
    backgroundColor: '#1C1C1E',
    borderRadius: 11,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    padding: 7,
    gap: 5,
  },
  modePreviewCardDark: {
    width: '100%',
    height: 12,
    borderRadius: 3.5,
    backgroundColor: '#2C2C2E',
  },
  modePreviewSystem: {
    width: '100%',
    height: 62,
    borderRadius: 11,
    borderCurve: 'continuous',
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  modePreviewSystemLeft: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 7,
  },
  modePreviewSystemRight: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    padding: 7,
  },
  modeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeLabel: {
    fontSize: 12.5,
  },
  iconGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconGridItem: {
    width: '23%',
    alignItems: 'center',
    gap: 7,
  },
  appIconMockup: {
    width: 52,
    height: 52,
    borderRadius: 13,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 3,
  },
  iconCheckmarkBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 19,
    height: 19,
    borderRadius: 9.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  iconItemLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
});
