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
  unitPrice: 0,
  totalPrice: 0,
  notes: '',
});

/**
 * Returns a numeric value for a controlled `<input type="number">`.
 * Renders an empty string when the stored value is 0 so the placeholder
 * (and a clean editing experience — no need to delete a leading "0")
 * appears for blank fields.
 */
const displayNum = (n: number): number | '' => (n === 0 ? '' : n);

/**
 * Parse a number input's raw string into a non-negative number.
 * Empty string → 0, NaN → 0.
 */
const parseNum = (raw: string): number => {
  if (raw === '') return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

export default function CategorySection({ userId, categoryCode, items, onChange }: Props) {
  const cat = getCategory(categoryCode);
  const [open, setOpen] = useState(items.length > 0);

  const update = (idx: number, patch: Partial<DraftItem>) => {
    onChange(
      items.map((it, i) => {
        if (i !== idx) return it;
        const next = { ...it, ...patch };
        // Whenever quantity or unitPrice changes, recompute totalPrice — unless
        // the patch itself set totalPrice (the user typed directly into it; we
        // then back-derive unitPrice so the two fields stay consistent).
        if ('totalPrice' in patch && !('unitPrice' in patch)) {
          next.unitPrice = next.quantity > 0 ? round2(next.totalPrice / next.quantity) : 0;
        } else {
          next.totalPrice = round2(next.quantity * next.unitPrice);
        }
        return next;
      }),
    );
  };

  const add = () => onChange([...items, blank(categoryCode)]);
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <section className="rounded-card bg-card p-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          {/* 2× from the previous 56 px sizing — full-size brand mark per spec */}
          <div className="grid h-28 w-28 shrink-0 place-items-center">
            <CategoryIcon code={cat.code} className="h-28 w-28" />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold leading-tight text-ink">
              {cat.titleTh}
            </div>
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
            <div key={idx} className="rounded-tile bg-brandSoft p-2.5">
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

              {/* qty / unit price */}
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-sub">จำนวน</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    placeholder="0"
                    value={displayNum(it.quantity)}
                    onChange={(e) => update(idx, { quantity: parseNum(e.target.value) })}
                    className="min-w-0 flex-1 rounded-tile bg-white px-2 py-1.5 text-right text-ink outline-none ring-1 ring-line"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-sub">ราคา/ชิ้น</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    placeholder="0"
                    value={displayNum(it.unitPrice)}
                    onChange={(e) => update(idx, { unitPrice: parseNum(e.target.value) })}
                    className="min-w-0 flex-1 rounded-tile bg-white px-2 py-1.5 text-right text-ink outline-none ring-1 ring-line"
                  />
                </label>
              </div>

              {/* total price (editable; back-derives unit price) */}
              <label className="mt-2 flex items-center gap-2 text-xs">
                <span className="w-14 shrink-0 text-sub">ราคารวม</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder="0"
                  value={displayNum(it.totalPrice)}
                  onChange={(e) => update(idx, { totalPrice: parseNum(e.target.value) })}
                  className="min-w-0 flex-1 rounded-tile bg-white px-2 py-1.5 text-right font-semibold text-ink outline-none ring-1 ring-line"
                />
                <span className="shrink-0 text-sub">฿</span>
              </label>

              {/* per-item note */}
              <label className="mt-2 block text-xs">
                <span className="mb-1 block text-sub">หมายเหตุ</span>
                <textarea
                  value={it.notes ?? ''}
                  onChange={(e) => update(idx, { notes: e.target.value })}
                  rows={2}
                  placeholder="รายละเอียดเพิ่มเติม เช่น ยี่ห้อ รุ่น ส่วนลด..."
                  className="w-full resize-none rounded-tile bg-white px-2 py-1.5 text-sm text-ink outline-none ring-1 ring-line"
                />
              </label>
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
