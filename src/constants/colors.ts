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
  background: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#D9DDE5',
  cardHeaderBg: '#EDEFF2',
  text: '#23262D',
  textMuted: '#94A3B8',
  secondary: '#707684',
  subtext: '#8E8E93',
  dateNumBg: '#DCE0E5',
  dateNumText: '#565B66',
  weekendNumBg: '#FFCDC8',
  weekendNumText: '#B25147',
  activeHeaderBg: '#01B7FF',
  activeCardBorder: '#01B7FF',
  activeHeaderText: '#FFFFFF',
  sundayText: '#FF4B3E',
  sundayNumBg: '#FFF0EE',
  checkboxBorder: '#D7DCE3',
  checkboxBg: '#FFFFFF',
  checkedCheckboxBg: '#C8CED8',
  checkedCheckboxCheck: '#FFFFFF',
  checkedTaskText: '#ADB3BD',
  strikeLine: '#8F97A4',
  inputBg: '#F8FAFC',
  inputBorder: '#EDF1F5',
  inputPlaceholder: '#9AA1AF',
  inputPlusIcon: '#01B7FF',
  inputFocusedBorder: '#01B7FF',
  inputEnteredText: '#23262D',
  inputCursor: '#01B7FF',
  divider: '#D9DDE5',
  today: '#01B7FF',
  todayDark: '#009FD6',
  tintBg: '#EAF8FF',
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
  chipBg: '#F3F4F6',
  chipBorder: '#ECEEF2',
  chipActiveText: '#4B5563',
  chipText: '#23262D',
};

export const darkColors: ColorPalette = {
  background: '#10131A',
  card: '#1C222E',
  cardBorder: '#2C3446',
  cardHeaderBg: '#232B3A',
  text: '#F3F5F9',
  textMuted: '#7E8B9F',
  secondary: '#94A0B4',
  subtext: '#94A0B4',
  dateNumBg: '#2A3344',
  dateNumText: '#C4CCD9',
  weekendNumBg: '#3F1F24',
  weekendNumText: '#FFAAA4',
  activeHeaderBg: '#0284C7',
  activeCardBorder: '#38BDF8',
  activeHeaderText: '#FFFFFF',
  sundayText: '#FF6B61',
  sundayNumBg: '#351B1E',
  checkboxBorder: '#4A556B',
  checkboxBg: '#242C3C',
  checkedCheckboxBg: '#3D485C',
  checkedCheckboxCheck: '#BAC5D5',
  checkedTaskText: '#707C92',
  strikeLine: '#546075',
  inputBg: '#1C222E',
  inputBorder: '#2C3446',
  inputPlaceholder: '#7A869A',
  inputPlusIcon: '#94A0B4',
  inputFocusedBorder: '#38BDF8',
  inputEnteredText: '#F3F5F9',
  inputCursor: '#38BDF8',
  divider: '#283142',
  today: '#38BDF8',
  todayDark: '#0284C7',
  tintBg: '#162032',
  weekend: '#FF5959',
  capsule: '#242C3C',
  control: '#283142',
  danger: '#FF5959',
  modalOverlay: 'rgba(0, 0, 0, 0.72)',
  sheetBg: '#1C222E',
  sheetBorder: '#2C3446',
  dragPill: '#4E5A70',
  iconPrimary: '#F3F5F9',
  iconSecondary: '#94A0B4',
  headerBackground: '#10131A',
  chipBg: '#242C3C',
  chipBorder: '#2C3446',
  chipActiveText: '#F3F5F9',
  chipText: '#94A0B4',
};

export const colors: ColorPalette = lightColors;

export const darkColors: ColorTheme = {
  background: '#10131A',
  card: '#1C222E',
  cardBorder: '#2C3446',
  text: '#F3F5F9',
  textMuted: '#7E8B9F',
  secondary: '#94A0B4',
  dateNumBg: '#2A3344',
  dateNumText: '#C4CCD9',
  weekendNumBg: '#3F1F24',
  weekendNumText: '#FFAAA4',
  activeHeaderBg: '#0284C7',
  activeCardBorder: '#38BDF8',
  activeHeaderText: '#FFFFFF',
  sundayText: '#FF6B61',
  sundayNumBg: '#351B1E',
  checkboxBorder: '#4A556B',
  checkboxBg: '#242C3C',
  checkedCheckboxBg: '#3D485C',
  checkedCheckboxCheck: '#BAC5D5',
  checkedTaskText: '#707C92',
  strikeLine: '#546075',
  inputBg: '#1C222E',
  inputBorder: '#2C3446',
  inputPlaceholder: '#7A869A',
  inputPlusIcon: '#94A0B4',
  inputFocusedBorder: '#38BDF8',
  inputEnteredText: '#F3F5F9',
  inputCursor: '#38BDF8',
  divider: '#283142',
  today: '#38BDF8',
  todayDark: '#0284C7',
  weekend: '#FF5959',
  capsule: '#242C3C',
  control: '#283142',
  danger: '#FF5959',
  modalOverlay: 'rgba(0, 0, 0, 0.72)',
  sheetBg: '#1C222E',
  sheetBorder: '#2C3446',
  dragPill: '#4E5A70',
  iconPrimary: '#F3F5F9',
  iconSecondary: '#94A0B4',
  headerBackground: '#10131A',
  subtext: '#94A0B4',
  chipBg: '#242C3C',
  chipBorder: '#2C3446',
  chipActiveText: '#F3F5F9',
  chipText: '#94A0B4',
};

// Default export matching lightColors for backward compatibility
export const colors = lightColors;
