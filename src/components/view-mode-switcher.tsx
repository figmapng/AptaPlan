import { Pressable, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import type { ViewMode } from '@/components/ViewModeModal';

export function ViewModeSwitcher({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const options: [ViewMode, string][] = [['day', 'Күн'], ['week', 'Апта'], ['month', 'Ай'], ['year', 'Жыл']];
  return (
    <View style={{ alignSelf: 'center', height: 42, flexDirection: 'row', backgroundColor: colors.control, borderRadius: 21, padding: 3 }}>
      {options.map(([key, label]) => (
        <Pressable
          key={key}
          onPress={() => onChange(key)}
          style={{ minWidth: 60, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: value === key ? 'white' : 'transparent' }}
        >
          <Text style={{ fontSize: 14, lineHeight: 16, fontWeight: '600', color: value === key ? colors.text : colors.secondary }}>
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
