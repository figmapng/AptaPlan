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
import Svg, { Circle, Path } from 'react-native-svg';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';

import { colors } from '@/constants/colors';
import { THEMES, THEME_LIST, type ThemeConfig } from '@/constants/themes';
import { type ThemeId } from '@/types/settings';
import { usePlanner } from '@/store/planner-store';
import { useTheme } from '@/hooks/use-theme';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { UserGuideModal } from '@/components/UserGuideModal';
import { getDatabase } from '@/database/database';
import { exportBackup, importBackup } from '@/services/backup-service';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, themeConfig, colors, setTheme } = useTheme();
  const {
    settings,
    setPref,
    clearAll,
    refresh,
  } = usePlanner();

  // Modals for selection settings
  const [guideOpen, setGuideOpen] = useState(false);
  const [placementModalOpen, setPlacementModalOpen] = useState(false);
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [firstDayModalOpen, setFirstDayModalOpen] = useState(false);
  const [lastDayModalOpen, setLastDayModalOpen] = useState(false);
  const [defaultViewModeModalOpen, setDefaultViewModeModalOpen] = useState(false);

  const clear = () =>
    Alert.alert(
      'Барлық деректі өшіру',
      'Бұл әрекетті кері қайтару мүмкін емес.',
      [
        { text: 'Болдырмау', style: 'cancel' },
        {
          text: 'Жалғастыру',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Соңғы растау',
              'Барлық тапсырма шынымен өшірілсін бе?',
              [
                { text: 'Болдырмау', style: 'cancel' },
                { text: 'Барлығын өшіру', style: 'destructive', onPress: () => void clearAll() },
              ]
            ),
        },
      ]
    );

  const handleExport = async () => {
    const db = await getDatabase();
    await exportBackup(db);
  };

  const handleImport = async () => {
    const db = await getDatabase();
    await importBackup(db, refresh);
  };

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
          accessibilityLabel="Артқа қайту"
        >
          <Ionicons name="chevron-back" size={20} color={colors.secondary} style={{ marginLeft: -1 }} />
        </AnimatedPressable>

        <Text style={[styles.headerTitle, { color: colors.text }]}>Баптаулар</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        {/* Бөлім 1: Жекелендіру */}
        <Section>
          <SettingRow
            icon="color-palette-outline"
            label="Сыртқы түрі"
            valueText={themeConfig.name}
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
            label="Әдепкі режим"
            valueText={
              settings.defaultViewMode === 'month'
                ? 'Ай'
                : settings.defaultViewMode === 'year'
                ? 'Жыл'
                : 'Апта'
            }
            onPress={() => setDefaultViewModeModalOpen(true)}
          />
          <Divider />
          <SettingRow
            icon="calendar-outline"
            label="Аптаның бірінші күні"
            valueText={
              settings.firstDayOfWeek === 'sat'
                ? 'Сенбі'
                : settings.firstDayOfWeek === 'sun'
                ? 'Жексенбі'
                : 'Дүйсенбі'
            }
            onPress={() => setFirstDayModalOpen(true)}
          />
          <Divider />
          <SettingRow
            icon="eye-outline"
            label="Соңғы күннің көрінуі"
            valueText={
              settings.lastDayVisibility === 'hidden'
                ? 'Жасырын'
                : 'Үнемі көрінеді'
            }
            onPress={() => setLastDayModalOpen(true)}
          />
        </Section>

        {/* Бөлім 3: Тапсырмалар */}
        <Section>
          <SettingRow
            icon="layers-outline"
            label="Орындалған тапсырмалар"
            valueText={
              settings.completedPlacement === 'keep' ? 'Орнында' : 'Төменде'
            }
            onPress={() => setPlacementModalOpen(true)}
          />
          <Divider />
          <SettingRow
            icon="swap-vertical-outline"
            label="Автоматты сұрыптау"
            valueText={
              settings.sortMode === 'time' ? 'Уақыт бойынша' : 'Қолмен'
            }
            onPress={() => setSortModalOpen(true)}
          />
        </Section>

        {/* Бөлім 4: Интеграция және жүйе */}
        <Section>
          <SettingRow
            icon="extension-puzzle-outline"
            label="Интеграциялар"
            valueText={
              Platform.OS === 'ios'
                ? settings.syncAppleReminders
                  ? 'Apple Reminders'
                  : 'Өшірулі'
                : 'Күнтізбе'
            }
            onPress={() => router.push('/integrations' as any)}
          />
          <Divider />
          <SettingRow
            icon="pulse-outline"
            label="Тактильді кері байланыс"
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
            label="Деректерді экспорттау (JSON)"
            onPress={() => void handleExport()}
          />
          <Divider />
          <SettingRow
            icon="cloud-download-outline"
            label="Деректерді импорттау (JSON)"
            onPress={() => void handleImport()}
          />
          <Divider />
          <SettingRow
            icon="trash-outline"
            iconColor="#FF4B3E"
            label="Барлық деректі өшіру"
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
        title="Аптаның бірінші күні"
        onClose={() => setFirstDayModalOpen(false)}
        options={[
          {
            label: 'Дүйсенбі',
            selected: !settings.firstDayOfWeek || settings.firstDayOfWeek === 'mon',
            onSelect: () => {
              void setPref('firstDayOfWeek', 'mon');
              setFirstDayModalOpen(false);
            },
          },
          {
            label: 'Сенбі',
            selected: settings.firstDayOfWeek === 'sat',
            onSelect: () => {
              void setPref('firstDayOfWeek', 'sat');
              setFirstDayModalOpen(false);
            },
          },
          {
            label: 'Жексенбі',
            selected: settings.firstDayOfWeek === 'sun',
            onSelect: () => {
              void setPref('firstDayOfWeek', 'sun');
              setFirstDayModalOpen(false);
            },
          },
        ]}
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
        title="Орындалған тапсырмалар"
        onClose={() => setPlacementModalOpen(false)}
        options={[
          {
            label: 'Орнында қалдыру',
            selected: settings.completedPlacement === 'keep',
            onSelect: () => {
              void setPref('completedPlacement', 'keep');
              setPlacementModalOpen(false);
            },
          },
          {
            label: 'Төменге жылжыту',
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
        title="Автоматты сұрыптау"
        onClose={() => setSortModalOpen(false)}
        options={[
          {
            label: 'Уақыт бойынша сұрыптау',
            selected: settings.sortMode === 'time',
            onSelect: () => {
              void setPref('sortMode', 'time');
              setSortModalOpen(false);
            },
          },
          {
            label: 'Қолмен реттеу',
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
            <Text style={styles.modalContinueButtonText}>Растау</Text>
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
          const isActiveMonth = m === 7; // August (Тамыз)
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
      label: 'Апта',
      preview: <WeekLayoutPreview />,
    },
    {
      mode: 'month',
      label: 'Ай',
      preview: <MonthLayoutPreview />,
    },
    {
      mode: 'year',
      label: 'Жыл',
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
            <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>Әдепкі режим</Text>
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
            <Text style={styles.modalContinueButtonText}>Сақтау</Text>
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
      label: 'Үнемі көрінеді',
      sublabel: '7 күннен тұратын толық апта көрінісі (свайппен жасыруға болады)',
      preview: <LastDayVisiblePreview />,
    },
    {
      mode: 'hidden',
      label: 'Жасырын',
      sublabel: '6 күндік ықшам режим (свайппен ашуға болады)',
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
            <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>Соңғы күннің көрінуі</Text>
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
});
