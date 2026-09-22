export type ColorPalette = {
  background: string;
  card: string;
  cardBorder: string;
  cardHeaderBg: string;
  text: string;
  textMuted: string;
  secondary: string;
  subtext: string;
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
  tintBg: string;
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
  chipBg: string;
  chipBorder: string;
  chipActiveText: string;
  chipText: string;
};

export type ColorTheme = ColorPalette;

export const lightColors: ColorPalette = {
  background: '#F3F3F7',
  card: '#FFFFFF',
  cardBorder: '#E5E5EA',
  cardHeaderBg: '#F2F2F7',
  text: '#1C1C1E',
  textMuted: '#8E8E93',
  secondary: '#8E8E93',
  subtext: '#8E8E93',
  dateNumBg: '#E5E5EA',
  dateNumText: '#636366',
  weekendNumBg: '#FFCDC8',
  weekendNumText: '#B25147',
  activeHeaderBg: '#0195FF',
  activeCardBorder: '#0195FF',
  activeHeaderText: '#FFFFFF',
  sundayText: '#FF4B3E',
  sundayNumBg: '#FFF0EE',
  checkboxBorder: '#D1D1D6',
  checkboxBg: '#FFFFFF',
  checkedCheckboxBg: '#D1D1D6',
  checkedCheckboxCheck: '#FFFFFF',
  checkedTaskText: '#8E8E93',
  strikeLine: '#AEAEB2',
  inputBg: '#FFFFFF',
  inputBorder: '#E5E5EA',
  inputPlaceholder: '#8E8E93',
  inputPlusIcon: '#0195FF',
  inputFocusedBorder: '#0195FF',
  inputEnteredText: '#1C1C1E',
  inputCursor: '#0195FF',
  divider: '#E5E5EA',
  today: '#0195FF',
  todayDark: '#0080DE',
  tintBg: '#E6F4FF',
  weekend: '#FF4B3E',
  capsule: '#F2F2F7',
  control: '#F2F2F7',
  danger: '#FF4B3E',
  modalOverlay: 'rgba(0, 0, 0, 0.45)',
  sheetBg: '#F3F3F7',
  sheetBorder: '#E5E5EA',
  dragPill: '#D1D1D6',
  iconPrimary: '#1C1C1E',
  iconSecondary: '#8E8E93',
  headerBackground: '#F3F3F7',
  chipBg: '#F2F2F7',
  chipBorder: '#E5E5EA',
  chipActiveText: '#3C3C43',
  chipText: '#1C1C1E',
};

export const darkColors: ColorPalette = {
  background: '#000000',
  card: '#1C1C1E',
  cardBorder: '#3A3A3C',
  cardHeaderBg: '#2C2C2E',
  text: '#F5F5F5',
  textMuted: '#8E8E8E',
  secondary: '#8E8E8E',
  subtext: '#8E8E8E',
  dateNumBg: '#2C2C2E',
  dateNumText: '#C8C8C8',
  weekendNumBg: '#3A1F22',
  weekendNumText: '#FF9F9A',
  activeHeaderBg: '#0195FF',
  activeCardBorder: '#0195FF',
  activeHeaderText: '#FFFFFF',
  sundayText: '#FF6B61',
  sundayNumBg: '#2D1517',
  checkboxBorder: '#48484A',
  checkboxBg: '#2C2C2E',
  checkedCheckboxBg: '#3A3A3C',
  checkedCheckboxCheck: '#AEAEB2',
  checkedTaskText: '#636366',
  strikeLine: '#48484A',
  inputBg: '#1C1C1E',
  inputBorder: '#3A3A3C',
  inputPlaceholder: '#636366',
  inputPlusIcon: '#8E8E8E',
  inputFocusedBorder: '#0195FF',
  inputEnteredText: '#F5F5F5',
  inputCursor: '#0195FF',
  divider: '#2C2C2E',
  today: '#0195FF',
  todayDark: '#0080DE',
  tintBg: 'rgba(1, 149, 255, 0.15)',
  weekend: '#FF5959',
  capsule: '#2C2C2E',
  control: '#2C2C2E',
  danger: '#FF5959',
  modalOverlay: 'rgba(0, 0, 0, 0.78)',
  sheetBg: '#1C1C1E',
  sheetBorder: '#3A3A3C',
  dragPill: '#48484A',
  iconPrimary: '#F5F5F5',
  iconSecondary: '#8E8E8E',
  headerBackground: '#000000',
  chipBg: '#2C2C2E',
  chipBorder: '#3A3A3C',
  chipActiveText: '#F5F5F5',
  chipText: '#8E8E8E',
};

export const colors: ColorPalette = lightColors;

