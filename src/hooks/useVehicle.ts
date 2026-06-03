import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/sync/db';
import type { VehicleRow } from '@/types/db';

/** The current user's primary vehicle (first row in vehicles). */
export function useVehicle(userId: string | undefined): VehicleRow | null {
  const v = useLiveQuery(
    async () => {
      if (!userId) return null;
      const rows = await db.vehicles.where('user_id').equals(userId).toArray();
      return rows[0] ?? null;
    },
    [userId],
    null,
  );
  return v ?? null;
}
