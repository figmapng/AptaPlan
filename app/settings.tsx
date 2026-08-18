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

import { colors } from '@/constants/colors';
import { usePlanner } from '@/store/planner-store';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { UserGuideModal } from '@/components/UserGuideModal';
import { getDatabase } from '@/database/database';
import { exportBackup, importBackup } from '@/services/backup-service';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    settings,
    setPref,
    clearAll,
    refresh,
    syncAppleReminders,
    enableAppleReminders,
    disableAppleReminders,
  } = usePlanner();

  // Modals for selection settings
  const [guideOpen, setGuideOpen] = useState(false);
  const [placementModalOpen, setPlacementModalOpen] = useState(false);
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [firstDayModalOpen, setFirstDayModalOpen] = useState(false);
  const [lastDayModalOpen, setLastDayModalOpen] = useState(false);
  const [defaultViewModeModalOpen, setDefaultViewModeModalOpen] = useState(false);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState<string | null>(null);

  const handleToggleRemindersSync = async (enable: boolean) => {
    if (enable) {
      if (Platform.OS !== 'ios') {
        Alert.alert('Ескерту', 'Apple Reminders тек iOS құрылғыларында қолжетімді.');
        return;
      }
      setIsSyncing(true);
      try {
        const res = await enableAppleReminders();
        if (res.success) {
          Alert.alert(
            'Синхрондау қосылды',
            `Apple Reminders қосымшасынан тапсырмалар жүктелді.\n\n• Қосылды: ${res.importedCount}\n• Жаңартылды: ${res.updatedCount}`
          );
        } else {
          Alert.alert('Рұқсат қажет', res.error || 'Қате орын алды');
        }
      } catch (e: any) {
        Alert.alert('Қате', e?.message || 'Қосу мүмкін болмады');
      } finally {
        setIsSyncing(false);
      }
    } else {
      Alert.alert(
        'Apple Reminders синхрондауын өшіру',
        'Бұрын синхрондалған барлық еске салғыштар AptaPlan-нан өшіріледі. Қолдан қосылған тапсырмалар сақталады.',
        [
          { text: 'Болдырмау', style: 'cancel' },
          {
            text: 'Өшіру',
            style: 'destructive',
            onPress: async () => {
              setIsSyncing(true);
              try {
                await disableAppleReminders();
              } finally {
                setIsSyncing(false);
              }
            },
          },
        ]
      );
    }
  };

  const handleSyncReminders = async () => {
    if (isSyncing) return;
    if (Platform.OS !== 'ios') {
      Alert.alert('Ескерту', 'Apple Reminders тек iOS құрылғыларында қолжетімді.');
      return;
    }
    setIsSyncing(true);
    setSyncStatusText(null);
    try {
      const res = await syncAppleReminders();
      if (res.success) {
        const total = res.importedCount + res.updatedCount;
        const msg = total > 0 ? `Жаңартылды: ${total}` : 'Жаңа тапсырма жоқ';
        setSyncStatusText(msg);
        Alert.alert(
          'Синхрондау аяқталды',
          `Apple Reminders-тен тапсырмалар сәтті жүктелді.\n\n• Қосылды: ${res.importedCount}\n• Жаңартылды: ${res.updatedCount}\n• Барлығы табылды: ${res.totalFound}`
        );
      } else {
        Alert.alert('Синхрондау қатесі', res.error || 'Қате орын алды');
      }
    } catch (e: any) {
      Alert.alert('Қате', e?.message || 'Синхрондау мүмкін болмады');
    } finally {
      setIsSyncing(false);
    }
  };

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* iOS-style Navigation Bar */}
      <View style={styles.header}>
        <AnimatedPressable
          activeScale={0.85}
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Артқа қайту"
        >
          <Ionicons name="chevron-back" size={20} color={colors.inputPlusIcon} style={{ marginLeft: -1 }} />
        </AnimatedPressable>

        <Text style={styles.headerTitle}>Баптаулар</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        {/* Карточка 1: Негізгі баптаулар */}
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
          <Divider />
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

        {/* Карточка 2: Apple Reminders (Еске салғыштар) синхрондау */}
        <Section>
          <SettingRow
            customIcon={<AppleRemindersIcon size={21} />}
            label="Apple Reminders синхрондау"
            rightElement={
              isSyncing ? (
                <ActivityIndicator size="small" color={colors.today} />
              ) : (
                <Switch
                  value={!!settings.syncAppleReminders}
                  onValueChange={handleToggleRemindersSync}
                  trackColor={{ false: '#E2E5EB', true: colors.today }}
                  thumbColor="#FFFFFF"
                />
              )
            }
          />
          {settings.syncAppleReminders && (
            <>
              <Divider />
              <SettingRow
                icon="refresh-circle-outline"
                label="Авто-синхрондау"
                rightElement={
                  <Switch
                    value={settings.autoSyncAppleReminders !== false}
                    onValueChange={(v) => void setPref('autoSyncAppleReminders', v)}
                    trackColor={{ false: '#E2E5EB', true: colors.today }}
                    thumbColor="#FFFFFF"
                  />
                }
              />
              <Divider />
              <SettingRow
                icon="sync-outline"
                label="Қазір синхрондау"
                valueText={isSyncing ? 'Жүктелуде...' : syncStatusText || undefined}
                onPress={handleSyncReminders}
              />
            </>
          )}
        </Section>

        {/* Карточка 3: Деректер мен сақтық көшірме */}
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
  return (
    <View style={styles.card}>{children}</View>
  );
}

function AppleRemindersIcon({ size = 21 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Top bullet item (Orange) */}
      <Circle cx="4.5" cy="5" r="2.75" fill="#FF9500" />
      <Path d="M10 5h11" stroke="#8E8E93" strokeWidth="2.2" strokeLinecap="round" />

      {/* Middle bullet item (Blue) */}
      <Circle cx="4.5" cy="12" r="2.75" fill="#007AFF" />
      <Path d="M10 12h11" stroke="#8E8E93" strokeWidth="2.2" strokeLinecap="round" />

      {/* Bottom bullet item (Red) */}
      <Circle cx="4.5" cy="19" r="2.75" fill="#FF3B30" />
      <Path d="M10 19h11" stroke="#8E8E93" strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  );
}

function SettingRow({
  icon,
  iconColor = '#23262D',
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
  const content = (
    <View style={styles.rowInner}>
      <View style={styles.iconBox}>
        {customIcon ? (
          customIcon
        ) : icon ? (
          <Ionicons name={icon as any} size={21} color={iconColor} />
        ) : null}
      </View>
      <Text style={[styles.rowLabel, labelStyle]}>
        {label}
      </Text>
      {valueText ? (
        <Text style={styles.valueText} numberOfLines={1}>
          {valueText}
        </Text>
      ) : null}
      {rightElement ? (
        rightElement
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ marginLeft: 6 }} />
      ) : null}
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
  return <View style={styles.divider} />;
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
        <View style={styles.modalContentCard}>
          {/* Header with Title and Close X button */}
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalHeaderTitle}>{title}</Text>
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
                    <Text style={[styles.optionRowTitle, isChecked && styles.optionRowTitleSelected]}>
                      {opt.label}
                    </Text>
                  </View>
                  <View style={[styles.radioButton, isChecked && styles.radioButtonSelected]}>
                    {isChecked && <View style={styles.radioButtonInner} />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Bottom Action Button */}
          <Pressable style={styles.modalContinueButton} onPress={handleConfirm}>
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
      {/* Mini Smartphone Status Bar & Month Header */}
      <View style={styles.previewWeekHeader}>
        <View style={styles.previewWeekTitleBadge} />
        <View style={styles.previewWeekProgressBadge} />
      </View>
      {/* 2-column day cards (3 + 3) */}
      <View style={[styles.previewGridRow, { height: 58, marginTop: 2, gap: 2.5 }]}>
        <View style={styles.previewCardCol}>
          <View style={styles.previewCardMini} />
          <View style={styles.previewCardMini} />
          <View style={styles.previewCardMini} />
        </View>
        <View style={styles.previewCardCol}>
          <View style={styles.previewCardMini} />
          <View style={styles.previewCardMini} />
          <View style={styles.previewCardMini} />
        </View>
      </View>
      {/* Sunday 7th wide card */}
      <View style={styles.previewWideCardMini} />
    </View>
  );
}

function MonthLayoutPreview() {
  return (
    <View style={styles.phonePreviewBox}>
      {/* Month header badge */}
      <View style={styles.previewMonthHeader}>
        <View style={styles.previewMonthTitleBadge} />
      </View>
      {/* Weekday headers row */}
      <View style={styles.previewMonthWeekRow}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={[styles.previewDot, i >= 5 && styles.previewDotWeekend]} />
        ))}
      </View>
      {/* 6 rows of 7 matrix cells */}
      <View style={{ flex: 1, justifyContent: 'space-between', marginVertical: 2 }}>
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <View key={row} style={styles.previewMatrixRow}>
            {[0, 1, 2, 3, 4, 5, 6].map((col) => {
              const isActive = row === 2 && col === 2;
              const isWeekend = col >= 5;
              return (
                <View
                  key={col}
                  style={[
                    styles.previewCellDot,
                    isActive && styles.previewCellDotActive,
                    isWeekend && !isActive && styles.previewCellDotWeekend,
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

function YearLayoutPreview() {
  return (
    <View style={styles.phonePreviewBox}>
      {/* Year header badge */}
      <View style={styles.previewMonthHeader}>
        <View style={[styles.previewMonthTitleBadge, { width: 18 }]} />
      </View>
      {/* 4 rows x 3 columns of mini month blocks */}
      <View style={[styles.previewYearGrid, { marginTop: 2 }]}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((m) => (
          <View key={m} style={[styles.previewYearMonth, m === 7 && styles.previewYearMonthActive]}>
            <View style={styles.previewYearMonthHeader} />
            <View style={styles.previewYearMonthLines} />
          </View>
        ))}
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

  const options: { mode: 'week' | 'month' | 'year'; label: string; sublabel: string; preview: React.ReactNode }[] = [
    {
      mode: 'week',
      label: 'Апта',
      sublabel: 'Стандартты',
      preview: <WeekLayoutPreview />,
    },
    {
      mode: 'month',
      label: 'Ай',
      sublabel: 'Күнтізбе',
      preview: <MonthLayoutPreview />,
    },
    {
      mode: 'year',
      label: 'Жыл',
      sublabel: 'Шолу',
      preview: <YearLayoutPreview />,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalContentCard}>
          {/* Header with Title and Close X button */}
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalHeaderTitle}>Әдепкі режим</Text>
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
                    isSelected && styles.visualCardSelected,
                  ]}
                  onPress={() => setSelected(opt.mode)}
                >
                  {/* Visual UI Preview Graphic */}
                  {opt.preview}

                  {/* Label */}
                  <Text
                    style={[
                      styles.visualCardLabel,
                      isSelected && styles.visualCardLabelSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>

                  {/* Subtitle / Badge */}
                  <Text
                    style={[
                      styles.visualCardSublabel,
                      isSelected && styles.visualCardSublabelSelected,
                    ]}
                  >
                    {opt.sublabel}
                  </Text>

                  {/* Radio Indicator */}
                  <View style={[styles.visualRadio, isSelected && styles.visualRadioSelected]}>
                    {isSelected && <View style={styles.visualRadioInner} />}
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>

          {/* Confirm Button */}
          <Pressable style={styles.modalContinueButton} onPress={handleConfirm}>
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
      {/* Mini Smartphone Status Bar & Month Header */}
      <View style={styles.previewWeekHeader}>
        <View style={styles.previewWeekTitleBadge} />
        <View style={styles.previewWeekProgressBadge} />
      </View>
      {/* 2-column day cards (3 + 3) */}
      <View style={[styles.previewGridRow, { height: 58, marginTop: 2, gap: 2.5 }]}>
        <View style={styles.previewCardCol}>
          <View style={styles.previewCardMini} />
          <View style={styles.previewCardMini} />
          <View style={styles.previewCardMini} />
        </View>
        <View style={styles.previewCardCol}>
          <View style={styles.previewCardMini} />
          <View style={styles.previewCardMini} />
          <View style={styles.previewCardMini} />
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
      {/* Mini Smartphone Status Bar & Month Header */}
      <View style={styles.previewWeekHeader}>
        <View style={styles.previewWeekTitleBadge} />
        <View style={styles.previewWeekProgressBadge} />
      </View>
      {/* 2-column day cards filling the full height (3 + 3) */}
      <View style={[styles.previewGridRow, { height: 78, marginTop: 2, gap: 2.5 }]}>
        <View style={styles.previewCardCol}>
          <View style={styles.previewCardMini} />
          <View style={styles.previewCardMini} />
          <View style={styles.previewCardMini} />
        </View>
        <View style={styles.previewCardCol}>
          <View style={styles.previewCardMini} />
          <View style={styles.previewCardMini} />
          <View style={styles.previewCardMini} />
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
      sublabel: '7 күннен тұратын толық апта көрінісі (Жексенбі қосылған)',
      preview: <LastDayVisiblePreview />,
    },
    {
      mode: 'hidden',
      label: 'Жасырын',
      sublabel: '6 күндік ықшам режим (Дүйсенбі - Сенбі)',
      preview: <LastDayHiddenPreview />,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalContentCard}>
          {/* Header with Title and Close X button */}
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalHeaderTitle}>Соңғы күннің көрінуі</Text>
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
                    isSelected && styles.verticalVisualCardSelected,
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
                        isSelected && styles.verticalCardLabelSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={styles.verticalCardSublabel}>
                      {opt.sublabel}
                    </Text>
                  </View>

                  {/* Right: Radio Indicator */}
                  <View
                    style={[
                      styles.visualRadio,
                      isSelected && styles.visualRadioSelected,
                    ]}
                  >
                    {isSelected && <View style={styles.visualRadioInner} />}
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>

          {/* Confirm Button */}
          <Pressable style={styles.modalContinueButton} onPress={handleConfirm}>
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
    backgroundColor: '#FFFFFF',
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
    color: '#1C1C1E',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
    color: '#1C1C1E',
    marginRight: 8,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.secondary,
    flexShrink: 0,
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
    color: '#8E8E93',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.40)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  modalContentCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
  },
  radioButtonSelected: {
    borderColor: colors.today,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#01B7FF08',
    borderColor: colors.today,
  },
  previewBox: {
    width: '100%',
    height: 94,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: '#ECEEF2',
    marginBottom: 8,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  previewWeekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 8,
    marginBottom: 4,
  },
  previewWeekTitleBadge: {
    width: 24,
    height: 6,
    borderRadius: 2,
    backgroundColor: colors.today,
  },
  previewWeekProgressBadge: {
    width: 14,
    height: 5,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  previewWideCardMini: {
    height: 14,
    borderRadius: 3,
    backgroundColor: '#FFF0EE',
    borderWidth: 0.5,
    borderColor: '#FFCDC8',
    marginTop: 3,
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
    backgroundColor: '#01B7FF08',
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
  previewMatrixRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 1,
    paddingHorizontal: 1,
  },
  previewCellDot: {
    width: 6,
    height: 6,
    borderRadius: 2,
    backgroundColor: '#F1F5F9',
  },
  previewCellDotActive: {
    backgroundColor: colors.today,
  },
  previewCellDotWeekend: {
    backgroundColor: '#FFE4E2',
  },
  previewYearGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    justifyContent: 'space-between',
  },
  previewYearMonth: {
    width: '30%',
    height: 17,
    backgroundColor: '#F8F9FB',
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    padding: 2,
  },
  previewYearMonthActive: {
    borderColor: colors.today,
    backgroundColor: '#01B7FF12',
  },
  previewYearMonthHeader: {
    width: '60%',
    height: 2.5,
    backgroundColor: '#CBD5E1',
    borderRadius: 1,
    marginBottom: 2,
  },
  previewYearMonthLines: {
    width: '100%',
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 1,
  },
  visualCardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 1,
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
});
