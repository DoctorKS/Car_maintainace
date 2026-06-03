import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import CalendarGrid from '@/components/CalendarGrid';
import MaintenanceCard from '@/components/MaintenanceCard';
import { useSession } from '@/lib/supabase/session';
import { useUiStore } from '@/store/ui';
import { useActiveVehicle } from '@/hooks/useVehicle';
import { useVisitDateSet, useVisitsInRange } from '@/hooks/useMaintenanceVisits';
import {
  formatThaiMonthYear,
  nextMonth,
  prevMonth,
  toLocalIsoDate,
} from '@/lib/thai-date';
import { breakdown } from '@/lib/vat';

const baht = (n: number) =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default function HistoryCalendarPage() {
  const session = useSession();
  const userId = session?.user.id;
  const vehicle = useActiveVehicle(userId);
  const vehicleId = vehicle?.id ?? null;
  const month = useUiStore((s) => s.historyMonth);
  const setMonth = useUiStore((s) => s.setHistoryMonth);
  const [selected, setSelected] = useState<Date>(new Date());

  const monthBounds = useMemo(() => {
    const from = new Date(month.getFullYear(), month.getMonth(), 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    return { fromIso: toLocalIsoDate(from), toIso: toLocalIsoDate(to) };
  }, [month]);

  // Days in this month that have ≥1 visit (red-dot lookup for the grid).
  const markedIso = useVisitDateSet(userId, vehicleId, monthBounds.fromIso, monthBounds.toIso);

  // Every visit in the displayed month — used for the bottom summary card.
  const visitsThisMonth = useVisitsInRange(
    userId,
    vehicleId,
    monthBounds.fromIso,
    monthBounds.toIso,
  );

  const selectedIso = toLocalIsoDate(selected);
  const visitsForDay = useMemo(
    () => visitsThisMonth.filter((v) => v.service_date === selectedIso),
    [visitsThisMonth, selectedIso],
  );

  const monthSubtotal = visitsThisMonth.reduce((s, v) => s + Number(v.total_amount ?? 0), 0);
  const monthTotals = breakdown(monthSubtotal);

  return (
    <AppShell>
      <div className="mb-3 flex items-center justify-between">
        <Link to="/" className="text-xs font-medium text-white/90">
          ‹ กลับ
        </Link>
        <h1 className="text-base font-semibold text-white">ประวัติการ maintainance</h1>
        <div className="w-12" />
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

      {/* Monthly summary — sits between the calendar and the day's cards
          per spec ("ย้ายหมายเหตุ card ลงมาด้านล่างต่อสรุปค่าใช้จ่าย" =
          the visit/notes cards now follow the summary). */}
      <div className="mb-3 rounded-card bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-ink">
            สรุปค่าใช้จ่าย {formatThaiMonthYear(month)}
          </div>
          <span className="rounded-full bg-brandSoft px-2 py-0.5 text-[10px] font-semibold text-brand">
            {visitsThisMonth.length} ครั้ง
          </span>
        </div>
        {visitsThisMonth.length === 0 ? (
          <div className="py-4 text-center text-xs text-sub">ยังไม่มีบันทึกในเดือนนี้</div>
        ) : (
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between text-sub">
              <span>รวม (ก่อน VAT)</span>
              <span className="text-ink">฿ {baht(monthTotals.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sub">
              <span>ภาษีมูลค่าเพิ่ม 7%</span>
              <span className="text-ink">฿ {baht(monthTotals.vat)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-2">
              <span className="font-semibold text-ink">รวมทั้งสิ้น</span>
              <span className="text-lg font-bold text-brand">
                ฿ {baht(monthTotals.grandTotal)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Day's visit cards (each card carries its own หมายเหตุ pill). */}
      <div className="space-y-3">
        {visitsForDay.length === 0 ? (
          <div className="rounded-card bg-card p-6 text-center text-xs text-sub">
            ไม่มีบันทึกในวันนี้
          </div>
        ) : (
          visitsForDay.map((v) => <MaintenanceCard key={v.id} visit={v} />)
        )}
      </div>
    </AppShell>
  );
}
