/** src/lib/thai-date.test.ts */
import { describe, it, expect } from "vitest";
import {
  formatThaiMonthYear,
  formatThaiDate,
  toBE,
  buildCalendarGrid,
  THAI_WEEKDAYS,
} from "./thai-date";

describe("thai-date adapter", () => {
  it("แปลงปี ค.ศ. → พ.ศ.", () => {
    expect(toBE(2026)).toBe(2569);
  });

  it("จัดรูปเดือน/ปีไทย", () => {
    expect(formatThaiMonthYear(new Date(2026, 5, 1))).toBe("มิถุนายน 2569");
  });

  it("จัดรูปวันที่ย่อ", () => {
    expect(formatThaiDate(new Date(2026, 5, 3))).toBe("3 มิ.ย. 2569");
  });

  it("มีป้ายชื่อวัน 7 วัน เริ่มอาทิตย์", () => {
    expect(THAI_WEEKDAYS).toHaveLength(7);
    expect(THAI_WEEKDAYS[0]).toBe("อา.");
  });
});

describe("calendar grid", () => {
  const grid = buildCalendarGrid(new Date(2026, 5, 1)); // มิถุนายน 2026

  it("มี 42 ช่อง (6 แถว x 7)", () => {
    expect(grid).toHaveLength(42);
  });

  it("ช่องแรกเป็น 31 พ.ค. (เดือนอื่น) เพราะ 1 มิ.ย. 2026 = วันจันทร์", () => {
    expect(grid[0].date.getDate()).toBe(31);
    expect(grid[0].inMonth).toBe(false);
    expect(grid[1].date.getDate()).toBe(1);
    expect(grid[1].inMonth).toBe(true);
  });

  it("นับวันในเดือนได้ 30 วัน", () => {
    expect(grid.filter((c) => c.inMonth)).toHaveLength(30);
  });
});
