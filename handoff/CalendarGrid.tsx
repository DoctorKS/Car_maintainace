/**
 * src/components/CalendarGrid.tsx
 * ปฏิทินรายเดือน ธีมฟ้า/ขาว — วันนี้เป็นวงกลม brand, วันที่มี record มีจุด pink
 */
import { useMemo } from "react";
import {
  buildCalendarGrid,
  formatThaiMonthYear,
  THAI_WEEKDAYS,
  isToday,
  isSameDay,
  dayKey,
} from "../lib/thai-date";

interface Props {
  month: Date;                       // เดือนที่กำลังดู (จาก Zustand historyMonth)
  selected: Date;                    // วันที่เลือกอยู่
  recordDays: Set<string>;           // set ของ dayKey ที่มีบันทึก (จาก useLiveQuery)
  onSelect: (d: Date) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function CalendarGrid({
  month,
  selected,
  recordDays,
  onSelect,
  onPrev,
  onNext,
}: Props) {
  const cells = useMemo(() => buildCalendarGrid(month), [month]);

  return (
    <div className="card-white p-4">
      {/* แถวเดือน */}
      <div className="flex items-center justify-between px-1.5 pb-3.5">
        <button
          onClick={onPrev}
          aria-label="เดือนก่อนหน้า"
          className="grid h-8 w-8 place-items-center rounded-[10px] bg-brandSoft text-brand"
        >
          ‹
        </button>
        <div className="text-[17px] font-semibold text-ink">
          {formatThaiMonthYear(month)}
        </div>
        <button
          onClick={onNext}
          aria-label="เดือนถัดไป"
          className="grid h-8 w-8 place-items-center rounded-[10px] bg-brandSoft text-brand"
        >
          ›
        </button>
      </div>

      {/* ชื่อวัน */}
      <div className="grid grid-cols-7">
        {THAI_WEEKDAYS.map((w) => (
          <span key={w} className="py-1 text-center text-xs font-medium text-sub">
            {w}
          </span>
        ))}
      </div>

      {/* วันที่ */}
      <div className="grid grid-cols-7 gap-y-1.5">
        {cells.map((c) => {
          const today = c.inMonth && isToday(c.date);
          const isSel = isSameDay(c.date, selected);
          const hasRecord = c.inMonth && recordDays.has(dayKey(c.date));
          return (
            <button
              key={c.key}
              onClick={() => onSelect(c.date)}
              className="relative flex h-[42px] items-center justify-center"
            >
              <span
                className={[
                  "flex h-[38px] w-[38px] items-center justify-center rounded-xl text-[15px] font-medium transition",
                  !c.inMonth ? "text-line" : "text-ink",
                  today ? "bg-brand font-semibold text-white shadow-today" : "",
                  isSel && !today ? "bg-brandSoft text-brand" : "",
                ].join(" ")}
              >
                {c.date.getDate()}
              </span>
              {hasRecord && !today && (
                <span className="absolute bottom-1.5 h-[5px] w-[5px] rounded-full bg-pink" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
