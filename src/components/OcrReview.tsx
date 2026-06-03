import { useState } from 'react';
import { CATEGORIES, type CategoryCode } from '@/lib/categories';
import type { DraftItem } from '@/types/domain';
import type { OcrItem } from '@/lib/ocr';
import CategoryIcon from './CategoryIcon';

interface Props {
  items: OcrItem[];
  onSave: (committed: DraftItem[]) => void;
  onCancel: () => void;
}

/** One editable row in the review table. */
interface ReviewRow {
  partName: string;
  quantity: number;
  unitPrice: number;
  /** Null until the user assigns a category — receipts don't carry that. */
  categoryCode: CategoryCode | null;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const displayNum = (n: number): number | '' => (n === 0 ? '' : n);
const parseNum = (raw: string): number => {
  if (raw === '') return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/**
 * Modal that lets the user review what Claude extracted from the receipt,
 * edit anything the model got wrong, assign a category to every row
 * (receipts don't carry that), and commit the rows back into the parent
 * Add-form. Save lives at the **bottom-right** per the user's spec.
 */
export default function OcrReview({ items, onSave, onCancel }: Props) {
  const [rows, setRows] = useState<ReviewRow[]>(
    items.map((it) => ({
      partName: it.partName,
      quantity: it.quantity || 1,
      unitPrice: round2(it.unitPrice || 0),
      categoryCode: null,
    })),
  );

  const update = (idx: number, patch: Partial<ReviewRow>) => {
    setRows((s) => s.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const addRow = () =>
    setRows((s) => [
      ...s,
      { partName: '', quantity: 1, unitPrice: 0, categoryCode: null },
    ]);
  const removeRow = (idx: number) => setRows((s) => s.filter((_, i) => i !== idx));

  const usableRows = rows.filter(
    (r) => r.partName.trim().length > 0 && r.categoryCode !== null,
  );
  const allRowsAssigned =
    rows.length > 0 &&
    rows.every((r) => r.partName.trim().length > 0 && r.categoryCode !== null);

  const subtotal = usableRows.reduce(
    (s, r) => s + r.quantity * r.unitPrice,
    0,
  );

  const commit = () => {
    const out: DraftItem[] = usableRows.map((r) => ({
      categoryCode: r.categoryCode as CategoryCode,
      partName: r.partName.trim(),
      quantity: r.quantity,
      unitPrice: round2(r.unitPrice),
      totalPrice: round2(r.quantity * r.unitPrice),
      notes: '',
    }));
    onSave(out);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/80 p-2"
      onClick={onCancel}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-md flex-col rounded-card bg-card shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-ink">ตรวจสอบข้อมูลจากใบเสร็จ</div>
            <div className="text-[11px] text-sub">
              เลือก "หมวด" ให้ครบทุกรายการก่อนบันทึก
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="grid h-8 w-8 place-items-center rounded-full bg-brandSoft text-brand"
            aria-label="ปิด"
          >
            ✕
          </button>
        </div>

        {/* Scrollable rows */}
        <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
          {rows.length === 0 && (
            <div className="rounded-tile bg-brandSoft p-3 text-center text-xs text-sub">
              ไม่พบรายการจากใบเสร็จ — กด "+ เพิ่มแถว" เพื่อกรอกเอง
            </div>
          )}
          {rows.map((row, idx) => (
            <div key={idx} className="rounded-tile bg-brandSoft p-2.5">
              {/* part name + remove */}
              <div className="flex items-start gap-2">
                <input
                  value={row.partName}
                  onChange={(e) => update(idx, { partName: e.target.value })}
                  placeholder="ชื่ออะไหล่..."
                  className="min-w-0 flex-1 rounded-tile bg-white px-2 py-1.5 text-sm text-ink outline-none ring-1 ring-line"
                />
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="rounded-tile bg-rose-500/90 px-2 text-sm font-semibold text-white"
                  aria-label="ลบแถว"
                >
                  ✕
                </button>
              </div>

              {/* qty / unit price */}
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-sub">จำนวน</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    placeholder="0"
                    value={displayNum(row.quantity)}
                    onChange={(e) => update(idx, { quantity: parseNum(e.target.value) })}
                    className="min-w-0 flex-1 rounded-tile bg-white px-2 py-1.5 text-right text-ink outline-none ring-1 ring-line"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-sub">ราคา/หน่วย</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    placeholder="0"
                    value={displayNum(row.unitPrice)}
                    onChange={(e) => update(idx, { unitPrice: parseNum(e.target.value) })}
                    className="min-w-0 flex-1 rounded-tile bg-white px-2 py-1.5 text-right text-ink outline-none ring-1 ring-line"
                  />
                </label>
              </div>

              {/* category picker — required */}
              <label className="mt-2 flex items-center gap-2 text-xs">
                <span className="w-14 shrink-0 text-sub">หมวด</span>
                <select
                  value={row.categoryCode ?? ''}
                  onChange={(e) =>
                    update(idx, {
                      categoryCode:
                        e.target.value === ''
                          ? null
                          : (Number(e.target.value) as CategoryCode),
                    })
                  }
                  className={`min-w-0 flex-1 rounded-tile bg-white px-2 py-1.5 text-sm text-ink outline-none ring-1 ${
                    row.categoryCode === null ? 'ring-rose-400' : 'ring-line'
                  } focus:ring-2 focus:ring-brand`}
                >
                  <option value="">— เลือกหมวด —</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}. {c.titleTh}
                    </option>
                  ))}
                </select>
                {row.categoryCode !== null && (
                  <CategoryIcon
                    code={row.categoryCode as CategoryCode}
                    className="h-7 w-7"
                  />
                )}
              </label>

              {/* line subtotal preview */}
              {row.quantity > 0 && row.unitPrice > 0 && (
                <div className="mt-2 text-right text-[11px] text-sub">
                  รวมแถวนี้: ฿{' '}
                  {(row.quantity * row.unitPrice).toLocaleString('th-TH', {
                    maximumFractionDigits: 2,
                  })}
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addRow}
            className="w-full rounded-tile border border-dashed border-line px-3 py-2 text-xs font-medium text-brand hover:bg-brandSoft"
          >
            + เพิ่มแถว
          </button>
        </div>

        {/* Sticky save bar — bottom-right per spec */}
        <div className="border-t border-line px-3 py-3">
          <div className="mb-2 flex items-center justify-between text-xs text-sub">
            <span>
              {rows.length} แถว · พร้อม{' '}
              <span
                className={
                  allRowsAssigned ? 'font-semibold text-brand' : 'font-semibold text-rose-500'
                }
              >
                {usableRows.length}/{rows.length}
              </span>
            </span>
            <span>
              รวม ฿{' '}
              {subtotal.toLocaleString('th-TH', { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-card bg-line px-4 py-2.5 text-sm font-medium text-ink active:scale-95"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={commit}
              disabled={!allRowsAssigned}
              className="flex-1 rounded-card bg-brand px-4 py-2.5 text-sm font-semibold text-white active:scale-95 disabled:opacity-50"
            >
              บันทึก {usableRows.length} รายการ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
