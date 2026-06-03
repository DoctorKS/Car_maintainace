import { useVehicles, useActiveVehicle, vehicleMake } from '@/hooks/useVehicle';
import { useVehicleStore } from '@/store/vehicle';
import { useSession } from '@/lib/supabase/session';

/**
 * Pill-shaped vehicle switcher styled like a hardware toggle.
 *
 * The label inside the moving knob is a single letter — "M" when Mazda is
 * active, "T" when Tesla is active — and tapping the pill cycles to the
 * next vehicle in the user's list (currently always 1 ↔ 2). The brand
 * marks themselves stay text-only on purpose so the component is
 * self-contained and we don't ship logo art in the bundle.
 *
 * Track tint follows the active brand colour via the
 * `body[data-vehicle-make]` token swap — so the pill turns Mazda blue or
 * Tesla red without any inline JS.
 */
export default function VehicleToggle() {
  const session = useSession();
  const userId = session?.user.id;
  const vehicles = useVehicles(userId);
  const active = useActiveVehicle(userId);
  const setActive = useVehicleStore((s) => s.setActiveVehicleId);

  if (!active || vehicles.length < 2) return null;

  const make = vehicleMake(active);
  const isTesla = make === 'tesla';
  const letter = isTesla ? 'T' : 'M';

  const cycle = () => {
    const idx = vehicles.findIndex((v) => v.id === active.id);
    const next = vehicles[(idx + 1) % vehicles.length];
    if (next) setActive(next.id);
  };

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`สลับรถ — ขณะนี้คือ ${active.model} ${active.plate}`}
      title={`${active.model} · ${active.plate} — แตะเพื่อสลับ`}
      className="relative inline-flex h-11 w-20 items-center rounded-full bg-brandSoft ring-1 ring-white/70 transition-colors active:scale-95"
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full bg-white text-base font-bold text-brand shadow-sm transition-transform ${
          isTesla ? 'translate-x-[44px]' : 'translate-x-1'
        }`}
      >
        {letter}
      </span>
    </button>
  );
}
