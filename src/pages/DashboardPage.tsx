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

  const title = vehicle
    ? `ตาราง maintainance — ${vehicle.model.replace('Mazda ', '')} ${vehicle.year} ${vehicle.plate}`
    : 'ตาราง maintainance';

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <h1 className="text-base font-semibold leading-tight">{title}</h1>
        <Link
          to="/add"
          className="shrink-0 rounded-full bg-primary-600 px-3 py-1.5 text-xs font-semibold shadow-card active:scale-95"
        >
          + เพิ่มข้อมูล
        </Link>
      </div>

      {/* 3D model card + mileage overlay */}
      <div className="relative mb-4 h-[42vh] min-h-[260px] overflow-hidden rounded-card bg-gradient-to-b from-primary-700/60 to-primary-900 shadow-card">
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
      </div>

      {/* By-part section */}
      <section className="mb-4">
        <div className="mb-2 px-1 text-sm font-semibold text-white/85">ข้อมูลแยกตาม part</div>
        <CategoryButtonGrid />
      </section>

      {/* History entry */}
      <Link
        to="/history"
        className="mb-4 flex items-center justify-between rounded-card bg-primary-700 px-4 py-3 shadow-sub active:scale-[0.98]"
      >
        <div>
          <div className="text-sm font-semibold">ประวัติการ maintainance</div>
          <div className="text-[11px] text-white/70">ดูตามวัน / เดือน — มีจุดแดงเมื่อมีบันทึก</div>
        </div>
        <span className="text-xl">›</span>
      </Link>

      {/* Recent visits */}
      <section className="mb-2">
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="text-sm font-semibold text-white/85">รายการล่าสุด</div>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="text-[10px] text-white/40 hover:text-white/70"
          >
            ออกจากระบบ
          </button>
        </div>
        <MaintenanceCardList userId={userId} pageSize={5} />
      </section>
    </AppShell>
  );
}
