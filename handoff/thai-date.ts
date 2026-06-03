/**
 * src/lib/thai-date.ts
 * Thai Buddhist-Era (พ.ศ.) date helpers — ไม่พึ่ง locale ภายนอก
 * ใช้คู่กับ date-fns v4
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
} from "date-fns";

export const BE_OFFSET = 543;

/** ชื่อเดือนไทยแบบเต็ม (index 0 = มกราคม) */
export const THAI_MONTHS_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
] as const;

/** ชื่อเดือนไทยแบบย่อ */
export const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
] as const;

/** ป้ายชื่อวัน (อาทิตย์ก่อน) ให้ตรงกับ startOfWeek แบบ default */
export const THAI_WEEKDAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."] as const;

/** ปี ค.ศ. → พ.ศ. */
export const toBE = (year: number): number => year + BE_OFFSET;

/** "มิถุนายน 2569" */
export function formatThaiMonthYear(date: Date): string {
  return `${THAI_MONTHS_FULL[date.getMonth()]} ${toBE(date.getFullYear())}`;
}

/** "3 มิ.ย. 2569" */
export function formatThaiDate(date: Date): string {
  return `${date.getDate()} ${THAI_MONTHS_SHORT[date.getMonth()]} ${toBE(
    date.getFullYear()
  )}`;
}

/** "3 มิถุนายน 2569" */
export function formatThaiDateLong(date: Date): string {
  return `${date.getDate()} ${THAI_MONTHS_FULL[date.getMonth()]} ${toBE(
    date.getFullYear()
  )}`;
}

/** key ใช้ group record ตามวัน เช่น "2026-06-03" (เก็บเป็น ค.ศ. ฝั่งข้อมูล) */
export function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export interface CalendarCell {
  date: Date;
  inMonth: boolean; // อยู่ในเดือนที่กำลังดูหรือไม่
  key: string;
}

/**
 * สร้างกริดปฏิทิน 6 แถว x 7 = 42 ช่อง (อาทิตย์เริ่มต้น)
 * @param month วันใดก็ได้ในเดือนที่ต้องการแสดง
 */
export function buildCalendarGrid(month: Date): CalendarCell[] {
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((date) => ({
    date,
    inMonth: isSameMonth(date, month),
    key: dayKey(date),
  }));
}

export const nextMonth = (d: Date): Date => addMonths(d, 1);
export const prevMonth = (d: Date): Date => subMonths(d, 1);
export const isToday = (d: Date): boolean => isSameDay(d, new Date());

export { isSameDay, isSameMonth };
