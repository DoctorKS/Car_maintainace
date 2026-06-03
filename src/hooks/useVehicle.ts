import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { VehicleRow } from '@/types/db';

/** Current user's primary vehicle — first row in `vehicles`. */
export function useVehicle(userId: string | undefined): VehicleRow | null {
  const { data } = useQuery({
    queryKey: ['vehicle', userId],
    queryFn: async (): Promise<VehicleRow | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as VehicleRow) ?? null;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
  return data ?? null;
}

/** React Query key for the vehicle — exported so mutations can invalidate. */
export const VEHICLE_QK = (userId: string | undefined) => ['vehicle', userId];
