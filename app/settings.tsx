import React, { useState } from 'react';
import {
  Alert,
  Modal,
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
  const { settings, setPref, clearAll, refresh } = usePlanner();

  // Modals for selection settings
  const [guideOpen, setGuideOpen] = useState(false);
  const [placementModalOpen, setPlacementModalOpen] = useState(false);
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [firstDayModalOpen, setFirstDayModalOpen] = useState(false);
  const [lastDayModalOpen, setLastDayModalOpen] = useState(false);

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
        {/* Бөлім 1: Жалпы */}
        <Section title="Жалпы">
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
                trackColor={{ false: '#E9E9EA', true: '#34C759' }}
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

        {/* Бөлім 2: Деректер */}
        <Section title="Деректер">
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
            iconColor="#FF3B30"
            label="Барлық деректі өшіру"
            labelStyle={{ color: '#FF3B30', fontWeight: '500' }}
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
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function SettingRow({
  icon,
  iconColor = '#1C1C1E',
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
        <Ionicons name={icon as any} size={22} color={iconColor} />
      </View>
      <Text style={[styles.rowLabel, labelStyle]}>
        {label}
      </Text>
      {valueText ? (
        <Text style={styles.valueText} numberOfLines={1}>
          {valueText}
        </Text>
      ) : null}
      {rightElement}
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
  options: { label: string; selected: boolean; onSelect: () => void }[];
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <AnimatedPressable activeScale={1} style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          {options.map((opt, i) => (
            <AnimatedPressable
              key={i}
              activeScale={0.98}
              style={[
                styles.optionItem,
                i < options.length - 1 && styles.optionBorder,
              ]}
              onPress={opt.onSelect}
            >
              <Text
                style={[
                  styles.optionText,
                  opt.selected && styles.optionTextSelected,
                ]}
              >
                {opt.label}
              </Text>
              {opt.selected && (
                <Ionicons name="checkmark" size={20} color="#1C1C1E" />
              )}
            </AnimatedPressable>
          ))}
        </AnimatedPressable>
      </Pressable>
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
    paddingTop: 4,
  },
  sectionContainer: {
    marginTop: 22,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8E8E93',
    marginBottom: 8,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: '#F5F5F7',
    borderRadius: 20,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  rowPressable: {
    minHeight: 54,
    justifyContent: 'center',
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconBox: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  rowLabel: {
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '400',
    color: '#1C1C1E',
    marginRight: 8,
  },
  valueText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8E8E93',
    flexShrink: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#EBEBEF',
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
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderCurve: 'continuous',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 18,
    textAlign: 'center',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    minHeight: 52,
  },
  optionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEF',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#1C1C1E',
  },
  optionTextSelected: {
    fontWeight: '600',
    color: '#1C1C1E',
  },
});
