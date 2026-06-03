import { useState } from 'react';
import { updateMileage } from '@/lib/sync/repository';

interface Props {
  vehicleId: string;
  mileage: number;
}

const fmt = (n: number) => n.toLocaleString('th-TH');

/**
 * Floating, inline-editable mileage shown on the top-right of the 3D viewer
 * card. Dark ink colour because the viewer background is white.
 */
export default function MileageOverlay({ vehicleId, mileage }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(mileage));

  const commit = async () => {
    const n = Number(value.replace(/[^\d]/g, ''));
    if (Number.isFinite(n) && n >= 0 && n !== mileage) {
      await updateMileage(vehicleId, n);
    } else {
      setValue(String(mileage));
    }
    setEditing(false);
  };

  return (
    <div className="pointer-events-auto absolute right-3 top-3 max-w-[48%] text-right">
      <div className="text-[10px] uppercase tracking-wider text-sub">เลขไมล์</div>
      {editing ? (
        <input
          autoFocus
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            else if (e.key === 'Escape') {
              setValue(String(mileage));
              setEditing(false);
            }
          }}
          className="w-32 rounded-md bg-brandSoft px-2 py-1 text-right text-lg font-semibold text-ink outline-none ring-2 ring-brand"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setValue(String(mileage));
            setEditing(true);
          }}
          className="rounded-md px-2 py-1 text-lg font-bold leading-tight text-ink hover:bg-brandSoft"
        >
          {fmt(mileage)} <span className="text-xs font-medium text-sub">km</span>
        </button>
      )}
    </div>
  );
}
