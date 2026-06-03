import { useMemo } from 'react';
import {
  formatThaiMonthYear,
  thaiWeekdayShort,
  toLocalIsoDate,
} from '@/lib/thai-date';

interface Props {
  /** First-of-month for the displayed month. */
  month: Date;
  /** Currently-selected date (highlight ring). */
  selected: Date | null;
  /** Dates (YYYY-MM-DD) that should show a red dot under the day number. */
  markedIso: Set<string>;
  onSelectDate: (d: Date) => void;
  onChangeMonth: (next: Date) => void;
}

const WEEKDAY_LABELS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

/** Days array, including padding from prev/next months to fill 6 rows × 7 cols. */
function buildGrid(month: Date): { date: Date; inMonth: boolean }[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startDow = first.getDay();
  const out: { date: Date; inMonth: boolean }[] = [];
  // Lead-in from previous month
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(first);
    d.setDate(first.getDate() - i - 1);
    out.push({ date: d, inMonth: false });
  }
  // Current month
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  for (let i = 1; i <= last; i++) {
    out.push({ date: new Date(month.getFullYear(), month.getMonth(), i), inMonth: true });
  }
  // Tail to fill 42 cells
  while (out.length % 7 !== 0 || out.length < 42) {
    const lastEntry = out[out.length - 1].date;
    const d = new Date(lastEntry);
    d.setDate(d.getDate() + 1);
    out.push({ date: d, inMonth: false });
    if (out.length >= 42) break;
  }
  return out.slice(0, 42);
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export default function ThaiCalendar({
  month,
  selected,
  markedIso,
  onSelectDate,
  onChangeMonth,
}: Props) {
  const grid = useMemo(() => buildGrid(month), [month]);
  const today = new Date();

  const prev = () => onChangeMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const next = () => onChangeMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));

  return (
    <div className="rounded-card bg-primary-700 p-3 shadow-card">
      <div className="mb-2 flex items-center justify-between px-1">
        <button type="button" onClick={prev} className="px-2 py-1 text-lg" aria-label="เดือนก่อน">
          ‹
        </button>
        <div className="text-sm font-semibold">{formatThaiMonthYear(month)}</div>
        <button type="button" onClick={next} className="px-2 py-1 text-lg" aria-label="เดือนถัดไป">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 px-1 text-center text-[10px] text-white/60">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 px-1">
        {grid.map(({ date, inMonth }, i) => {
          const iso = toLocalIsoDate(date);
          const isMarked = markedIso.has(iso);
          const isSelected = selected && sameDay(selected, date);
          const isToday = sameDay(today, date);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDate(date)}
              aria-label={`${date.getDate()} ${thaiWeekdayShort(date)}`}
              className={`relative flex aspect-square items-center justify-center rounded-md text-sm
                ${inMonth ? 'text-white' : 'text-white/30'}
                ${isSelected ? 'bg-white text-primary-900 font-bold' : isToday ? 'ring-1 ring-white/60' : 'hover:bg-white/10'}
              `}
            >
              <span>{date.getDate()}</span>
              {isMarked && (
                <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-accent-red" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
