/**
 * Thai date / Buddhist Era (พุทธศักราช) utilities.
 *
 * Buddhist year = Gregorian year + 543.
 *   e.g. 2026 CE → 2569 BE.
 *
 * All formatters take a `Date` (local time) and return strings safe for UI.
 */

const THAI_MONTHS_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
] as const;

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
] as const;

const THAI_WEEKDAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'] as const;
const THAI_WEEKDAYS_FULL = [
  'อาทิตย์',
  'จันทร์',
  'อังคาร',
  'พุธ',
  'พฤหัสบดี',
  'ศุกร์',
  'เสาร์',
] as const;

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Convert a Gregorian year to Buddhist Era. */
export const toBE = (d: Date): number => d.getFullYear() + 543;

/** Convert a BE year back to Gregorian. */
export const fromBE = (beYear: number): number => beYear - 543;

/** "03/06/2569" — DD/MM/พ.ศ. */
export const formatThaiShort = (d: Date): string =>
  `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${toBE(d)}`;

/** "3 มิ.ย. 69" — short month + 2-digit BE year. */
export const formatThaiShortMonth = (d: Date): string =>
  `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${String(toBE(d)).slice(-2)}`;

/** "3 มิ.ย. 2569" — short month + full BE year. */
export const formatThaiMedium = (d: Date): string =>
  `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${toBE(d)}`;

/** "3 มิถุนายน พุทธศักราช 2569" — long. */
export const formatThaiLong = (d: Date): string =>
  `${d.getDate()} ${THAI_MONTHS_FULL[d.getMonth()]} พุทธศักราช ${toBE(d)}`;

/** "พ.ศ. 2569" */
export const formatBEYearShort = (d: Date): string => `พ.ศ. ${toBE(d)}`;

/** "พุทธศักราช 2569" */
export const formatBEYearLong = (d: Date): string => `พุทธศักราช ${toBE(d)}`;

/** "มิถุนายน 2569" — month-and-year caption for calendar headers. */
export const formatThaiMonthYear = (d: Date): string =>
  `${THAI_MONTHS_FULL[d.getMonth()]} ${toBE(d)}`;

/** Convert Western digits to Thai numerals (๐-๙). */
export const toThaiNumerals = (s: string | number): string =>
  String(s).replace(/\d/g, (c) => '๐๑๒๓๔๕๖๗๘๙'[Number(c)]);

/** Day-of-week abbreviation (Sun → "อา.") */
export const thaiWeekdayShort = (d: Date): string => THAI_WEEKDAYS_SHORT[d.getDay()];
export const thaiWeekdayLong = (d: Date): string => THAI_WEEKDAYS_FULL[d.getDay()];

export const thaiMonthShort = (monthIndex: number): string => THAI_MONTHS_SHORT[monthIndex];
export const thaiMonthFull = (monthIndex: number): string => THAI_MONTHS_FULL[monthIndex];

export {
  THAI_MONTHS_FULL,
  THAI_MONTHS_SHORT,
  THAI_WEEKDAYS_SHORT,
  THAI_WEEKDAYS_FULL,
};

/** ISO `YYYY-MM-DD` in local time (Supabase `date` columns are timezone-less). */
export const toLocalIsoDate = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** Parse `YYYY-MM-DD` as a local-midnight Date. */
export const fromLocalIsoDate = (iso: string): Date => {
  const [y, m, day] = iso.split('-').map(Number);
  return new Date(y, m - 1, day);
};
