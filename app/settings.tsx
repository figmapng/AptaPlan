import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';

import { colors } from '@/constants/colors';
import { THEMES, THEME_LIST, type ThemeConfig } from '@/constants/themes';
import { type Language, type ThemeId } from '@/types/settings';
import { usePlanner } from '@/store/planner-store';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/use-i18n';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { UserGuideModal } from '@/components/UserGuideModal';
import { getDatabase } from '@/database/database';
import { exportBackup, importBackup } from '@/services/backup-service';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, themeConfig, colors, setTheme } = useTheme();
  const { language, setLanguage, t } = useI18n();
  const {
    settings,
    setPref,
    clearAll,
    refresh,
  } = usePlanner();

  // Modals for selection settings
  const [guideOpen, setGuideOpen] = useState(false);
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [placementModalOpen, setPlacementModalOpen] = useState(false);
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [firstDayModalOpen, setFirstDayModalOpen] = useState(false);
  const [lastDayModalOpen, setLastDayModalOpen] = useState(false);
  const [defaultViewModeModalOpen, setDefaultViewModeModalOpen] = useState(false);
  const [monthPickerStyleModalOpen, setMonthPickerStyleModalOpen] = useState(false);

  const clear = () =>
    Alert.alert(
      t.settings.clearAllConfirmTitle,
      t.settings.clearAllConfirmDesc,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.continue,
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              t.settings.clearAllFinalTitle,
              t.settings.clearAllFinalDesc,
              [
                { text: t.common.cancel, style: 'cancel' },
                { text: t.settings.clearAllButton, style: 'destructive', onPress: () => void clearAll() },
              ]
            ),
        },
      ]
    );

  const handleExport = async () => {
    const db = await getDatabase();
    await exportBackup(db, language);
  };

  const handleImport = async () => {
    const db = await getDatabase();
    await importBackup(db, refresh, language);
  };

  const themeDisplayName = t.settings.themeNames[theme] || themeConfig.name;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* iOS-style Navigation Bar */}
      <View style={styles.header}>
        <AnimatedPressable
          activeScale={0.85}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }}
          style={[styles.backButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
          accessibilityLabel={t.common.back}
        >
          <Ionicons name="chevron-back" size={20} color={colors.secondary} style={{ marginLeft: -1 }} />
        </AnimatedPressable>

        <Text style={[styles.headerTitle, { color: colors.text }]}>{t.settings.title}</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        {/* Бөлім 1: Жекелендіру және тіл */}
        <Section>
          <SettingRow
            icon="globe-outline"
            label={t.settings.language}
            valueText={t.settings.languages[language]}
            onPress={() => setLanguageModalOpen(true)}
          />
          <Divider />
          <SettingRow
            icon="color-palette-outline"
            label={t.settings.appearance}
            valueText={themeDisplayName}
            rightElement={
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: themeConfig.primary,
                  borderWidth: 1.5,
                  borderColor: 'rgba(0,0,0,0.06)',
                }}
              />
            }
            onPress={() => router.push('/appearance' as any)}
          />
        </Section>

        {/* Бөлім 2: Күнтізбе және көрініс */}
        <Section>
          <SettingRow
            icon="options-outline"
            label={t.settings.defaultViewMode}
            valueText={
              settings.defaultViewMode === 'month'
                ? t.viewModes.month
                : settings.defaultViewMode === 'year'
                ? t.viewModes.year
                : t.viewModes.week
            }
            onPress={() => setDefaultViewModeModalOpen(true)}
          />
          <Divider />
          <SettingRow
            icon="calendar-outline"
            label={t.settings.firstDayOfWeek}
            valueText={
              settings.firstDayOfWeek === 'sat'
                ? t.settings.saturday
                : settings.firstDayOfWeek === 'sun'
                ? t.settings.sunday
                : t.settings.monday
            }
            onPress={() => setFirstDayModalOpen(true)}
          />
          <Divider />
          <SettingRow
            icon="eye-outline"
            label={t.settings.lastDayVisibility}
            valueText={
              settings.lastDayVisibility === 'hidden'
                ? t.settings.lastDayHidden
                : t.settings.lastDayVisible
            }
            onPress={() => setLastDayModalOpen(true)}
          />
          <Divider />
          <SettingRow
            icon="grid-outline"
            label={t.settings.monthPickerStyle}
            valueText={
              t.settings.monthPickerStyles[settings.monthPickerStyle || 'circular']
            }
            onPress={() => setMonthPickerStyleModalOpen(true)}
          />
        </Section>

        {/* Бөлім 3: Тапсырмалар */}
        <Section>
          <SettingRow
            icon="layers-outline"
            label={t.settings.completedPlacement}
            valueText={
              settings.completedPlacement === 'keep' ? t.settings.completedPlacementKeep : t.settings.completedPlacementBottom
            }
            onPress={() => setPlacementModalOpen(true)}
          />
          <Divider />
          <SettingRow
            icon="swap-vertical-outline"
            label={t.settings.sortMode}
            valueText={
              settings.sortMode === 'time' ? t.settings.sortModeTime : t.settings.sortModeManual
            }
            onPress={() => setSortModalOpen(true)}
          />
        </Section>

        {/* Бөлім 4: Интеграция және жүйе */}
        <Section>
          <SettingRow
            icon="extension-puzzle-outline"
            label={t.settings.integrations}
            valueText={
              Platform.OS === 'ios'
                ? settings.syncAppleReminders
                  ? 'Apple Reminders'
                  : t.common.close
                : t.integrations.googleCalendar
            }
            onPress={() => router.push('/integrations' as any)}
          />
          <Divider />
          <SettingRow
            icon="pulse-outline"
            label={t.settings.haptics}
            rightElement={
              <Switch
                value={settings.haptics}
                onValueChange={(v) => void setPref('haptics', v)}
                trackColor={{ false: '#E2E5EB', true: colors.today }}
                thumbColor="#FFFFFF"
              />
            }
          />
        </Section>

        {/* Бөлім 5: Деректер мен сақтық көшірме */}
        <Section>
          <SettingRow
            icon="cloud-upload-outline"
            label={t.settings.exportBackup}
            onPress={() => void handleExport()}
          />
          <Divider />
          <SettingRow
            icon="cloud-download-outline"
            label={t.settings.importBackup}
            onPress={() => void handleImport()}
          />
          <Divider />
          <SettingRow
            icon="trash-outline"
            iconColor="#FF4B3E"
            label={t.settings.clearAllData}
            labelStyle={{ color: '#FF4B3E', fontWeight: '600' }}
            onPress={clear}
          />
        </Section>

        {/* Centered App Version at the very bottom */}
        <View style={styles.footerVersion}>
          <Text style={styles.footerVersionText}>
            AptaPlan v{Constants.expoConfig?.version ?? '1.0.0'}
          </Text>
        </View>
      </ScrollView>

      {/* User Guide Modal */}
      <UserGuideModal visible={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* Language Modal */}
      <OptionModal
        visible={languageModalOpen}
        title={t.settings.languageModalTitle}
        onClose={() => setLanguageModalOpen(false)}
        options={[
          {
            label: 'Қазақша',
            selected: language === 'kk',
            onSelect: () => {
              void setLanguage('kk');
              setLanguageModalOpen(false);
            },
          },
          {
            label: 'Русский',
            selected: language === 'ru',
            onSelect: () => {
              void setLanguage('ru');
              setLanguageModalOpen(false);
            },
          },
          {
            label: 'English',
            selected: language === 'en',
            onSelect: () => {
              void setLanguage('en');
              setLanguageModalOpen(false);
            },
          },
        ]}
      />

      {/* Visual Default View Mode Modal */}
      <DefaultViewModeModal
        visible={defaultViewModeModalOpen}
        currentMode={(settings.defaultViewMode as any) || 'week'}
        onClose={() => setDefaultViewModeModalOpen(false)}
        onSelectMode={(mode) => void setPref('defaultViewMode', mode)}
      />

      {/* First Day Modal */}
      <OptionModal
        visible={firstDayModalOpen}
        title={t.settings.firstDayOfWeek}
        onClose={() => setFirstDayModalOpen(false)}
        options={[
          {
            label: t.settings.monday,
            selected: !settings.firstDayOfWeek || settings.firstDayOfWeek === 'mon',
            onSelect: () => {
              void setPref('firstDayOfWeek', 'mon');
              setFirstDayModalOpen(false);
            },
          },
          {
            label: t.settings.saturday,
            selected: settings.firstDayOfWeek === 'sat',
            onSelect: () => {
              void setPref('firstDayOfWeek', 'sat');
              setFirstDayModalOpen(false);
            },
          },
          {
            label: t.settings.sunday,
            selected: settings.firstDayOfWeek === 'sun',
            onSelect: () => {
              void setPref('firstDayOfWeek', 'sun');
              setFirstDayModalOpen(false);
            },
          },
        ]}
      />

      {/* Visual Month Picker Style Modal */}
      <MonthPickerStyleModal
        visible={monthPickerStyleModalOpen}
        currentValue={settings.monthPickerStyle || 'circular'}
        onClose={() => setMonthPickerStyleModalOpen(false)}
        onSelectValue={(val) => void setPref('monthPickerStyle', val)}
      />

      {/* Visual Last Day Visibility Modal */}
      <LastDayVisibilityModal
        visible={lastDayModalOpen}
        currentValue={settings.lastDayVisibility || 'visible'}
        onClose={() => setLastDayModalOpen(false)}
        onSelectValue={(val) => void setPref('lastDayVisibility', val)}
      />

      {/* Completed Placement Modal */}
      <OptionModal
        visible={placementModalOpen}
        title={t.settings.completedPlacement}
        onClose={() => setPlacementModalOpen(false)}
        options={[
          {
            label: t.settings.completedPlacementKeep,
            selected: settings.completedPlacement === 'keep',
            onSelect: () => {
              void setPref('completedPlacement', 'keep');
              setPlacementModalOpen(false);
            },
          },
          {
            label: t.settings.completedPlacementBottom,
            selected: settings.completedPlacement === 'bottom',
            onSelect: () => {
              void setPref('completedPlacement', 'bottom');
              setPlacementModalOpen(false);
            },
          },
        ]}
      />

      {/* Sort Mode Modal */}
      <OptionModal
        visible={sortModalOpen}
        title={t.settings.sortMode}
        onClose={() => setSortModalOpen(false)}
        options={[
          {
            label: t.settings.sortModeTime,
            selected: settings.sortMode === 'time',
            onSelect: () => {
              void setPref('sortMode', 'time');
              setSortModalOpen(false);
            },
          },
          {
            label: t.settings.sortModeManual,
            selected: settings.sortMode === 'manual',
            onSelect: () => {
              void setPref('sortMode', 'manual');
              setSortModalOpen(false);
            },
          },
        ]}
      />
    </View>
  );
}

// Subcomponents

function Section({
  children,
}: {
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
      {children}
    </View>
  );
}

function SettingRow({
  icon,
  iconColor,
  customIcon,
  label,
  labelStyle,
  valueText,
  rightElement,
  onPress,
}: {
  icon?: string;
  iconColor?: string;
  customIcon?: React.ReactNode;
  label: string;
  labelStyle?: object;
  valueText?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const effectiveIconColor = iconColor || colors.text;
  const content = (
    <View style={styles.rowInner}>
      <View style={styles.iconBox}>
        {customIcon ? (
          customIcon
        ) : icon ? (
          <Ionicons name={icon as any} size={21} color={effectiveIconColor} />
        ) : null}
      </View>
      <Text style={[styles.rowLabel, { color: colors.text }, labelStyle]}>
        {label}
      </Text>
      <View style={styles.rowRight}>
        {valueText ? (
          <Text style={[styles.valueText, { color: colors.secondary }]} numberOfLines={1}>
            {valueText}
          </Text>
        ) : null}
        {rightElement}
        {onPress ? (
          <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <AnimatedPressable activeScale={0.98} onPress={onPress} style={styles.rowPressable}>
        {content}
      </AnimatedPressable>
    );
  }

  return <View style={styles.rowPressable}>{content}</View>;
}

function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.inputBorder }]} />;
}

function OptionModal({
  visible,
  title,
  onClose,
  options,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  options: { label: string; sublabel?: string; selected: boolean; onSelect: () => void }[];
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      const idx = options.findIndex((o) => o.selected);
      setSelectedIdx(idx >= 0 ? idx : 0);
    } else {
      setSelectedIdx(null);
    }
  }, [visible, options]);

  const activeIndex = options.findIndex((o) => o.selected);
  const currentIdx = selectedIdx !== null ? selectedIdx : activeIndex >= 0 ? activeIndex : 0;

  const handleClose = () => {
    setSelectedIdx(null);
    onClose();
  };

  const handleConfirm = () => {
    if (options[currentIdx]) {
      options[currentIdx].onSelect();
    }
    handleClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={[styles.modalContentCard, { backgroundColor: colors.inputBg }]}>
          {/* Header with Title and Close X button */}
          <View style={styles.modalHeaderRow}>
            <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>{title}</Text>
            <Pressable onPress={handleClose} style={styles.closeButton} hitSlop={8}>
              <Ionicons name="close" size={18} color={colors.secondary} />
            </Pressable>
          </View>

          {/* Options List with Radio buttons */}
          <View style={styles.optionsList}>
            {options.map((opt, i) => {
              const isChecked = i === currentIdx;
              return (
                <Pressable
                  key={i}
                  style={styles.optionRowItem}
                  onPress={() => setSelectedIdx(i)}
                >
                  <View style={styles.optionRowLeft}>
                    <Text style={[styles.optionRowTitle, { color: colors.text }, isChecked && { fontWeight: '700' }]}>
                      {opt.label}
                    </Text>
                  </View>
                  <View style={[
                    styles.radioButton,
                    { borderColor: colors.cardBorder },
                    isChecked && { borderColor: colors.today },
                  ]}>
                    {isChecked && <View style={[styles.radioButtonInner, { backgroundColor: colors.today }]} />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Bottom Action Button */}
          <Pressable style={[styles.modalContinueButton, { backgroundColor: colors.today }]} onPress={handleConfirm}>
            <Text style={styles.modalContinueButtonText}>{t.common.confirm}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function WeekLayoutPreview() {
  return (
    <View style={styles.phonePreviewBox}>
      {/* Top Header: Left title + right mode pill */}
      <View style={styles.previewHeaderRow}>
        <View>
          <View style={styles.previewWeekTitleBadge} />
          <View style={styles.previewWeekSubTitleBadge} />
        </View>
        <View style={styles.previewModePillBadge} />
      </View>

      {/* 2-column day cards (3 + 3 = exactly 6 days) */}
      <View style={[styles.previewGridRow, { flex: 1, marginTop: 3, gap: 2.5 }]}>
        {/* Left column */}
        <View style={styles.previewCardCol}>
          {/* Card 1: Mon */}
          <View style={styles.previewDayCardRealistic}>
            <View style={styles.previewDayCardHeader} />
          </View>
          {/* Card 2: Tue (Today - Active Cyan) */}
          <View style={[styles.previewDayCardRealistic, styles.previewDayCardToday]}>
            <View style={styles.previewDayCardHeaderToday} />
          </View>
          {/* Card 3: Wed */}
          <View style={styles.previewDayCardRealistic}>
            <View style={styles.previewDayCardHeader} />
          </View>
        </View>

        {/* Right column */}
        <View style={styles.previewCardCol}>
          {/* Card 4: Thu */}
          <View style={styles.previewDayCardRealistic}>
            <View style={styles.previewDayCardHeader} />
          </View>
          {/* Card 5: Fri */}
          <View style={styles.previewDayCardRealistic}>
            <View style={styles.previewDayCardHeader} />
          </View>
          {/* Card 6: Sat (Weekend Pastel Red) */}
          <View style={styles.previewDayCardRealistic}>
            <View style={styles.previewDayCardHeaderWeekend} />
          </View>
        </View>
      </View>
    </View>
  );
}

function MonthLayoutPreview() {
  return (
    <View style={styles.phonePreviewBox}>
      {/* Top Header: Left title + right mode pill */}
      <View style={styles.previewHeaderRow}>
        <View style={styles.previewWeekTitleBadge} />
        <View style={styles.previewModePillBadge} />
      </View>

      {/* Weekday headers row */}
      <View style={styles.previewMonthWeekRow}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <View
            key={i}
            style={[styles.previewDot, i >= 5 && styles.previewDotWeekend]}
          />
        ))}
      </View>

      {/* 6 week rows of day cells */}
      <View style={styles.previewMonthWeeksCol}>
        {[0, 1, 2, 3, 4, 5].map((w) => {
          const isCurrentWeek = w === 3;
          return (
            <View
              key={w}
              style={[
                styles.previewMonthCellsRow,
                isCurrentWeek && styles.previewMonthCurrentWeekGroup,
              ]}
            >
              {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                const isToday = isCurrentWeek && d === 1;
                const isWeekend = d >= 5;
                return (
                  <View
                    key={d}
                    style={[
                      styles.previewMonthDayCell,
                      isWeekend && styles.previewMonthDayCellWeekend,
                      isToday && styles.previewMonthDayCellToday,
                    ]}
                  >
                    <View
                      style={[
                        styles.previewMonthDayNum,
                        isWeekend && styles.previewMonthDayNumWeekend,
                        isToday && styles.previewMonthDayNumToday,
                      ]}
                    />
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function YearLayoutPreview() {
  const { colors } = useTheme();
  return (
    <View style={styles.phonePreviewBox}>
      {/* Top Header: Left cyan "2026" + right mode pill */}
      <View style={styles.previewHeaderRow}>
        <View style={styles.previewYearTitleBadge} />
        <View style={styles.previewModePillBadge} />
      </View>

      {/* 4 rows x 3 columns grid (12 month cards) */}
      <View style={styles.previewYearGridNew}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((m) => {
          const isActiveMonth = m === 7; // August
          return (
            <View
              key={m}
              style={[
                styles.previewYearMonthCard,
                isActiveMonth && styles.previewYearMonthCardActive,
              ]}
            >
              {/* Month name title bar */}
              <View
                style={[
                  styles.previewYearMonthTitle,
                  isActiveMonth && { backgroundColor: colors.today },
                ]}
              />
              {/* DOW row */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 0.5 }}>
                <View style={{ width: 1.5, height: 1, backgroundColor: '#94A3B8' }} />
                <View style={{ width: 1.5, height: 1, backgroundColor: '#94A3B8' }} />
                <View style={{ width: 1.5, height: 1, backgroundColor: '#FF7B75' }} />
              </View>
              {/* Mini calendar grid lines / dot */}
              <View style={styles.previewYearMonthLine1} />
              <View style={styles.previewYearMonthLine2} />
              {isActiveMonth && (
                <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: colors.today, alignSelf: 'center', marginTop: 0.5 }} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function DefaultViewModeModal({
  visible,
  currentMode,
  onSelectMode,
  onClose,
}: {
  visible: boolean;
  currentMode: 'week' | 'month' | 'year';
  onSelectMode: (mode: 'week' | 'month' | 'year') => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [selected, setSelected] = useState<'week' | 'month' | 'year'>(currentMode || 'week');

  useEffect(() => {
    if (visible) {
      setSelected(currentMode || 'week');
    }
  }, [visible, currentMode]);

  const handleConfirm = () => {
    onSelectMode(selected);
    onClose();
  };

  const options: { mode: 'week' | 'month' | 'year'; label: string; preview: React.ReactNode }[] = [
    {
      mode: 'week',
      label: t.viewModes.week,
      preview: <WeekLayoutPreview />,
    },
    {
      mode: 'month',
      label: t.viewModes.month,
      preview: <MonthLayoutPreview />,
    },
    {
      mode: 'year',
      label: t.viewModes.year,
      preview: <YearLayoutPreview />,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modalContentCard, { backgroundColor: colors.inputBg }]}>
          {/* Header with Title and Close X button */}
          <View style={styles.modalHeaderRow}>
            <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>{t.settings.defaultViewMode}</Text>
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
              <Ionicons name="close" size={18} color={colors.secondary} />
            </Pressable>
          </View>

          {/* Visual Cards Row */}
          <View style={styles.visualCardsContainer}>
            {options.map((opt) => {
              const isSelected = selected === opt.mode;
              return (
                <AnimatedPressable
                  key={opt.mode}
                  activeScale={0.95}
                  style={[
                    styles.visualCard,
                    { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                    isSelected && { backgroundColor: colors.tintBg, borderColor: colors.today },
                  ]}
                  onPress={() => setSelected(opt.mode)}
                >
                  {/* Visual UI Preview Graphic */}
                  {opt.preview}

                  {/* Mode Label */}
                  <Text
                    style={[
                      styles.visualCardLabel,
                      { color: colors.text },
                      isSelected && { color: colors.today, fontWeight: '700' },
                    ]}
                  >
                    {opt.label}
                  </Text>

                  {/* Radio Indicator */}
                  <View style={[styles.visualRadio, { borderColor: colors.cardBorder }, isSelected && { borderColor: colors.today }]}>
                    {isSelected && <View style={[styles.visualRadioInner, { backgroundColor: colors.today }]} />}
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>

          {/* Confirm Button */}
          <Pressable style={[styles.modalContinueButton, { backgroundColor: colors.today }]} onPress={handleConfirm}>
            <Text style={styles.modalContinueButtonText}>{t.common.save}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function LastDayVisiblePreview() {
  return (
    <View style={styles.verticalPreviewBox}>
      {/* Top Header: Left title + right mode pill */}
      <View style={styles.previewHeaderRow}>
        <View>
          <View style={styles.previewWeekTitleBadge} />
          <View style={styles.previewWeekSubTitleBadge} />
        </View>
        <View style={styles.previewModePillBadge} />
      </View>
      {/* 2-column day cards (3 + 3) */}
      <View style={[styles.previewGridRow, { flex: 1, marginTop: 3, marginBottom: 3, gap: 2.5 }]}>
        <View style={styles.previewCardCol}>
          <View style={styles.previewDayCardRealistic}><View style={styles.previewDayCardHeader} /></View>
          <View style={[styles.previewDayCardRealistic, styles.previewDayCardToday]}><View style={styles.previewDayCardHeaderToday} /></View>
          <View style={styles.previewDayCardRealistic}><View style={styles.previewDayCardHeader} /></View>
        </View>
        <View style={styles.previewCardCol}>
          <View style={styles.previewDayCardRealistic}><View style={styles.previewDayCardHeader} /></View>
          <View style={styles.previewDayCardRealistic}><View style={styles.previewDayCardHeader} /></View>
          <View style={styles.previewDayCardRealistic}><View style={styles.previewDayCardHeaderWeekend} /></View>
        </View>
      </View>
      {/* 7th wide card at the bottom (Sunday) */}
      <View style={styles.previewWideCardMini} />
    </View>
  );
}

function LastDayHiddenPreview() {
  return (
    <View style={styles.verticalPreviewBox}>
      {/* Top Header: Left title + right mode pill */}
      <View style={styles.previewHeaderRow}>
        <View>
          <View style={styles.previewWeekTitleBadge} />
          <View style={styles.previewWeekSubTitleBadge} />
        </View>
        <View style={styles.previewModePillBadge} />
      </View>
      {/* 2-column day cards filling the full height (3 + 3) */}
      <View style={[styles.previewGridRow, { flex: 1, marginTop: 3, gap: 2.5 }]}>
        <View style={styles.previewCardCol}>
          <View style={styles.previewDayCardRealistic}><View style={styles.previewDayCardHeader} /></View>
          <View style={[styles.previewDayCardRealistic, styles.previewDayCardToday]}><View style={styles.previewDayCardHeaderToday} /></View>
          <View style={styles.previewDayCardRealistic}><View style={styles.previewDayCardHeader} /></View>
        </View>
        <View style={styles.previewCardCol}>
          <View style={styles.previewDayCardRealistic}><View style={styles.previewDayCardHeader} /></View>
          <View style={styles.previewDayCardRealistic}><View style={styles.previewDayCardHeader} /></View>
          <View style={styles.previewDayCardRealistic}><View style={styles.previewDayCardHeaderWeekend} /></View>
        </View>
      </View>
    </View>
  );
}

function LastDayVisibilityModal({
  visible,
  currentValue,
  onSelectValue,
  onClose,
}: {
  visible: boolean;
  currentValue: 'visible' | 'hidden';
  onSelectValue: (val: 'visible' | 'hidden') => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [selected, setSelected] = useState<'visible' | 'hidden'>(currentValue || 'visible');

  useEffect(() => {
    if (visible) {
      setSelected(currentValue || 'visible');
    }
  }, [visible, currentValue]);

  const handleConfirm = () => {
    onSelectValue(selected);
    onClose();
  };

  const options: { mode: 'visible' | 'hidden'; label: string; sublabel: string; preview: React.ReactNode }[] = [
    {
      mode: 'visible',
      label: t.settings.lastDayVisible,
      sublabel: t.settings.lastDayPreviewSubVisible,
      preview: <LastDayVisiblePreview />,
    },
    {
      mode: 'hidden',
      label: t.settings.lastDayHidden,
      sublabel: t.settings.lastDayPreviewSubHidden,
      preview: <LastDayHiddenPreview />,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modalContentCard, { backgroundColor: colors.inputBg }]}>
          {/* Header with Title and Close X button */}
          <View style={styles.modalHeaderRow}>
            <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>{t.settings.lastDayVisibility}</Text>
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
              <Ionicons name="close" size={18} color={colors.secondary} />
            </Pressable>
          </View>


          {/* Vertical Option Cards Container */}
          <View style={styles.verticalCardsContainer}>
            {options.map((opt) => {
              const isSelected = selected === opt.mode;
              return (
                <AnimatedPressable
                  key={opt.mode}
                  activeScale={0.97}
                  style={[
                    styles.verticalVisualCard,
                    { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                    isSelected && { backgroundColor: colors.tintBg, borderColor: colors.today },
                  ]}
                  onPress={() => setSelected(opt.mode)}
                >
                  {/* Left: Mini Screen UI Graphic */}
                  <View style={styles.verticalPreviewWrapper}>
                    {opt.preview}
                  </View>

                  {/* Middle: Info */}
                  <View style={styles.verticalCardInfo}>
                    <Text
                      style={[
                        styles.verticalCardLabel,
                        { color: colors.text },
                        isSelected && { color: colors.today, fontWeight: '700' },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={[styles.verticalCardSublabel, { color: colors.secondary }]}>
                      {opt.sublabel}
                    </Text>
                  </View>

                  {/* Right: Radio Indicator */}
                  <View
                    style={[
                      styles.visualRadio,
                      { borderColor: colors.cardBorder },
                      isSelected && { borderColor: colors.today },
                    ]}
                  >
                    {isSelected && <View style={[styles.visualRadioInner, { backgroundColor: colors.today }]} />}
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>

          {/* Confirm Button */}
          <Pressable style={[styles.modalContinueButton, { backgroundColor: colors.today }]} onPress={handleConfirm}>
            <Text style={styles.modalContinueButtonText}>Сақтау</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function CircularMonthPickerPreview() {
  const { colors, isDark } = useTheme();
  const { language } = useI18n();

  // Season Labels
  const seasons = language === 'ru'
    ? { summer: 'ЛЕТО', spring: 'ВЕСНА', winter: 'ЗИМА', autumn: 'ОСЕНЬ' }
    : language === 'en'
    ? { summer: 'SUMMER', spring: 'SPRING', winter: 'WINTER', autumn: 'AUTUMN' }
    : { summer: 'ЖАЗ', spring: 'КӨКТЕМ', winter: 'ҚЫС', autumn: 'КҮЗ' };

  // Month Labels:
  // Top: Jun, Jul, Aug (active)
  // Right: May, Apr, Mar
  // Bottom: Feb, Jan, Dec
  // Left: Nov, Oct, Sep
  const m = language === 'ru'
    ? { jun: 'Июн', jul: 'Июл', aug: 'Авг', may: 'Май', apr: 'Апр', mar: 'Мар', feb: 'Фев', jan: 'Янв', dec: 'Дек', nov: 'Ноя', oct: 'Окт', sep: 'Сен', center: 'Август' }
    : language === 'en'
    ? { jun: 'Jun', jul: 'Jul', aug: 'Aug', may: 'May', apr: 'Apr', mar: 'Mar', feb: 'Feb', jan: 'Jan', dec: 'Dec', nov: 'Nov', oct: 'Oct', sep: 'Sep', center: 'August' }
    : { jun: 'Мау', jul: 'Шіл', aug: 'Там', may: 'Мам', apr: 'Сәу', mar: 'Нау', feb: 'Ақп', jan: 'Қаң', dec: 'Жел', nov: 'Қар', oct: 'Қаз', sep: 'Қыр', center: 'Тамыз' };

  const summerBg = isDark ? '#2E2416' : '#FEF9C3';
  const springBg = isDark ? '#142E1F' : '#DCFCE7';
  const winterBg = isDark ? '#182438' : '#DBEAFE';
  const autumnBg = isDark ? '#2B1E17' : '#FFEDD5';

  const seasonColorSummer = isDark ? '#FBBF24' : '#B45309';
  const seasonColorSpring = isDark ? '#4ADE80' : '#15803D';
  const seasonColorWinter = isDark ? '#94A3B8' : '#475569';
  const seasonColorAutumn = isDark ? '#FB923C' : '#C2410C';

  const textColor = isDark ? '#F1F5F9' : '#1E293B';
  const borderColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';

  return (
    <View style={styles.richPreviewBox}>
      <Svg width="100%" height={142} viewBox="0 0 280 142">
        {/* Season Labels */}
        <SvgText x={140} y={13} fontSize={11} fontWeight="800" fill={seasonColorSummer} textAnchor="middle" letterSpacing={1.2}>
          {seasons.summer}
        </SvgText>
        <SvgText x={269} y={75} fontSize={9.5} fontWeight="800" fill={seasonColorSpring} textAnchor="end" letterSpacing={0.6}>
          {seasons.spring}
        </SvgText>
        <SvgText x={140} y={137} fontSize={11} fontWeight="800" fill={seasonColorWinter} textAnchor="middle" letterSpacing={1.2}>
          {seasons.winter}
        </SvgText>
        <SvgText x={11} y={75} fontSize={9.5} fontWeight="800" fill={seasonColorAutumn} textAnchor="start" letterSpacing={0.6}>
          {seasons.autumn}
        </SvgText>

        {/* Outer Racetrack Ring Background Segments */}
        {/* 1. Spring (Right Arc): x=190 to 240, y=20 to 120 */}
        <Path d="M 190 20 A 50 50 0 0 1 190 120 L 190 94 A 24 24 0 0 0 190 46 Z" fill={springBg} />
        {/* 2. Autumn (Left Arc): x=90 to 40, y=20 to 120 */}
        <Path d="M 90 120 A 50 50 0 0 1 90 20 L 90 46 A 24 24 0 0 0 90 94 Z" fill={autumnBg} />
        {/* 3. Summer (Top Bar): x=90 to 190, y=20 to 46 */}
        <Rect x={90} y={20} width={100} height={26} fill={summerBg} />
        {/* 4. Winter (Bottom Bar): x=90 to 190, y=94 to 120 */}
        <Rect x={90} y={94} width={100} height={26} fill={winterBg} />

        {/* Active Month (August / Тамыз) highlighted in bright Cyan */}
        <Rect x={73} y={20} width={43} height={26} rx={7} fill={colors.today} />

        {/* Outer and Inner Borders */}
        <Path
          d="M 90 20 L 190 20 A 50 50 0 0 1 190 120 L 90 120 A 50 50 0 0 1 90 20 Z"
          fill="none"
          stroke={borderColor}
          strokeWidth={1}
        />
        <Path
          d="M 90 46 L 190 46 A 24 24 0 0 1 190 94 L 90 94 A 24 24 0 0 1 90 46 Z"
          fill={colors.sheetBg}
          stroke={borderColor}
          strokeWidth={1}
        />

        {/* Segment Dividers */}
        <Line x1={123} y1={20} x2={123} y2={46} stroke={borderColor} strokeWidth={1} />
        <Line x1={157} y1={20} x2={157} y2={46} stroke={borderColor} strokeWidth={1} />
        <Line x1={123} y1={94} x2={123} y2={120} stroke={borderColor} strokeWidth={1} />
        <Line x1={157} y1={94} x2={157} y2={120} stroke={borderColor} strokeWidth={1} />

        {/* Month Labels */}
        {/* Top: Aug (Active Cyan with white text), Jul, Jun */}
        <SvgText x={94} y={37} fontSize={11.5} fontWeight="800" fill="#FFFFFF" textAnchor="middle">{m.aug}</SvgText>
        <SvgText x={140} y={37} fontSize={11} fontWeight="600" fill={textColor} textAnchor="middle">{m.jul}</SvgText>
        <SvgText x={175} y={37} fontSize={11} fontWeight="600" fill={textColor} textAnchor="middle">{m.jun}</SvgText>

        {/* Right: May, Apr, Mar */}
        <SvgText x={217} y={50} fontSize={10} fontWeight="600" fill={textColor} textAnchor="middle">{m.may}</SvgText>
        <SvgText x={228} y={74} fontSize={10} fontWeight="600" fill={textColor} textAnchor="middle">{m.apr}</SvgText>
        <SvgText x={217} y={98} fontSize={10} fontWeight="600" fill={textColor} textAnchor="middle">{m.mar}</SvgText>

        {/* Bottom: Dec, Jan, Feb */}
        <SvgText x={94} y={111} fontSize={10} fontWeight="600" fill={textColor} textAnchor="middle">{m.dec}</SvgText>
        <SvgText x={140} y={111} fontSize={10} fontWeight="600" fill={textColor} textAnchor="middle">{m.jan}</SvgText>
        <SvgText x={175} y={111} fontSize={10} fontWeight="600" fill={textColor} textAnchor="middle">{m.feb}</SvgText>

        {/* Left: Nov, Oct, Sep */}
        <SvgText x={63} y={98} fontSize={10} fontWeight="600" fill={textColor} textAnchor="middle">{m.nov}</SvgText>
        <SvgText x={52} y={74} fontSize={10} fontWeight="600" fill={textColor} textAnchor="middle">{m.oct}</SvgText>
        <SvgText x={63} y={50} fontSize={10} fontWeight="600" fill={textColor} textAnchor="middle">{m.sep}</SvgText>

        {/* Center Box: Racetrack Arrow Line + Center Full Month Name */}
        {/* Clockwise Racetrack Arrow */}
        <Path
          d="M 120 94 L 175 94 A 16 16 0 0 0 191 78 L 191 62 A 16 16 0 0 0 175 46 L 90 46"
          fill="none"
          stroke={colors.today}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
        {/* Arrowhead pointing Left at (90, 46) */}
        <Path
          d="M 95 43 L 89 46 L 95 49"
          fill="none"
          stroke={colors.today}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Center Month Name */}
        <SvgText x={140} y={75} fontSize={15.5} fontWeight="800" fill={textColor} textAnchor="middle" letterSpacing={-0.3}>
          {m.center}
        </SvgText>
      </Svg>
    </View>
  );
}

function GridMonthPickerPreview() {
  const { colors, isDark } = useTheme();
  const { language } = useI18n();

  const shortMonths = language === 'ru'
    ? ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
    : language === 'en'
    ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    : ['Қаң', 'Ақп', 'Нау', 'Сәу', 'Мам', 'Мау', 'Шіл', 'Там', 'Қыр', 'Қаз', 'Қар', 'Жел'];

  const activeIndex = 7; // Aug / Тамыз

  return (
    <View style={styles.richPreviewBox}>
      <View style={styles.gridPreviewContainer}>
        {shortMonths.map((name, idx) => {
          const isActive = idx === activeIndex;
          return (
            <View
              key={idx}
              style={[
                styles.gridRichCell,
                {
                  backgroundColor: isActive
                    ? colors.today
                    : isDark
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(0,0,0,0.035)',
                  borderColor: isActive ? colors.today : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                },
              ]}
            >
              <Text
                style={[
                  styles.gridRichCellText,
                  { color: isActive ? '#FFFFFF' : colors.text },
                  isActive && { fontWeight: '800' },
                ]}
              >
                {name}
              </Text>
              {isActive && <View style={styles.gridRichTodayDot} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function MonthPickerStyleModal({
  visible,
  currentValue,
  onSelectValue,
  onClose,
}: {
  visible: boolean;
  currentValue: 'circular' | 'grid';
  onSelectValue: (val: 'circular' | 'grid') => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [selected, setSelected] = useState<'circular' | 'grid'>(currentValue || 'circular');

  useEffect(() => {
    if (visible) {
      setSelected(currentValue || 'circular');
    }
  }, [visible, currentValue]);

  const handleConfirm = () => {
    onSelectValue(selected);
    onClose();
  };

  const options: { mode: 'circular' | 'grid'; label: string; sublabel: string; preview: React.ReactNode }[] = [
    {
      mode: 'circular',
      label: t.settings.monthPickerStyles.circular,
      sublabel: t.settings.monthPickerStylesSub.circular,
      preview: <CircularMonthPickerPreview />,
    },
    {
      mode: 'grid',
      label: t.settings.monthPickerStyles.grid,
      sublabel: t.settings.monthPickerStylesSub.grid,
      preview: <GridMonthPickerPreview />,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modalContentCard, { backgroundColor: colors.inputBg, maxWidth: 440 }]}>
          {/* Header */}
          <View style={styles.modalHeaderRow}>
            <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>{t.settings.monthPickerStyle}</Text>
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
              <Ionicons name="close" size={18} color={colors.secondary} />
            </Pressable>
          </View>

          {/* Large Visual Option Cards */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
          >
            {options.map((opt) => {
              const isSelected = selected === opt.mode;
              return (
                <AnimatedPressable
                  key={opt.mode}
                  activeScale={0.98}
                  style={[
                    styles.styleModalCard,
                    { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                    isSelected && { backgroundColor: colors.tintBg, borderColor: colors.today, borderWidth: 2 },
                  ]}
                  onPress={() => setSelected(opt.mode)}
                >
                  {/* Visual Graphic Mockup */}
                  {opt.preview}

                  {/* Bottom info row with Radio button */}
                  <View style={styles.styleCardBottomRow}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text
                        style={[
                          styles.styleCardTitle,
                          { color: colors.text },
                          isSelected && { color: colors.today, fontWeight: '800' },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text style={[styles.styleCardSubtitle, { color: colors.secondary }]}>
                        {opt.sublabel}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.visualRadio,
                        { borderColor: colors.cardBorder },
                        isSelected && { borderColor: colors.today },
                      ]}
                    >
                      {isSelected && <View style={[styles.visualRadioInner, { backgroundColor: colors.today }]} />}
                    </View>
                  </View>
                </AnimatedPressable>
              );
            })}
          </ScrollView>

          {/* Confirm Button */}
          <Pressable style={[styles.modalContinueButton, { backgroundColor: colors.today, marginTop: 8 }]} onPress={handleConfirm}>
            <Text style={styles.modalContinueButtonText}>{t.common.save}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    backgroundColor: colors.inputBg,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    marginBottom: 16,
    overflow: 'hidden',
  },
  rowPressable: {
    minHeight: 52,
    justifyContent: 'center',
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconBox: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowLabel: {
    flex: 1,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    marginRight: 8,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.secondary,
    flexShrink: 0,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.inputBorder,
    marginLeft: 56,
  },
  footerVersion: {
    marginTop: 32,
    marginBottom: 12,
    alignItems: 'center',
  },
  footerVersionText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.secondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  modalContentCard: {
    width: '100%',
    backgroundColor: colors.sheetBg,
    borderRadius: 32,
    borderCurve: 'continuous',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    marginBottom: 20,
    gap: 4,
  },
  optionRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  optionRowLeft: {
    flex: 1,
    marginRight: 12,
  },
  optionRowTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  optionRowTitleSelected: {
    fontWeight: '700',
    color: colors.text,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.checkboxBg,
  },
  radioButtonSelected: {
    borderColor: colors.today,
    backgroundColor: colors.checkboxBg,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.today,
  },
  modalContinueButton: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    borderCurve: 'continuous',
    backgroundColor: colors.today,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContinueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Visual View Mode Card Styles
  visualCardsContainer: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  visualCard: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    padding: 8,
    alignItems: 'center',
  },
  visualCardSelected: {
    backgroundColor: colors.tintBg,
    borderColor: colors.today,
  },
  previewBox: {
    width: '100%',
    height: 94,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    marginBottom: 8,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  previewWeekTitleBadge: {
    width: 18,
    height: 3.5,
    borderRadius: 1,
    backgroundColor: '#94A3B8',
    marginBottom: 1,
  },
  previewWeekSubTitleBadge: {
    width: 11,
    height: 2,
    borderRadius: 0.5,
    backgroundColor: '#CBD5E1',
  },
  previewModePillBadge: {
    width: 12,
    height: 4.5,
    borderRadius: 2,
    backgroundColor: '#F1F5F9',
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  previewYearTitleBadge: {
    width: 16,
    height: 4.5,
    borderRadius: 1,
    backgroundColor: colors.today,
  },
  previewDayCardRealistic: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 2.5,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  previewDayCardToday: {
    borderColor: colors.today,
    borderWidth: 0.8,
  },
  previewDayCardHeader: {
    height: 4.5,
    backgroundColor: '#F1F5F9',
  },
  previewDayCardHeaderToday: {
    height: 4.5,
    backgroundColor: colors.today,
  },
  previewDayCardHeaderWeekend: {
    height: 4.5,
    backgroundColor: '#FFE4E2',
  },
  previewWideCardMini: {
    height: 14,
    borderRadius: 3,
    backgroundColor: '#FFF0EE',
    borderWidth: 0.5,
    borderColor: '#FFCDC8',
  },
  // Vertical card styles for LastDayVisibilityModal
  verticalCardsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  verticalVisualCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    padding: 12,
    gap: 14,
  },
  verticalVisualCardSelected: {
    backgroundColor: colors.tintBg,
    borderColor: colors.today,
  },
  verticalPreviewWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  verticalPreviewBox: {
    width: 58,
    height: 104,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 4,
    paddingTop: 5,
    paddingBottom: 5,
    borderWidth: 1.5,
    borderColor: '#DFE3E8',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  phonePreviewBox: {
    width: 58,
    height: 104,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 4,
    paddingTop: 5,
    paddingBottom: 5,
    borderWidth: 1.5,
    borderColor: '#DFE3E8',
    justifyContent: 'space-between',
    overflow: 'hidden',
    marginBottom: 8,
  },
  verticalCardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  verticalCardLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 3,
  },
  verticalCardLabelSelected: {
    color: colors.today,
    fontWeight: '700',
  },
  verticalCardSublabel: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.secondary,
    lineHeight: 16,
  },
  previewWeekBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 10,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  previewDayPill: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#E2E8F0',
  },
  previewDayPillActive: {
    backgroundColor: colors.today,
  },
  previewDayPillWeekend: {
    backgroundColor: '#FFCDC8',
  },
  previewGridRow: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
    marginTop: 4,
  },
  previewCardCol: {
    flex: 1,
    gap: 3,
  },
  previewCardMini: {
    flex: 1,
    backgroundColor: '#F8F9FB',
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  previewMonthHeader: {
    height: 8,
    justifyContent: 'center',
  },
  previewMonthTitleBadge: {
    width: 24,
    height: 6,
    borderRadius: 2,
    backgroundColor: colors.today,
  },
  previewMonthWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
    paddingHorizontal: 1,
  },
  previewDot: {
    width: 5,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#94A3B8',
  },
  previewDotWeekend: {
    backgroundColor: '#FF4B3E',
  },
  previewMonthWeeksCol: {
    flex: 1,
    justifyContent: 'space-between',
    marginTop: 2,
  },
  previewMonthCurrentWeekGroup: {
    borderWidth: 0.8,
    borderColor: '#CBD5E1',
    borderRadius: 2.5,
    padding: 0.5,
    marginHorizontal: -0.5,
  },
  previewMonthCellsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 1.5,
  },
  previewMonthDayCell: {
    flex: 1,
    height: 10,
    backgroundColor: '#F6F8FA',
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: '#E8EDF3',
    padding: 1,
  },
  previewMonthDayCellWeekend: {
    backgroundColor: '#FFF3F2',
    borderColor: '#FFE0DC',
  },
  previewMonthDayCellToday: {
    backgroundColor: colors.tintBg,
    borderColor: colors.today,
    borderWidth: 0.8,
  },
  previewMonthDayNum: {
    width: 3,
    height: 2,
    borderRadius: 0.5,
    backgroundColor: '#8A94A6',
  },
  previewMonthDayNumWeekend: {
    backgroundColor: '#FF5959',
  },
  previewMonthDayNumToday: {
    backgroundColor: colors.today,
  },
  previewYearGridNew: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
    marginTop: 2,
  },
  previewYearMonthCard: {
    width: '31%',
    height: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    borderWidth: 0.8,
    borderColor: '#D8DEE8',
    padding: 1.5,
    justifyContent: 'space-between',
  },
  previewYearMonthCardActive: {
    borderColor: colors.today,
    borderWidth: 1,
  },
  previewYearMonthTitle: {
    width: '75%',
    height: 2,
    borderRadius: 1,
    backgroundColor: '#1E293B',
  },
  previewYearMonthLine1: {
    width: '95%',
    height: 1.5,
    borderRadius: 0.5,
    backgroundColor: '#CBD5E1',
  },
  previewYearMonthLine2: {
    width: '90%',
    height: 1.5,
    borderRadius: 0.5,
    backgroundColor: '#E2E8F0',
  },
  visualCardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  visualCardLabelSelected: {
    color: colors.today,
    fontWeight: '700',
  },
  visualCardSublabel: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.secondary,
    marginBottom: 6,
  },
  visualCardSublabelSelected: {
    color: colors.today,
  },
  visualRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  visualRadioSelected: {
    borderColor: colors.today,
  },
  visualRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.today,
  },
  themeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  themeActiveBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 10,
  },
  themeActiveBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  telegramThemeScroll: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 2,
    gap: 12,
  },
  telegramThemeItem: {
    alignItems: 'center',
    width: 68,
    gap: 6,
  },
  telegramThemeBubbleOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  telegramThemeBubble: {
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
  telegramThemeTitle: {
    fontSize: 11,
    textAlign: 'center',
  },
  pickerPreviewBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleModalCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 12,
    overflow: 'hidden',
  },
  richPreviewBox: {
    width: '100%',
    height: 142,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
  },
  gridPreviewContainer: {
    width: '94%',
    height: 126,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
    paddingVertical: 2,
  },
  gridRichCell: {
    width: '23.5%',
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gridRichCellText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  gridRichTodayDot: {
    position: 'absolute',
    top: 4,
    right: 5,
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    backgroundColor: '#FFFFFF',
  },
  styleCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  styleCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  styleCardSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
});
