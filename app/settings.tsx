import { Alert, Animated, ScrollView, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { colors } from '@/constants/colors';
import { usePlanner } from '@/store/planner-store';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useEffect, useRef, useState } from 'react';
import { UserGuideModal } from '@/components/UserGuideModal';

export default function Settings() {
  const { settings, setPref, clearAll } = usePlanner();
  const [guideOpen, setGuideOpen] = useState(false);

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

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, gap: 20 }}>
        <Section title="Аптаның бірінші күні">
          <Row label="Дүйсенбі">
            <Text style={{ color: colors.todayDark, fontWeight: '600' }}>Белсенді</Text>
          </Row>
        </Section>

        <Section title="Көмек">
          <AnimatedPressable activeScale={0.97} onPress={() => setGuideOpen(true)} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.today, fontSize: 17, fontWeight: '600' }}>📖 Пайдалану гиды</Text>
            <Text style={{ color: colors.secondary, fontSize: 16 }}>→</Text>
          </AnimatedPressable>
        </Section>

        <Section title="Орындалған тапсырмалар">
          <Choice
            value={settings.completedPlacement === 'keep'}
            label="Орнында қалдыру"
            onPress={() => setPref('completedPlacement', 'keep')}
          />
          <Choice
            value={settings.completedPlacement === 'bottom'}
            label="Төменге жылжыту"
            onPress={() => setPref('completedPlacement', 'bottom')}
          />
        </Section>

        <Section title="Қолданба">
          <Row label="Haptic feedback">
            <Switch
              value={settings.haptics}
              onValueChange={(v) => setPref('haptics', v)}
              trackColor={{ true: colors.today }}
            />
          </Row>
        </Section>

        <Section title="Автоматты сұрыптау">
          <Choice
            value={settings.sortMode === 'time'}
            label="Уақыт бойынша"
            onPress={() => setPref('sortMode', 'time')}
          />
          <Choice
            value={settings.sortMode === 'manual'}
            label="Қолмен"
            onPress={() => setPref('sortMode', 'manual')}
          />
        </Section>

        <Section title="Деректер">
          <AnimatedPressable activeScale={0.97} onPress={clear} style={{ padding: 16 }}>
            <Text style={{ color: colors.danger, fontSize: 17, fontWeight: '600' }}>Барлық деректі өшіру</Text>
          </AnimatedPressable>
        </Section>

        <Section title="Қосымша туралы">
          <Row label="Нұсқа">
            <Text style={{ color: colors.secondary }}>{Constants.expoConfig?.version ?? '1.0.0'}</Text>
          </Row>
        </Section>
      </ScrollView>

      <UserGuideModal visible={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.secondary, fontWeight: '600', paddingHorizontal: 6 }}>{title}</Text>
      <View style={{ backgroundColor: 'white', borderRadius: 17, borderCurve: 'continuous', overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ minHeight: 54, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.divider }}>
      <Text style={{ fontSize: 17 }}>{label}</Text>
      {children}
    </View>
  );
}

function Choice({ value, label, onPress }: { value: boolean; label: string; onPress: () => void }) {
  const checkScale = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(checkScale, {
      toValue: value ? 1 : 0,
      friction: 6,
      tension: 180,
      useNativeDriver: true,
    }).start();
  }, [value, checkScale]);

  return (
    <AnimatedPressable
      activeScale={0.98}
      onPress={onPress}
      style={{
        minHeight: 54,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
      }}
    >
      <Text style={{ fontSize: 17, fontWeight: value ? '600' : '400' }}>{label}</Text>
      {value && (
        <Animated.Text style={{ fontSize: 20, color: colors.todayDark, fontWeight: '800', transform: [{ scale: checkScale }] }}>
          ✓
        </Animated.Text>
      )}
    </AnimatedPressable>
  );
}
