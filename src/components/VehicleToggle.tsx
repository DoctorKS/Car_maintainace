import { useVehicles, useActiveVehicle, vehicleMake } from '@/hooks/useVehicle';
import { useVehicleStore } from '@/store/vehicle';
import { useSession } from '@/lib/supabase/session';

/**
 * Pill-shaped vehicle switcher styled like a hardware toggle.
 *
 * The moving knob carries a small PNG mark for the active vehicle —
 * Mazda or Tesla — pulled from `public/icons/vehicles/{mazda,tesla}.png`
 * (user-supplied art; the toggle just routes the file). The track tint
 * follows the active brand palette via the `body[data-vehicle-make]`
 * CSS-variable swap, so the pill turns Mazda blue or Tesla red without
 * any inline JS.
 *
 * Tap cycles to the next vehicle in the user's list.
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
  const iconSrc = isTesla ? '/icons/vehicles/tesla.png' : '/icons/vehicles/mazda.png';

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
        className={`flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
          isTesla ? 'translate-x-[44px]' : 'translate-x-1'
        }`}
      >
        <img
          src={iconSrc}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="h-6 w-6 object-contain"
        />
      </span>
    </button>
  );
}
