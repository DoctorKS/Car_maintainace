import { useState } from 'react';
import { updateMileage } from '@/lib/sync/repository';

interface Props {
  vehicleId: string;
  mileage: number;
}

const fmt = (n: number) => n.toLocaleString('th-TH');

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
    <div className="pointer-events-auto absolute right-3 top-3 max-w-[42%] text-right text-white">
      <div className="text-[10px] uppercase tracking-wider text-white/70">เลขไมล์</div>
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
          className="w-28 rounded-md bg-white/10 px-2 py-1 text-right text-lg font-semibold outline-none ring-2 ring-white/40"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setValue(String(mileage));
            setEditing(true);
          }}
          className="rounded-md px-2 py-1 text-lg font-semibold leading-tight hover:bg-white/10"
        >
          {fmt(mileage)} <span className="text-xs font-normal text-white/70">km</span>
        </button>
      )}
    </div>
  );
}
