/**
 * Month calendar — blue/white theme.
 * Today is a brand-filled circle; days with records show a pink dot.
 *
 * Adapted from handoff/CalendarGrid.tsx; imports point at `@/lib/thai-date`.
 */
import { useMemo } from 'react';
import {
  buildCalendarGrid,
  formatThaiMonthYear,
  THAI_WEEKDAYS,
  isToday,
  isSameDay,
  dayKey,
} from '@/lib/thai-date';

interface Props {
  /** First-of-month (or any date in the month) for the displayed grid. */
  month: Date;
  /** Currently-selected date. */
  selected: Date;
  /** Set of `YYYY-MM-DD` keys for days that have ≥1 record. */
  recordDays: Set<string>;
  onSelect: (d: Date) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function CalendarGrid({ month, selected, recordDays, onSelect, onPrev, onNext }: Props) {
  const cells = useMemo(() => buildCalendarGrid(month), [month]);

  return (
    <div className="card-white p-4">
      {/* month bar */}
      <div className="flex items-center justify-between px-1.5 pb-3.5">
        <button
          type="button"
          onClick={onPrev}
          aria-label="เดือนก่อนหน้า"
          className="grid h-8 w-8 place-items-center rounded-[10px] bg-brandSoft text-brand"
        >
          ‹
        </button>
        <div className="text-[17px] font-semibold text-ink">{formatThaiMonthYear(month)}</div>
        <button
          type="button"
          onClick={onNext}
          aria-label="เดือนถัดไป"
          className="grid h-8 w-8 place-items-center rounded-[10px] bg-brandSoft text-brand"
        >
          ›
        </button>
      </div>

      {/* weekday labels */}
      <div className="grid grid-cols-7">
        {THAI_WEEKDAYS.map((w) => (
          <span key={w} className="py-1 text-center text-xs font-medium text-sub">
            {w}
          </span>
        ))}
      </div>

      {/* day grid */}
      <div className="grid grid-cols-7 gap-y-1.5">
        {cells.map((c) => {
          const today = c.inMonth && isToday(c.date);
          const isSel = isSameDay(c.date, selected);
          const hasRecord = c.inMonth && recordDays.has(dayKey(c.date));
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onSelect(c.date)}
              className="relative flex h-[42px] items-center justify-center"
            >
              <span
                className={[
                  'flex h-[38px] w-[38px] items-center justify-center rounded-xl text-[15px] font-medium transition',
                  !c.inMonth ? 'text-line' : 'text-ink',
                  today ? 'bg-brand font-semibold text-white shadow-today' : '',
                  isSel && !today ? 'bg-brandSoft text-brand' : '',
                ].join(' ')}
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

export default CalendarGrid;
