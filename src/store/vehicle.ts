import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Active-vehicle selector — persisted in localStorage so the dashboard
 * remembers which vehicle the user was looking at last time.
 *
 * The hook `useActiveVehicle` (in `src/hooks/useVehicle.ts`) resolves the
 * id against the user's actual vehicles list and falls back to the first
 * row when the stored id is missing (e.g. another browser / fresh device).
 */

interface VehicleStore {
  activeVehicleId: string | null;
  setActiveVehicleId: (id: string | null) => void;
}

export const useVehicleStore = create<VehicleStore>()(
  persist(
    (set) => ({
      activeVehicleId: null,
      setActiveVehicleId: (id) => set({ activeVehicleId: id }),
    }),
    { name: 'cx5-active-vehicle' },
  ),
);
