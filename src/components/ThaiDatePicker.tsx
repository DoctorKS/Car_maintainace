import { useState } from 'react';
import CalendarGrid from './CalendarGrid';
import {
  formatThaiDateLong,
  formatThaiShort,
  nextMonth,
  prevMonth,
} from '@/lib/thai-date';

interface Props {
  value: Date | null;
  onChange: (d: Date) => void;
  label?: string;
}

/**
 * Inline input + collapsible CalendarGrid (no record dots) for picking
 * "วันที่รับบริการ" on the Add page.
 */
export default function ThaiDatePicker({ value, onChange, label }: Props) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value ?? new Date());
  const selected = value ?? new Date();

  return (
    <div>
      {label && <div className="mb-1 text-xs text-white/85">{label}</div>}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-tile bg-white px-3 py-2.5 text-left text-sm text-ink shadow-soft outline-none"
      >
        {value ? (
          <>
            <span className="font-semibold">{formatThaiDateLong(value)}</span>
            <span className="ml-2 text-xs text-sub">({formatThaiShort(value)})</span>
          </>
        ) : (
          <span className="text-sub">— เลือกวันที่ —</span>
        )}
      </button>
      {open && (
        <div className="mt-2">
          <CalendarGrid
            month={month}
            selected={selected}
            recordDays={new Set()}
            onSelect={(d) => {
              onChange(d);
              setOpen(false);
            }}
            onPrev={() => setMonth((m) => prevMonth(m))}
            onNext={() => setMonth((m) => nextMonth(m))}
          />
        </div>
      )}
    </div>
  );
}
