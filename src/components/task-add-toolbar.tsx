import { Pressable, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { colors } from '@/constants/colors';

type Props = {
  important: boolean;
  reminder: boolean;
  noteOpen: boolean;
  onImportant: () => void;
  onReminder: () => void;
  onDate: () => void;
  onNote: () => void;
};

export function TaskAddToolbar({ important, reminder, noteOpen, onImportant, onReminder, onDate, onNote }: Props) {
  return (
    <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, backgroundColor: 'white', borderTopWidth: 1, borderColor: colors.divider }}>
      <ToolbarButton active={important} label="Маңызды" onPress={onImportant}><SunIcon /></ToolbarButton>
      <ToolbarButton active={reminder} label="Еске салғыш" onPress={onReminder}><BellIcon /></ToolbarButton>
      <ToolbarButton label="Күнді таңдау" onPress={onDate}><CalendarIcon /></ToolbarButton>
      <ToolbarButton active={noteOpen} label="Ескертпе" onPress={onNote}><NoteIcon /></ToolbarButton>
    </View>
  );
}

function ToolbarButton({ active, label, onPress, children }: { active?: boolean; label: string; onPress: () => void; children: React.ReactNode }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8} style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? '#E4F8D1' : 'transparent' }}>{children}</Pressable>;
}

const stroke = '#777982';
function SunIcon() { return <Svg width={24} height={24} viewBox="0 0 24 24"><Circle cx="12" cy="12" r="4" stroke={stroke} strokeWidth="1.8" /><Line x1="12" y1="2" x2="12" y2="5" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" /><Line x1="12" y1="19" x2="12" y2="22" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" /><Line x1="2" y1="12" x2="5" y2="12" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" /><Line x1="19" y1="12" x2="22" y2="12" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" /><Line x1="4.9" y1="4.9" x2="7" y2="7" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" /><Line x1="17" y1="17" x2="19.1" y2="19.1" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" /><Line x1="19.1" y1="4.9" x2="17" y2="7" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" /><Line x1="7" y1="17" x2="4.9" y2="19.1" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" /></Svg>; }
function BellIcon() { return <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M5 17h14l-1.7-2.2V10a5.3 5.3 0 0 0-10.6 0v4.8L5 17Z" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><Path d="M10 20h4" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" /></Svg>; }
function CalendarIcon() { return <Svg width={24} height={24} viewBox="0 0 24 24"><Rect x="4" y="5" width="16" height="15" rx="3" stroke={stroke} strokeWidth="1.8" /><Line x1="4" y1="10" x2="20" y2="10" stroke={stroke} strokeWidth="1.8" /><Line x1="8" y1="2.8" x2="8" y2="7" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" /><Line x1="16" y1="2.8" x2="16" y2="7" stroke={stroke} strokeWidth="1.8" /></Svg>; }
function NoteIcon() { return <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M5 4h14v11l-5 5H5V4Z" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" /><Path d="M14 20v-5h5" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" /></Svg>; }
