import { Link } from 'react-router-dom';
import { formatThaiMedium } from '@/lib/thai-date';
import { getCategory, isCategoryCode } from '@/lib/categories';
import type { MaintenanceVisitWithItems } from '@/types/domain';
import CategoryIcon from './CategoryIcon';
import ReceiptImageButton from './ReceiptImageButton';

interface Props {
  visit: MaintenanceVisitWithItems;
}

const baht = (n: number) =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

/**
 * Single visit card — white surface on the blue page; sub-items render on a
 * soft brand-tinted chip. The pencil button (top-right) opens the edit form
 * at /edit/:visitId, which is the same component as /add pre-filled with
 * this visit's data.
 */
export default function MaintenanceCard({ visit }: Props) {
  const date = new Date(visit.service_date + 'T00:00:00');
  const centerName = visit.service_center?.name ?? '—';
  return (
    <div className="rounded-card bg-card p-4">
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
          <div className="flex items-center gap-1.5">
            <ReceiptImageButton storagePath={visit.receipt_image_path} />
            <Link
              to={`/edit/${visit.id}`}
              aria-label="แก้ไขรายการนี้"
              className="grid h-8 w-8 place-items-center rounded-full bg-brandSoft text-brand active:scale-95"
            >
              <PencilIcon className="h-4 w-4" />
            </Link>
          </div>
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
            <div key={it.id} className="rounded-tile bg-brandSoft px-3 py-2">
              <div className="flex items-center gap-2 text-[11px] text-sub">
                {isCategoryCode(it.category_code) && (
                  <CategoryIcon
                    code={it.category_code}
                    className="h-7 w-7 shrink-0"
                  />
                )}
                <span className="truncate font-medium text-ink/70">{cat?.titleTh ?? ''}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0 flex-1 truncate font-medium text-ink">
                  {it.part_name}
                </div>
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
