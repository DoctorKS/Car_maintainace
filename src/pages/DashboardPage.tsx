import { Link } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import AppShell from '@/components/AppShell';
import CategoryButtonGrid from '@/components/CategoryButtonGrid';
import MaintenanceCardList from '@/components/MaintenanceCardList';
import MileageOverlay from '@/components/MileageOverlay';
import Spinner from '@/components/Spinner';
import { useSession } from '@/lib/supabase/session';
import { useVehicle } from '@/hooks/useVehicle';
import { supabase } from '@/lib/supabase/client';

// Code-split the 3D viewer so /login + non-dashboard routes don't pay the cost.
const CarViewer = lazy(() => import('@/three/CarViewer'));

export default function DashboardPage() {
  const session = useSession();
  const userId = session?.user.id;
  const vehicle = useVehicle(userId);

  return (
    <AppShell>
      {/* Action row — replaces the page title per spec.
          Three pills: + เพิ่มข้อมูล / ข้อมูลแยกตาม part / ประวัติ
          The two extra pills scroll-link to the sections lower on the page so
          everything stays on one route. */}
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        <Link to="/add" className="action-pill bg-brandDeep text-white shadow-card">
          <span aria-hidden>+</span>
          <span>เพิ่มข้อมูล</span>
        </Link>
        <a href="#section-by-part" className="action-pill">
          ข้อมูลแยกตาม part
        </a>
        <Link to="/history" className="action-pill">
          ประวัติ maintainance
        </Link>
      </div>

      {/* Hero card: 3D viewer with mileage overlay */}
      <div className="relative mb-4 h-[42vh] min-h-[260px] overflow-hidden rounded-hero bg-card shadow-card">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          }
        >
          <CarViewer className="h-full w-full" autoRotate />
        </Suspense>
        {vehicle && <MileageOverlay vehicleId={vehicle.id} mileage={vehicle.mileage} />}
        {vehicle && (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-ink shadow-soft backdrop-blur">
            {vehicle.model.replace('Mazda ', '')} {vehicle.year} · {vehicle.plate}
          </div>
        )}
      </div>

      {/* By-part section */}
      <section id="section-by-part" className="mb-4 scroll-mt-4">
        <div className="mb-2 px-1 text-sm font-semibold text-white/90">
          ข้อมูลแยกตาม part
        </div>
        <CategoryButtonGrid />
      </section>

      {/* History entry */}
      <Link
        to="/history"
        className="mb-4 flex items-center justify-between rounded-card bg-card px-4 py-3.5 shadow-soft active:scale-[0.98]"
      >
        <div>
          <div className="text-sm font-semibold text-ink">ประวัติการ maintainance</div>
          <div className="text-[11px] text-sub">ดูตามวัน / เดือน — มีจุดแดงเมื่อมีบันทึก</div>
        </div>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brandSoft text-brand">
          ›
        </span>
      </Link>

      {/* Recent visits */}
      <section className="mb-2">
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="text-sm font-semibold text-white/90">รายการล่าสุด</div>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="text-[10px] text-white/60 hover:text-white"
          >
            ออกจากระบบ
          </button>
        </div>
        <MaintenanceCardList userId={userId} pageSize={5} />
      </section>
    </AppShell>
  );
}
