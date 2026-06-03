import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import CalendarGrid from '@/components/CalendarGrid';
import MaintenanceCard from '@/components/MaintenanceCard';
import { useSession } from '@/lib/supabase/session';
import { useUiStore } from '@/store/ui';
import { useVisitDateSet, useVisitsInRange } from '@/hooks/useMaintenanceVisits';
import {
  formatThaiMonthYear,
  nextMonth,
  prevMonth,
  toLocalIsoDate,
} from '@/lib/thai-date';

export default function HistoryCalendarPage() {
  const session = useSession();
  const userId = session?.user.id;
  const month = useUiStore((s) => s.historyMonth);
  const setMonth = useUiStore((s) => s.setHistoryMonth);
  const [selected, setSelected] = useState<Date>(new Date());

  const monthBounds = useMemo(() => {
    const from = new Date(month.getFullYear(), month.getMonth(), 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    return { fromIso: toLocalIsoDate(from), toIso: toLocalIsoDate(to) };
  }, [month]);

  // Days in this month that have ≥1 visit (red-dot lookup for the grid).
  const markedIso = useVisitDateSet(userId, monthBounds.fromIso, monthBounds.toIso);

  const selectedIso = toLocalIsoDate(selected);
  const visitsForDay = useVisitsInRange(userId, selectedIso, selectedIso);

  return (
    <AppShell>
      <div className="mb-3 flex items-center justify-between">
        <Link to="/" className="text-xs font-medium text-white/90">
          ‹ กลับ
        </Link>
        <h1 className="text-base font-semibold text-white">ประวัติการ maintainance</h1>
        <div className="w-12" />
      </div>

      <div className="mb-2 text-center text-[11px] text-white/70">
        {formatThaiMonthYear(month)}
      </div>

      <div className="mb-3">
        <CalendarGrid
          month={month}
          selected={selected}
          recordDays={markedIso}
          onSelect={setSelected}
          onPrev={() => setMonth(prevMonth(month))}
          onNext={() => setMonth(nextMonth(month))}
        />
      </div>

      <div className="space-y-3">
        {visitsForDay.length === 0 ? (
          <div className="rounded-card bg-card p-6 text-center text-xs text-sub shadow-soft">
            ไม่มีบันทึกในวันนี้
          </div>
        ) : (
          visitsForDay.map((v) => <MaintenanceCard key={v.id} visit={v} />)
        )}
      </div>
    </AppShell>
  );
}
