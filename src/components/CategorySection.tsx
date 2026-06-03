import { useState } from 'react';
import { getCategory, type CategoryCode } from '@/lib/categories';
import type { DraftItem } from '@/types/domain';
import PartDropdown from './PartDropdown';

interface Props {
  userId: string;
  categoryCode: CategoryCode;
  items: DraftItem[];
  onChange: (next: DraftItem[]) => void;
}

const blank = (categoryCode: CategoryCode): DraftItem => ({
  categoryCode,
  partName: '',
  quantity: 1,
  totalPrice: 0,
});

export default function CategorySection({ userId, categoryCode, items, onChange }: Props) {
  const cat = getCategory(categoryCode);
  const [open, setOpen] = useState(items.length > 0);

  const update = (idx: number, patch: Partial<DraftItem>) => {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const add = () => onChange([...items, blank(categoryCode)]);
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <section className="rounded-card bg-primary-700 p-3 shadow-sub">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{cat.emoji}</span>
          <div>
            <div className="text-sm font-semibold">หมวด {cat.code}: {cat.titleTh}</div>
            <div className="text-[10px] text-white/60">{cat.titleEn}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/70">
          {items.length > 0 && (
            <span className="rounded-full bg-primary-900/40 px-2 py-0.5">{items.length}</span>
          )}
          <span>{open ? '▾' : '▸'}</span>
        </div>
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="rounded-sub bg-primary-800 p-2">
              <div className="flex gap-2">
                <PartDropdown
                  userId={userId}
                  categoryCode={categoryCode}
                  value={it.partName}
                  onChange={(v) => update(idx, { partName: v })}
                />
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="rounded-sub bg-red-500/80 px-2 text-sm text-white"
                  aria-label="ลบรายการ"
                >
                  ✕
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <label className="flex flex-1 items-center gap-2">
                  <span className="text-white/70">จำนวน</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={it.quantity}
                    onChange={(e) =>
                      update(idx, { quantity: Number(e.target.value) || 0 })
                    }
                    className="w-16 rounded-sub bg-primary-900 px-2 py-1.5 text-right outline-none"
                  />
                </label>
                <label className="flex flex-1 items-center gap-2">
                  <span className="text-white/70">ราคา</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={it.totalPrice}
                    onChange={(e) =>
                      update(idx, { totalPrice: Number(e.target.value) || 0 })
                    }
                    className="w-24 rounded-sub bg-primary-900 px-2 py-1.5 text-right outline-none"
                  />
                </label>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={add}
            className="w-full rounded-sub border border-dashed border-white/30 px-3 py-2 text-xs text-white/80 hover:bg-white/5"
          >
            + เพิ่มชิ้นในหมวดนี้
          </button>
        </div>
      )}
    </section>
  );
}
