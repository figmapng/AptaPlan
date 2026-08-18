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
            icon="logo-apple"
            label="Apple Reminders синхрондау"
            rightElement={
              isSyncing ? (
                <ActivityIndicator size="small" color={colors.today} />
              ) : (
                <Switch
                  value={!!settings.autoSyncAppleReminders}
                  onValueChange={handleToggleRemindersSync}
                  trackColor={{ false: '#E2E5EB', true: colors.today }}
                  thumbColor="#FFFFFF"
                />
              )
            }
          />
          {settings.autoSyncAppleReminders && (
            <>
              <Divider />
              <SettingRow
                icon="refresh-outline"
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

      {/* Default View Mode Modal */}
      <OptionModal
        visible={defaultViewModeModalOpen}
        title="Әдепкі режим"
        onClose={() => setDefaultViewModeModalOpen(false)}
        options={[
          {
            label: 'Апта (Стандартты)',
            selected: !settings.defaultViewMode || settings.defaultViewMode === 'week',
            onSelect: () => {
              void setPref('defaultViewMode', 'week');
              setDefaultViewModeModalOpen(false);
            },
          },
          {
            label: 'Ай',
            selected: settings.defaultViewMode === 'month',
            onSelect: () => {
              void setPref('defaultViewMode', 'month');
              setDefaultViewModeModalOpen(false);
            },
          },
          {
            label: 'Жыл',
            selected: settings.defaultViewMode === 'year',
            onSelect: () => {
              void setPref('defaultViewMode', 'year');
              setDefaultViewModeModalOpen(false);
            },
          },
        ]}
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

      {/* Last Day Visibility Modal */}
      <OptionModal
        visible={lastDayModalOpen}
        title="Соңғы күннің көрінуі"
        onClose={() => setLastDayModalOpen(false)}
        options={[
          {
            label: 'Үнемі көрінеді (Стандартты)',
            selected: !settings.lastDayVisibility || settings.lastDayVisibility === 'visible',
            onSelect: () => {
              void setPref('lastDayVisibility', 'visible');
              setLastDayModalOpen(false);
            },
          },
          {
            label: 'Жасырын',
            selected: settings.lastDayVisibility === 'hidden',
            onSelect: () => {
              void setPref('lastDayVisibility', 'hidden');
              setLastDayModalOpen(false);
            },
          },
        ]}
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

function SettingRow({
  icon,
  iconColor = '#23262D',
  label,
  labelStyle,
  valueText,
  rightElement,
  onPress,
}: {
  icon: string;
  iconColor?: string;
  label: string;
  labelStyle?: object;
  valueText?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.rowInner}>
      <View style={styles.iconBox}>
        <Ionicons name={icon as any} size={21} color={iconColor} />
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
});
