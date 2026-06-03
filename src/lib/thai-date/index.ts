/**
 * Thai date / Buddhist Era (พุทธศักราช) utilities.
 *
 *   Buddhist year = Gregorian year + 543.
 *   e.g. 2026 CE → 2569 BE.
 *
 * Merge of two sources:
 *   - the original handwritten adapter (Date-based formatters + ISO helpers)
 *   - the handoff/ adapter (calendar grid + number-based toBE + dayKey)
 *
 * Both stay exported to keep all existing imports working.
 */

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  format,
} from 'date-fns';

export const BE_OFFSET = 543;

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

/** Alias matching the handoff/ name. */
export const THAI_WEEKDAYS = THAI_WEEKDAYS_SHORT;

const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * Convert to BE. Overloaded: accepts a `Date` (returns BE year) or a number
 * (returns number + 543). The Date variant is what the original code used;
 * the number variant matches the handoff adapter's signature.
 */
export function toBE(input: Date): number;
export function toBE(input: number): number;
export function toBE(input: Date | number): number {
  return typeof input === 'number' ? input + BE_OFFSET : input.getFullYear() + BE_OFFSET;
}

/** Convert a BE year back to Gregorian. */
export const fromBE = (beYear: number): number => beYear - BE_OFFSET;

/** "03/06/2569" — DD/MM/พ.ศ. */
export const formatThaiShort = (d: Date): string =>
  `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${toBE(d)}`;

/** "3 มิ.ย. 69" — short month + 2-digit BE year. */
export const formatThaiShortMonth = (d: Date): string =>
  `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${String(toBE(d)).slice(-2)}`;

/** "3 มิ.ย. 2569" — short month + full BE year. */
export const formatThaiMedium = (d: Date): string =>
  `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${toBE(d)}`;

/** Handoff alias for the medium form. */
export const formatThaiDate = formatThaiMedium;

/** "3 มิถุนายน 2569" */
export const formatThaiDateLong = (d: Date): string =>
  `${d.getDate()} ${THAI_MONTHS_FULL[d.getMonth()]} ${toBE(d)}`;

/** "3 มิถุนายน พุทธศักราช 2569" — long. */
export const formatThaiLong = (d: Date): string =>
  `${d.getDate()} ${THAI_MONTHS_FULL[d.getMonth()]} พุทธศักราช ${toBE(d)}`;

/** "พ.ศ. 2569" */
export const formatBEYearShort = (d: Date): string => `พ.ศ. ${toBE(d)}`;

/** "พุทธศักราช 2569" */
export const formatBEYearLong = (d: Date): string => `พุทธศักราช ${toBE(d)}`;

/** "มิถุนายน 2569" — caption used by calendar headers. */
export const formatThaiMonthYear = (d: Date): string =>
  `${THAI_MONTHS_FULL[d.getMonth()]} ${toBE(d)}`;

/** Convert Western digits to Thai numerals (๐-๙). */
export const toThaiNumerals = (s: string | number): string =>
  String(s).replace(/\d/g, (c) => '๐๑๒๓๔๕๖๗๘๙'[Number(c)]);

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

// ---------------------------------------------------------------------------
// Calendar grid (from handoff)
// ---------------------------------------------------------------------------

/** `2026-06-03` — key for grouping records by day. */
export const dayKey = (date: Date): string => format(date, 'yyyy-MM-dd');

export interface CalendarCell {
  date: Date;
  inMonth: boolean;
  key: string;
}

/**
 * Build a 6×7 = 42-cell calendar grid for `month`, starting Sunday.
 *
 * Cells outside `month` carry `inMonth = false` so the renderer can fade them.
 * We always pad to exactly 42 cells (6 rows) so the calendar height stays
 * stable month-to-month — months that fit in 5 (or even 4) weeks get extra
 * out-of-month rows tacked on the end.
 */
export function buildCalendarGrid(month: Date): CalendarCell[] {
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const cells = eachDayOfInterval({ start: gridStart, end: gridEnd }).map((date) => ({
    date,
    inMonth: isSameMonth(date, month),
    key: dayKey(date),
  }));
  // Pad to a full 6×7 grid by extending one day at a time from the last cell.
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const next = new Date(last);
    next.setDate(next.getDate() + 1);
    cells.push({ date: next, inMonth: isSameMonth(next, month), key: dayKey(next) });
  }
  return cells;
}

export const nextMonth = (d: Date): Date => addMonths(d, 1);
export const prevMonth = (d: Date): Date => subMonths(d, 1);
export const isToday = (d: Date): boolean => isSameDay(d, new Date());

export { isSameDay, isSameMonth };
