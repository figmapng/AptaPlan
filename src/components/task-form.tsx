import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/hooks/use-theme';
import { fromDateKey, toDateKey } from '@/services/date-service';
import { useI18n } from '@/i18n/use-i18n';
import type { RepeatType, Task, TaskInput } from '@/types/task';

export function TaskForm({
  initial,
  onSave,
  onDelete,
}: {
  initial?: Task;
  onSave: (v: TaskInput) => Promise<void>;
  onDelete?: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [date, setDate] = useState(initial?.date ?? toDateKey(new Date()));
  const [time, setTime] = useState(initial?.time ?? null);
  const [important, setImportant] = useState(initial?.priority === 'important');
  const [repeatType, setRepeat] = useState<RepeatType>((initial?.repeatType as RepeatType) ?? 'none');
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setTitle(initial.title);
      setNote(initial.note ?? '');
      setDate(initial.date);
      setTime(initial.time || null);
      setImportant(initial.priority === 'important');
      setRepeat((initial.repeatType as RepeatType) || 'none');
    }
  }, [initial]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave({
        title,
        note: note || null,
        date,
        time,
        priority: important ? 'important' : 'normal',
        repeatType,
        notificationOffset: null,
      });
    } catch {
      Alert.alert(t.alerts.saveErrorTitle, t.alerts.saveErrorMessage);
    } finally {
      setSaving(false);
    }
  };

  const repeatOptions: [RepeatType, string][] = [
    ['none', t.repeat.none],
    ['daily', t.repeat.daily],
    ['weekly', t.repeat.weekly],
    ['monthly', t.repeat.monthly],
  ];

  const inputStyle = useMemo(
    () => ({
      backgroundColor: colors.inputBg,
      borderRadius: 14,
      borderCurve: 'continuous' as const,
      paddingHorizontal: 15,
      paddingVertical: 14,
      fontSize: 17,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    }),
    [colors.inputBg, colors.text, colors.inputBorder]
  );

  const rowStyle = useMemo(
    () => ({
      ...inputStyle,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    }),
    [inputStyle]
  );

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, gap: 18, backgroundColor: colors.background }}
      >
        <Field label={t.task.taskPlaceholder} labelColor={colors.secondary}>
          <TextInput
            autoFocus={!initial}
            value={title}
            onChangeText={setTitle}
            placeholder={t.task.whatNeedsToBeDone}
            placeholderTextColor={colors.inputPlaceholder}
            style={inputStyle}
          />
        </Field>

        <Field label={t.task.note} labelColor={colors.secondary}>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            placeholder={t.task.notePlaceholder}
            placeholderTextColor={colors.inputPlaceholder}
            style={[inputStyle, { minHeight: 90, textAlignVertical: 'top' }]}
          />
        </Field>

        <Field label={t.date.date} labelColor={colors.secondary}>
          <Pressable onPress={() => setShowDate(true)} style={inputStyle}>
            <Text style={{ fontSize: 17, color: colors.text }}>{date}</Text>
          </Pressable>
        </Field>
        {showDate && (
          <DateTimePicker
            value={fromDateKey(date)}
            mode="date"
            onChange={(_, d) => {
              setShowDate(false);
              if (d) setDate(toDateKey(d));
            }}
          />
        )}

        <Field label={t.task.timeOptional} labelColor={colors.secondary}>
          <Pressable onPress={() => setShowTime(true)} style={inputStyle}>
            <Text style={{ fontSize: 17, color: time ? colors.text : colors.secondary }}>
              {time ?? t.time.pickTime}
            </Text>
          </Pressable>
        </Field>
        {showTime && (
          <DateTimePicker
            value={new Date()}
            mode="time"
            onChange={(_, d) => {
              setShowTime(false);
              if (d) {
                setTime(
                  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                );
              }
            }}
          />
        )}

        <View style={rowStyle}>
          <Text style={{ fontSize: 17, color: colors.text }}>{t.task.important}</Text>
          <Switch value={important} onValueChange={setImportant} trackColor={{ true: colors.today }} />
        </View>

        <Field label={t.repeat.title} labelColor={colors.secondary}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {repeatOptions.map(([v, l]) => (
              <Pressable
                key={v}
                onPress={() => setRepeat(v)}
                style={{
                  paddingHorizontal: 13,
                  paddingVertical: 10,
                  borderRadius: 18,
                  backgroundColor: repeatType === v ? colors.text : colors.capsule,
                }}
              >
                <Text style={{ color: repeatType === v ? colors.background : colors.text }}>{l}</Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <Pressable
          disabled={!title.trim() || saving}
          onPress={save}
          style={{
            height: 52,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: title.trim() ? colors.today : colors.control,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 18 }}>
            {saving ? t.common.saving : t.common.save}
          </Text>
        </Pressable>

        {onDelete && (
          <Pressable
            onPress={onDelete}
            style={{ height: 50, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: colors.danger, fontSize: 17, fontWeight: '600' }}>
              {t.alerts.deleteTaskTitle}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, labelColor, children }: { label: string; labelColor: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: labelColor }}>{label}</Text>
      {children}
    </View>
  );
}

