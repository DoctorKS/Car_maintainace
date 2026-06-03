import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import ThaiCalendar from '@/components/ThaiCalendar';
import MaintenanceCard from '@/components/MaintenanceCard';
import { useSession } from '@/lib/supabase/session';
import { useUiStore } from '@/store/ui';
import {
  useVisitDateSet,
  useVisitsInRange,
} from '@/hooks/useMaintenanceVisits';
import { toLocalIsoDate } from '@/lib/thai-date';

export default function HistoryCalendarPage() {
  const session = useSession();
  const userId = session?.user.id;
  const month = useUiStore((s) => s.historyMonth);
  const setMonth = useUiStore((s) => s.setHistoryMonth);
  const [selected, setSelected] = useState<Date | null>(new Date());

  const monthBounds = useMemo(() => {
    const from = new Date(month.getFullYear(), month.getMonth(), 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    return { fromIso: toLocalIsoDate(from), toIso: toLocalIsoDate(to) };
  }, [month]);

  const markedIso = useVisitDateSet(userId, monthBounds.fromIso, monthBounds.toIso);

  const selectedIso = selected ? toLocalIsoDate(selected) : null;
  const visitsForDay = useVisitsInRange(
    userId,
    selectedIso ?? monthBounds.fromIso,
    selectedIso ?? monthBounds.toIso,
  );

  return (
    <AppShell>
      <div className="mb-3 flex items-center justify-between">
        <Link to="/" className="text-xs text-white/70">
          ‹ กลับ
        </Link>
        <h1 className="text-base font-semibold">ประวัติการ maintainance</h1>
        <div className="w-12" />
      </div>

      <div className="mb-3">
        <ThaiCalendar
          month={month}
          selected={selected}
          markedIso={markedIso}
          onSelectDate={setSelected}
          onChangeMonth={setMonth}
        />
      </div>

      {selectedIso && (
        <div className="space-y-3">
          {visitsForDay.length === 0 ? (
            <div className="rounded-card bg-primary-700/60 p-6 text-center text-xs text-white/60">
              ไม่มีบันทึกในวันนี้
            </div>
          ) : (
            visitsForDay.map((v) => <MaintenanceCard key={v.id} visit={v} />)
          )}
        </div>
      )}
    </AppShell>
  );
}
