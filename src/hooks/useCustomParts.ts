import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/sync/db';
import type { CategoryCode } from '@/lib/categories';

/** Service centers for the dropdown — seeds + user's own additions. */
export function useServiceCenters(userId: string | undefined) {
  return (
    useLiveQuery(
      async () => {
        if (!userId) return [];
        const rows = await db.service_centers.where('user_id').equals(userId).toArray();
        return rows.sort((a, b) => a.name.localeCompare(b.name, 'th'));
      },
      [userId],
      [],
    ) ?? []
  );
}

/** Custom user-added parts for a specific category. */
export function useCustomParts(userId: string | undefined, categoryCode: CategoryCode) {
  return (
    useLiveQuery(
      async () => {
        if (!userId) return [];
        const rows = await db.custom_parts
          .where('[user_id+category_code+part_name]')
          .between([userId, categoryCode, ''], [userId, categoryCode, '￿'])
          .toArray();
        return rows.map((r) => r.part_name);
      },
      [userId, categoryCode],
      [],
    ) ?? []
  );
}
