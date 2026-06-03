import { useState } from 'react';
import { getCategory, type CategoryCode } from '@/lib/categories';
import type { DraftItem } from '@/types/domain';
import PartDropdown from './PartDropdown';
import CategoryIcon from './CategoryIcon';

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
    <section className="rounded-card bg-card p-3 shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brandSoft">
            <CategoryIcon code={cat.code} className="h-11 w-11" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold leading-tight text-ink">
              หมวด {cat.code}: {cat.titleTh}
            </div>
            <div className="text-[11px] text-sub">{cat.titleEn}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-sub">
          {items.length > 0 && (
            <span className="rounded-full bg-brandSoft px-2 py-0.5 font-medium text-brand">
              {items.length}
            </span>
          )}
          <span className="text-base text-brand">{open ? '▾' : '▸'}</span>
        </div>
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="rounded-tile bg-brandSoft p-2">
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
                  className="rounded-tile bg-rose-500/90 px-2 text-sm font-semibold text-white"
                  aria-label="ลบรายการ"
                >
                  ✕
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <label className="flex flex-1 items-center gap-2">
                  <span className="text-sub">จำนวน</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={it.quantity}
                    onChange={(e) => update(idx, { quantity: Number(e.target.value) || 0 })}
                    className="w-16 rounded-tile bg-white px-2 py-1.5 text-right text-ink outline-none ring-1 ring-line"
                  />
                </label>
                <label className="flex flex-1 items-center gap-2">
                  <span className="text-sub">ราคา</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={it.totalPrice}
                    onChange={(e) => update(idx, { totalPrice: Number(e.target.value) || 0 })}
                    className="w-24 rounded-tile bg-white px-2 py-1.5 text-right text-ink outline-none ring-1 ring-line"
                  />
                </label>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={add}
            className="w-full rounded-tile border border-dashed border-line px-3 py-2 text-xs font-medium text-brand hover:bg-brandSoft"
          >
            + เพิ่มชิ้นในหมวดนี้
          </button>
        </div>
      )}
    </section>
  );
}
