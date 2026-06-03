import { Link } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import MaintenanceCardList from '@/components/MaintenanceCardList';
import MileageOverlay from '@/components/MileageOverlay';
import Spinner from '@/components/Spinner';
import VehicleToggle from '@/components/VehicleToggle';
import { useSession } from '@/lib/supabase/session';
import { useActiveVehicle, vehicleMake } from '@/hooks/useVehicle';
import { supabase } from '@/lib/supabase/client';

// Code-split the 3D viewer so /login + non-dashboard routes don't pay the cost.
const CarViewer = lazy(() => import('@/three/CarViewer'));

export default function DashboardPage() {
  const session = useSession();
  const userId = session?.user.id;
  const vehicle = useActiveVehicle(userId);
  const make = vehicleMake(vehicle);
  const isTesla = make === 'tesla';

  // Theme switch — set body data-attribute so the CSS variable swap in
  // src/index.css applies the red Tesla palette / blue Mazda palette.
  useEffect(() => {
    if (!vehicle) return;
    document.body.dataset.vehicleMake = make;
    return () => {
      // Default back to Mazda when the dashboard unmounts so other pages
      // still render in their saved palette without leaking Tesla red.
      document.body.dataset.vehicleMake = 'mazda';
    };
  }, [vehicle, make]);

  // Display model with the brand prefix stripped — the toggle already
  // shows the make, and the plate is enough disambiguation.
  const displayModel = vehicle
    ? vehicle.model.replace(/^(Mazda|Tesla)\s+/i, '')
    : '';

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

      {/* Hero card: 3D viewer for Mazda, branded placeholder for Tesla
          (we don't ship a Tesla FBX). Vehicle toggle floats top-LEFT, mileage
          top-RIGHT — symmetric corners. */}
      <div className="relative mb-4 h-[48vh] min-h-[300px] overflow-hidden rounded-hero">
        {isTesla ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-rose-50 via-rose-100 to-rose-200 text-ink">
            <div className="text-[10px] uppercase tracking-[0.3em] text-rose-700/80">
              {vehicle?.year}
            </div>
            <div className="mt-1 text-3xl font-extrabold leading-none text-rose-700">
              {displayModel}
            </div>
            <div className="mt-3 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
              {vehicle?.plate}
            </div>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center bg-card">
                <Spinner />
              </div>
            }
          >
            <CarViewer className="h-full w-full" autoRotate />
          </Suspense>
        )}

        {/* Top-LEFT: vehicle toggle. z-20 lifts it above CarViewer's
            <Canvas className="relative z-10">, otherwise the canvas +
            OrbitControls swallow the click. */}
        <div className="absolute left-3 top-3 z-20">
          <VehicleToggle />
        </div>

        {/* Top-RIGHT: editable mileage. MileageOverlay carries its own
            `absolute right-3 top-3 z-20` so no wrapper is needed here. */}
        {vehicle && <MileageOverlay vehicleId={vehicle.id} mileage={vehicle.mileage} />}

        {/* Bottom-LEFT chip: model + year + plate (Mazda only; Tesla card
            already shows this prominently) */}
        {vehicle && !isTesla && (
          <div className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-ink backdrop-blur">
            {displayModel} {vehicle.year} · {vehicle.plate}
          </div>
        )}
      </div>

      {/* Recent visits — vehicle-scoped */}
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
        <MaintenanceCardList
          userId={userId}
          vehicleId={vehicle?.id ?? null}
          pageSize={5}
        />
      </section>
    </AppShell>
  );
}
