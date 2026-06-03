import { formatThaiMedium } from '@/lib/thai-date';
import { getCategory, isCategoryCode } from '@/lib/categories';
import type { MaintenanceVisitWithItems } from '@/types/domain';
import ReceiptImageButton from './ReceiptImageButton';

interface Props {
  visit: MaintenanceVisitWithItems;
}

const baht = (n: number) =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default function MaintenanceCard({ visit }: Props) {
  const date = new Date(visit.service_date + 'T00:00:00');
  const centerName = visit.service_center?.name ?? '—';
  return (
    <div className="rounded-card bg-primary-700 p-4 shadow-card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight">{formatThaiMedium(date)}</div>
          <div className="text-xs text-white/70">{centerName}</div>
          <div className="mt-0.5 text-[11px] text-white/60">
            เลขไมล์ {visit.mileage.toLocaleString('th-TH')} km
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <ReceiptImageButton storagePath={visit.receipt_image_path} />
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-white/60">รวม</div>
            <div className="text-base font-bold leading-tight">฿ {baht(visit.total_amount)}</div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {visit.items.length === 0 && (
          <div className="rounded-sub bg-primary-800 p-3 text-center text-xs text-white/60">
            ไม่มีรายการ
          </div>
        )}
        {visit.items.map((it) => {
          const cat = isCategoryCode(it.category_code) ? getCategory(it.category_code) : null;
          return (
            <div
              key={it.id}
              className="rounded-sub bg-primary-800 px-3 py-2 shadow-sub"
            >
              <div className="flex items-center gap-2 text-[10px] text-white/70">
                <span className="rounded-full bg-primary-950/60 px-1.5 py-0.5 font-medium">
                  หมวด {it.category_code}
                </span>
                <span className="truncate">{cat?.titleTh ?? ''}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0 flex-1 truncate font-medium">{it.part_name}</div>
                <div className="shrink-0 text-xs text-white/70">×{it.quantity}</div>
                <div className="shrink-0 text-sm font-semibold">฿ {baht(Number(it.total_price))}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
