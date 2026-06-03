import { describe, it, expect } from 'vitest';
import {
  toBE,
  fromBE,
  formatThaiShort,
  formatThaiShortMonth,
  formatThaiMedium,
  formatThaiLong,
  formatBEYearShort,
  formatBEYearLong,
  formatThaiMonthYear,
  toThaiNumerals,
  thaiWeekdayShort,
  thaiWeekdayLong,
  toLocalIsoDate,
  fromLocalIsoDate,
} from './index';

describe('Thai date / Buddhist Era', () => {
  describe('toBE / fromBE', () => {
    it('converts Gregorian → BE (+543)', () => {
      expect(toBE(new Date(2026, 5, 3))).toBe(2569); // 3 June 2026 → BE 2569
      expect(toBE(new Date(2000, 0, 1))).toBe(2543);
      expect(toBE(new Date(1999, 11, 31))).toBe(2542);
    });

    it('round-trips with fromBE', () => {
      const d = new Date(2026, 5, 3);
      expect(fromBE(toBE(d))).toBe(d.getFullYear());
    });
  });

  describe('formatters', () => {
    const sample = new Date(2026, 5, 3); // 3 June 2026 = พ.ศ. 2569

    it('formatThaiShort: DD/MM/BE', () => {
      expect(formatThaiShort(sample)).toBe('03/06/2569');
    });

    it('formatThaiShortMonth: D mmm YY', () => {
      expect(formatThaiShortMonth(sample)).toBe('3 มิ.ย. 69');
    });

    it('formatThaiMedium: D mmm YYYY', () => {
      expect(formatThaiMedium(sample)).toBe('3 มิ.ย. 2569');
    });

    it('formatThaiLong: full long form', () => {
      expect(formatThaiLong(sample)).toBe('3 มิถุนายน พุทธศักราช 2569');
    });

    it('formatBEYearShort / Long', () => {
      expect(formatBEYearShort(sample)).toBe('พ.ศ. 2569');
      expect(formatBEYearLong(sample)).toBe('พุทธศักราช 2569');
    });

    it('formatThaiMonthYear (caption)', () => {
      expect(formatThaiMonthYear(sample)).toBe('มิถุนายน 2569');
    });
  });

  describe('edge cases', () => {
    it('leap year — 29 ก.พ. 2567 (2024 CE)', () => {
      const d = new Date(2024, 1, 29);
      expect(formatThaiShort(d)).toBe('29/02/2567');
      expect(formatThaiLong(d)).toBe('29 กุมภาพันธ์ พุทธศักราช 2567');
    });

    it('first day of year (1 ม.ค.)', () => {
      const d = new Date(2026, 0, 1);
      expect(formatThaiShort(d)).toBe('01/01/2569');
      expect(formatThaiMedium(d)).toBe('1 ม.ค. 2569');
    });

    it('last day of year (31 ธ.ค.)', () => {
      const d = new Date(2026, 11, 31);
      expect(formatThaiShort(d)).toBe('31/12/2569');
      expect(formatThaiMedium(d)).toBe('31 ธ.ค. 2569');
    });
  });

  describe('Thai numerals', () => {
    it('converts Western digits to Thai', () => {
      expect(toThaiNumerals(2569)).toBe('๒๕๖๙');
      expect(toThaiNumerals('22,512 km')).toBe('๒๒,๕๑๒ km');
      expect(toThaiNumerals('0123456789')).toBe('๐๑๒๓๔๕๖๗๘๙');
    });
  });

  describe('weekdays', () => {
    it('returns Thai weekday for Sunday (0) and Saturday (6)', () => {
      // 7 June 2026 is a Sunday
      expect(thaiWeekdayShort(new Date(2026, 5, 7))).toBe('อา.');
      expect(thaiWeekdayLong(new Date(2026, 5, 7))).toBe('อาทิตย์');
      // 6 June 2026 is a Saturday
      expect(thaiWeekdayShort(new Date(2026, 5, 6))).toBe('ส.');
    });
  });

  describe('ISO date helpers', () => {
    it('toLocalIsoDate produces YYYY-MM-DD', () => {
      expect(toLocalIsoDate(new Date(2026, 5, 3))).toBe('2026-06-03');
      expect(toLocalIsoDate(new Date(2026, 0, 1))).toBe('2026-01-01');
      expect(toLocalIsoDate(new Date(2026, 11, 31))).toBe('2026-12-31');
    });

    it('fromLocalIsoDate parses to local-midnight Date', () => {
      const d = fromLocalIsoDate('2026-06-03');
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(5);
      expect(d.getDate()).toBe(3);
    });

    it('round-trips ISO', () => {
      const iso = '2024-02-29';
      expect(toLocalIsoDate(fromLocalIsoDate(iso))).toBe(iso);
    });
  });
});
