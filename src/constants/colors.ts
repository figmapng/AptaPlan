export type ColorTheme = {
  background: string;
  card: string;
  cardBorder: string;
  text: string;
  textMuted: string;
  secondary: string;
  dateNumBg: string;
  dateNumText: string;
  weekendNumBg: string;
  weekendNumText: string;
  activeHeaderBg: string;
  activeCardBorder: string;
  activeHeaderText: string;
  sundayText: string;
  sundayNumBg: string;
  checkboxBorder: string;
  checkboxBg: string;
  checkedCheckboxBg: string;
  checkedCheckboxCheck: string;
  checkedTaskText: string;
  strikeLine: string;
  inputBg: string;
  inputBorder: string;
  inputPlaceholder: string;
  inputPlusIcon: string;
  inputFocusedBorder: string;
  inputEnteredText: string;
  inputCursor: string;
  divider: string;
  today: string;
  todayDark: string;
  weekend: string;
  capsule: string;
  control: string;
  danger: string;
  modalOverlay: string;
  sheetBg: string;
  sheetBorder: string;
  dragPill: string;
  iconPrimary: string;
  iconSecondary: string;
  headerBackground: string;
  subtext: string;
};

export const lightColors: ColorTheme = {
  background: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#D9DDE5',
  text: '#23262D',
  textMuted: '#94A3B8',
  secondary: '#707684',
  dateNumBg: '#DCE0E5',
  dateNumText: '#565B66',
  weekendNumBg: '#FFCDC8',
  weekendNumText: '#B25147',
  activeHeaderBg: '#40C9FF',
  activeCardBorder: '#40C9FF',
  activeHeaderText: '#FFFFFF',
  sundayText: '#FF4B3E',
  sundayNumBg: '#FFF0EE',
  checkboxBorder: '#D7DCE3',
  checkboxBg: '#FFFFFF',
  checkedCheckboxBg: '#C8CED8',
  checkedCheckboxCheck: '#FFFFFF',
  checkedTaskText: '#ADB3BD',
  strikeLine: '#8F97A4',
  inputBg: '#F7F8FA',
  inputBorder: '#ECEEF2',
  inputPlaceholder: '#9AA1AF',
  inputPlusIcon: '#7D8796',
  inputFocusedBorder: '#40C9FF',
  inputEnteredText: '#23262D',
  inputCursor: '#40C9FF',
  divider: '#D9DDE5',
  today: '#40C9FF',
  todayDark: '#00AEEF',
  weekend: '#FF4B3E',
  capsule: '#F1F3F6',
  control: '#EDEFF2',
  danger: '#FF4B3E',
  modalOverlay: 'rgba(0, 0, 0, 0.45)',
  sheetBg: '#FFFFFF',
  sheetBorder: '#E5E7EB',
  dragPill: '#D1D5DB',
  iconPrimary: '#23262D',
  iconSecondary: '#707684',
  headerBackground: '#FFFFFF',
  subtext: '#8E8E93',
};

export const darkColors: ColorTheme = {
  background: '#12141A',
  card: '#1A1E26',
  cardBorder: '#282D3B',
  text: '#F1F3F7',
  textMuted: '#758195',
  secondary: '#8E98A8',
  dateNumBg: '#2B313F',
  dateNumText: '#B0B8C8',
  weekendNumBg: '#3D2024',
  weekendNumText: '#FFA6A0',
  activeHeaderBg: '#0284C7',
  activeCardBorder: '#38BDF8',
  activeHeaderText: '#FFFFFF',
  sundayText: '#FF6B61',
  sundayNumBg: '#351B1E',
  checkboxBorder: '#3E4656',
  checkboxBg: '#1A1E26',
  checkedCheckboxBg: '#343B4A',
  checkedCheckboxCheck: '#A8B3C4',
  checkedTaskText: '#646E82',
  strikeLine: '#525C70',
  inputBg: '#161922',
  inputBorder: '#282D3B',
  inputPlaceholder: '#687284',
  inputPlusIcon: '#8E98A8',
  inputFocusedBorder: '#38BDF8',
  inputEnteredText: '#F1F3F7',
  inputCursor: '#38BDF8',
  divider: '#252A38',
  today: '#38BDF8',
  todayDark: '#0284C7',
  weekend: '#FF5959',
  capsule: '#222734',
  control: '#252A38',
  danger: '#FF5959',
  modalOverlay: 'rgba(0, 0, 0, 0.72)',
  sheetBg: '#1A1E26',
  sheetBorder: '#282D3B',
  dragPill: '#4B5563',
  iconPrimary: '#F1F3F7',
  iconSecondary: '#8E98A8',
  headerBackground: '#12141A',
  subtext: '#8E98A8',
};

// Default export matching lightColors for backward compatibility
export const colors = lightColors;


