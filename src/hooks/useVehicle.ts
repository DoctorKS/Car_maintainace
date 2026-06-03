import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useVehicleStore } from '@/store/vehicle';
import type { VehicleRow } from '@/types/db';

/** Query key for the vehicles list — exported so mutations can invalidate. */
export const VEHICLES_QK = (userId: string | undefined) => ['vehicles', userId];
/** Legacy alias — same key, kept so MileageOverlay's import keeps working. */
export const VEHICLE_QK = VEHICLES_QK;

/** All of the current user's vehicles, ordered by creation time. */
export function useVehicles(userId: string | undefined): VehicleRow[] {
  const { data } = useQuery({
    queryKey: ['vehicles', userId],
    queryFn: async (): Promise<VehicleRow[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as VehicleRow[];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
  return data ?? [];
}

/**
 * Resolve the active vehicle from the Zustand store + the loaded list.
 *
 *   - Falls back to the first vehicle when the stored id doesn't match
 *     any row (fresh device, deleted vehicle).
 *   - When the store has no id yet, the first row is selected automatically
 *     so the dashboard isn't blank on first load.
 */
export function useActiveVehicle(userId: string | undefined): VehicleRow | null {
  const vehicles = useVehicles(userId);
  const activeId = useVehicleStore((s) => s.activeVehicleId);
  const setActiveVehicleId = useVehicleStore((s) => s.setActiveVehicleId);

  const resolved = vehicles.find((v) => v.id === activeId) ?? vehicles[0] ?? null;

  useEffect(() => {
    if (resolved && resolved.id !== activeId) {
      setActiveVehicleId(resolved.id);
    }
  }, [resolved, activeId, setActiveVehicleId]);

  return resolved;
}

/** Backwards-compat alias — returns the active vehicle (previously the first). */
export function useVehicle(userId: string | undefined): VehicleRow | null {
  return useActiveVehicle(userId);
}

/** Coarse make classification for the toggle + theme switch. */
export function vehicleMake(v: VehicleRow | null): 'mazda' | 'tesla' | 'other' {
  if (!v) return 'other';
  const m = v.model.toLowerCase();
  if (m.includes('tesla')) return 'tesla';
  if (m.includes('mazda')) return 'mazda';
  return 'other';
}
