import { useMaintenanceVisits, useVisitCount } from '@/hooks/useMaintenanceVisits';
import { useUiStore } from '@/store/ui';
import MaintenanceCard from './MaintenanceCard';

interface Props {
  userId: string | undefined;
  pageSize?: number;
}

/**
 * Paged list of maintenance visits — newest first.
 * Bottom-right "next" pill wraps back to page 0 at the end.
 */
export default function MaintenanceCardList({ userId, pageSize = 5 }: Props) {
  const page = useUiStore((s) => s.dashboardPage);
  const nextPage = useUiStore((s) => s.nextDashboardPage);
  const reset = useUiStore((s) => s.resetDashboardPage);

  const total = useVisitCount(userId);
  const visits = useMaintenanceVisits(userId, { limit: pageSize, offset: page * pageSize });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasNext = page < totalPages - 1;

  if (total === 0) {
    return (
      <div className="rounded-card bg-card p-6 text-center text-sm text-sub shadow-soft">
        ยังไม่มีบันทึก — กด{' '}
        <span className="font-semibold text-brand">+ เพิ่มข้อมูล</span> เพื่อเริ่มต้น
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="space-y-3">
        {visits.map((v) => (
          <MaintenanceCard key={v.id} visit={v} />
        ))}
      </div>
      {total > pageSize && (
        <div className="mt-3 flex items-center justify-between text-xs text-white/80">
          <div>
            หน้า {page + 1} / {totalPages}
          </div>
          <button
            type="button"
            onClick={hasNext ? nextPage : reset}
            className="action-pill-ghost"
          >
            {hasNext ? 'ถัดไป →' : '← กลับต้น'}
          </button>
        </div>
      )}
    </div>
  );
}
