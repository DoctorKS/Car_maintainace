import { Link } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import MaintenanceCardList from '@/components/MaintenanceCardList';
import MileageOverlay from '@/components/MileageOverlay';
import Spinner from '@/components/Spinner';
import { useSession } from '@/lib/supabase/session';
import { useVehicle } from '@/hooks/useVehicle';
import { supabase } from '@/lib/supabase/client';
import { pullAll } from '@/lib/sync/pull';
import { scheduleFlush } from '@/lib/sync/flush';

// Code-split the 3D viewer so /login + non-dashboard routes don't pay the cost.
const CarViewer = lazy(() => import('@/three/CarViewer'));

export default function DashboardPage() {
  const session = useSession();
  const userId = session?.user.id;
  const vehicle = useVehicle(userId);

  // Defensive refresh: every dashboard mount triggers a pull and queue
  // flush. If the initial pull at app boot failed (network blip,
  // expired token, server cold start), the user has a path back to
  // good data just by navigating to "/". Cheap — pull is a delta query
  // and a no-op when there's nothing newer.
  useEffect(() => {
    if (!userId) return;
    pullAll().catch((e) => console.error('[pull] dashboard mount failed', e));
    scheduleFlush();
  }, [userId]);

  return (
    <AppShell>
      {/* Action row — all three pills share the same brandDeep theme. */}
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        <Link to="/add" className="action-pill">
          <span aria-hidden>+</span>
          <span>เพิ่มข้อมูล</span>
        </Link>
        <Link to="/by-part" className="action-pill">
          ข้อมูลแยกตาม part
        </Link>
        <Link to="/history" className="action-pill">
          ประวัติ maintainance
        </Link>
      </div>

      {/* Hero card: 3D viewer with mileage overlay */}
      <div className="relative mb-4 h-[48vh] min-h-[300px] overflow-hidden rounded-hero shadow-card">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center bg-card">
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
