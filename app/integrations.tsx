import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { usePlanner } from '@/store/planner-store';
import { useTheme } from '@/hooks/use-theme';
import { AnimatedPressable } from '@/components/AnimatedPressable';

export default function IntegrationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const {
    settings,
    setPref,
    syncAppleReminders,
    enableAppleReminders,
    disableAppleReminders,
  } = usePlanner();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState<string | null>(null);

  const handleToggleRemindersSync = async (enable: boolean) => {
    if (settings.haptics) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

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
    if (settings.haptics) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';

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
              router.replace('/settings');
            }
          }}
          style={[styles.backButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
          accessibilityLabel="Артқа қайту"
        >
          <Ionicons name="chevron-back" size={20} color={colors.secondary} style={{ marginLeft: -1 }} />
        </AnimatedPressable>

        <Text style={[styles.headerTitle, { color: colors.text }]}>Интеграциялар</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        {/* iOS Section */}
        {isIOS && (
          <>
            <View style={styles.sectionHeaderContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Apple қызметтері</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.secondary }]}>
                iOS жүйелік қосымшаларымен синхрондау
              </Text>
            </View>

            <Section>
              <IntegrationRow
                customIcon={<AppleRemindersIcon size={22} />}
                label="Apple Reminders"
                subtitle="Еске салғыштар тізімінен тапсырмаларды жүктеу"
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
                  <IntegrationRow
                    icon="refresh-circle-outline"
                    label="Авто-синхрондау"
                    subtitle="Қосымша ашылғанда автоматты жаңарту"
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
                  <IntegrationRow
                    icon="sync-outline"
                    label="Қазір синхрондау"
                    subtitle={
                      settings.lastRemindersSyncTime
                        ? `Соңғы синхрондау: ${new Date(settings.lastRemindersSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : undefined
                    }
                    valueText={isSyncing ? 'Жүктелуде...' : syncStatusText || undefined}
                    onPress={handleSyncReminders}
                  />
                </>
              )}
            </Section>

            <Section>
              <IntegrationRow
                icon="calendar-outline"
                label="Apple Calendar (Күнтізбе)"
                subtitle="Жүйелік күнтізбе оқиғаларымен байланыстыру"
                badgeText="Жақында"
              />
            </Section>
          </>
        )}

        {/* Android Section */}
        {(isAndroid || !isIOS) && (
          <>
            <View style={styles.sectionHeaderContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Android қызметтері</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.secondary }]}>
                Google және құрылғының жүйелік күнтізбесі
              </Text>
            </View>

            <Section>
              <IntegrationRow
                customIcon={<GoogleCalendarIcon size={22} />}
                label="Google Calendar / Күнтізбе"
                subtitle="Android жүйелік күнтізбесімен синхрондау"
                badgeText="Жақында"
              />
              <Divider />
              <IntegrationRow
                customIcon={<GoogleTasksIcon size={22} />}
                label="Google Tasks"
                subtitle="Google тапсырмаларымен синхрондау"
                badgeText="Жақында"
              />
            </Section>
          </>
        )}

        {/* Info Card */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
          ]}
        >
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.today} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>Қауіпсіздік және құпиялылық</Text>
            <Text style={[styles.infoDesc, { color: colors.secondary }]}>
              Барлық синхрондау тек сіздің құрылғыңызда офлайн жүзеге асады. Деректеріңіз сыртқы серверлерге жіберілмейді.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
      {children}
    </View>
  );
}

function IntegrationRow({
  icon,
  iconColor,
  customIcon,
  label,
  subtitle,
  valueText,
  badgeText,
  rightElement,
  onPress,
}: {
  icon?: string;
  iconColor?: string;
  customIcon?: React.ReactNode;
  label: string;
  subtitle?: string;
  valueText?: string;
  badgeText?: string;
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

      <View style={styles.labelContainer}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {subtitle && (
          <Text style={[styles.rowSubtitle, { color: colors.secondary }]}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.rowRight}>
        {badgeText && (
          <View style={[styles.badge, { backgroundColor: colors.cardBorder }]}>
            <Text style={[styles.badgeText, { color: colors.secondary }]}>{badgeText}</Text>
          </View>
        )}
        {valueText && (
          <Text style={[styles.valueText, { color: colors.secondary }]} numberOfLines={1}>
            {valueText}
          </Text>
        )}
        {rightElement}
        {onPress && !rightElement && (
          <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
        )}
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

function AppleRemindersIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="4.5" cy="5" r="2.75" fill="#FF9500" />
      <Path d="M10 5h11" stroke="#8E8E93" strokeWidth="2.2" strokeLinecap="round" />

      <Circle cx="4.5" cy="12" r="2.75" fill="#007AFF" />
      <Path d="M10 12h11" stroke="#8E8E93" strokeWidth="2.2" strokeLinecap="round" />

      <Circle cx="4.5" cy="19" r="2.75" fill="#FF3B30" />
      <Path d="M10 19h11" stroke="#8E8E93" strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  );
}

function GoogleCalendarIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="17" rx="3" fill="#4285F4" />
      <Rect x="3" y="4" width="18" height="5" rx="2" fill="#1967D2" />
      <Circle cx="8" cy="13" r="1.5" fill="#FFFFFF" />
      <Circle cx="12" cy="13" r="1.5" fill="#FFFFFF" />
      <Circle cx="16" cy="13" r="1.5" fill="#FFFFFF" />
      <Circle cx="8" cy="17" r="1.5" fill="#FFFFFF" />
      <Circle cx="12" cy="17" r="1.5" fill="#FFFFFF" />
      <Circle cx="16" cy="17" r="1.5" fill="#FFFFFF" />
    </Svg>
  );
}

function GoogleTasksIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill="#4285F4" />
      <Path
        d="M7.5 12.5L10.5 15.5L16.5 8.5"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingTop: 12,
    gap: 16,
  },
  sectionHeaderContainer: {
    gap: 2,
    marginTop: 4,
    marginBottom: -4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '400',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  rowPressable: {
    minHeight: 52,
    justifyContent: 'center',
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconBox: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  labelContainer: {
    flex: 1,
    gap: 2,
    marginRight: 8,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  rowSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  valueText: {
    fontSize: 14,
    fontWeight: '400',
  },
  divider: {
    height: 1,
    marginLeft: 56,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoDesc: {
    fontSize: 12.5,
    lineHeight: 18,
  },
});
