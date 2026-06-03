import { useState } from 'react';
import ThaiCalendar from './ThaiCalendar';
import { formatThaiLong, formatThaiShort } from '@/lib/thai-date';

interface Props {
  value: Date | null;
  onChange: (d: Date) => void;
  label?: string;
}

/**
 * Inline input + popover Thai calendar (no marked dots).
 * Used for "วันที่รับบริการ" on the Add page.
 */
export default function ThaiDatePicker({ value, onChange, label }: Props) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value ?? new Date());

  return (
    <div>
      {label && <div className="mb-1 text-xs text-white/70">{label}</div>}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-sub bg-primary-900 px-3 py-2.5 text-left text-sm outline-none"
      >
        {value ? (
          <>
            <span className="font-medium">{formatThaiLong(value)}</span>
            <span className="ml-2 text-xs text-white/60">({formatThaiShort(value)})</span>
          </>
        ) : (
          <span className="text-white/60">— เลือกวันที่ —</span>
        )}
      </button>
      {open && (
        <div className="mt-2">
          <ThaiCalendar
            month={month}
            selected={value}
            markedIso={new Set()}
            onSelectDate={(d) => {
              onChange(d);
              setOpen(false);
            }}
            onChangeMonth={setMonth}
          />
        </div>
      )}
    </div>
  );
}
