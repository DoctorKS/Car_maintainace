import { formatThaiMedium } from '@/lib/thai-date';
import { getCategory, isCategoryCode } from '@/lib/categories';
import type { MaintenanceVisitWithItems } from '@/types/domain';
import ReceiptImageButton from './ReceiptImageButton';

interface Props {
  visit: MaintenanceVisitWithItems;
}

const baht = (n: number) =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/**
 * Single visit card — white surface on the blue page; sub-items render on a
 * soft brand-tinted chip so they read as inset rows.
 */
export default function MaintenanceCard({ visit }: Props) {
  const date = new Date(visit.service_date + 'T00:00:00');
  const centerName = visit.service_center?.name ?? '—';
  return (
    <div className="rounded-card bg-card p-4 shadow-card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight text-ink">
            {formatThaiMedium(date)}
          </div>
          <div className="text-xs text-sub">{centerName}</div>
          <div className="mt-0.5 text-[11px] text-sub">
            เลขไมล์ {visit.mileage.toLocaleString('th-TH')} km
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <ReceiptImageButton storagePath={visit.receipt_image_path} />
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-sub">รวม</div>
            <div className="text-base font-bold leading-tight text-ink">
              ฿ {baht(visit.total_amount)}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {visit.items.length === 0 && (
          <div className="rounded-tile bg-brandSoft p-3 text-center text-xs text-sub">
            ไม่มีรายการ
          </div>
        )}
        {visit.items.map((it) => {
          const cat = isCategoryCode(it.category_code) ? getCategory(it.category_code) : null;
          return (
            <div
              key={it.id}
              className="rounded-tile bg-brandSoft px-3 py-2"
            >
              <div className="flex items-center gap-2 text-[10px] text-sub">
                <span className="rounded-full bg-brand/10 px-1.5 py-0.5 font-medium text-brand">
                  หมวด {it.category_code}
                </span>
                <span className="truncate">{cat?.titleTh ?? ''}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0 flex-1 truncate font-medium text-ink">{it.part_name}</div>
                <div className="shrink-0 text-xs text-sub">×{it.quantity}</div>
                <div className="shrink-0 text-sm font-semibold text-ink">
                  ฿ {baht(Number(it.total_price))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
