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
import { AnimatedPressable } from '@/components/AnimatedPressable';

export default function AppearanceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, themeMode, setThemeMode } = useTheme();
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
          accessibilityLabel="Артқа қайту"
        >
          <Ionicons name="chevron-back" size={20} color={colors.secondary} style={{ marginLeft: -1 }} />
        </AnimatedPressable>

        <Text style={[styles.headerTitle, { color: colors.text }]}>Сыртқы түрі</Text>

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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Акцент түсі</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.secondary }]}>
            Қосымшаның негізгі түс тақырыбы
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
              return (
                <AnimatedPressable
                  key={th.id}
                  activeScale={0.92}
                  onPress={() => handleSelectTheme(th.id)}
                  style={styles.themeCarouselItem}
                  accessibilityRole="button"
                  accessibilityLabel={th.name + ' түсі'}
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Режим</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.secondary }]}>
            Интерфейстің жарық немесе қараңғы көрінісі
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
              Жарық
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
                Қараңғы
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
              Жүйелік
            </Text>
          </AnimatedPressable>
        </View>

        {/* ── Section 3: Қосымша белгішесі (App Icon) ── */}
        <View style={[styles.sectionHeaderContainer, { marginTop: 24 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Қосымша белгішесі</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.secondary }]}>
            Басты экрандағы иконка стилі
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <View style={styles.iconGrid}>
            {[
              { id: 'default', label: 'Әдепкі', bg: '#01B7FF', mark: '#FFFFFF' },
              { id: 'amber', label: 'Кәріптас', bg: '#FFAA01', mark: '#FFFFFF' },
              { id: 'emerald', label: 'Изумруд', bg: '#10B981', mark: '#FFFFFF' },
              { id: 'dark', label: 'Қараңғы', bg: '#1E293B', mark: '#01B7FF' },
            ].map((ico) => {
              const isSelected = selectedIcon === ico.id;
              return (
                <AnimatedPressable
                  key={ico.id}
                  activeScale={0.92}
                  onPress={() => handleSelectIcon(ico.id)}
                  style={styles.iconGridItem}
                  accessibilityRole="button"
                  accessibilityLabel={ico.label + ' иконкасы'}
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
});
