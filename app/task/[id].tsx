import { useEffect, useState } from 'react';
import { Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { TaskForm } from '@/components/task-form';
import { usePlanner } from '@/store/planner-store';
import { useI18n } from '@/i18n/use-i18n';
import type { Task } from '@/types/task';

export default function EditTask() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { get, update, remove } = usePlanner();
  const { t } = useI18n();
  const [task, setTask] = useState<Task | null>();

  useEffect(() => {
    void get(id).then(setTask);
  }, [id, get]);

  if (task === undefined) return <ActivityIndicator style={{ flex: 1 }} />;
  if (task === null) return null;

  const confirm = () =>
    Alert.alert(
      t.alerts.deleteTaskTitle,
      t.alerts.deleteTaskMessage,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete,
          style: 'destructive',
          onPress: async () => {
            await remove(id);
            router.back();
          },
        },
      ]
    );

  return (
    <TaskForm
      initial={task}
      onSave={async (input) => {
        await update(id, input);
        router.back();
      }}
      onDelete={confirm}
    />
  );
}

