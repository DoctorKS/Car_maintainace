import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/sync/db';
import type { CategoryCode } from '@/lib/categories';
import type { MaintenanceItemRow, MaintenanceVisitRow } from '@/types/db';

export interface PartTimelineEntry {
  visitId: string;
  serviceDate: string; // YYYY-MM-DD
  quantity: number;
  totalPrice: number;
}

export interface PartGroup {
  partName: string;
  totalSpent: number;
  count: number;
  entries: PartTimelineEntry[];
}

/** Group items by part_name within a single category, newest entry first. */
export function useByPart(
  userId: string | undefined,
  categoryCode: CategoryCode,
): PartGroup[] {
  return (
    useLiveQuery(
      async () => {
        if (!userId) return [];
        const [items, visits] = await Promise.all([
          db.maintenance_items
            .where('user_id')
            .equals(userId)
            .and((i) => i.category_code === categoryCode)
            .toArray(),
          db.maintenance_visits.where('user_id').equals(userId).toArray(),
        ]);
        const visitMap = new Map<string, MaintenanceVisitRow>(visits.map((v) => [v.id, v]));
        const groups = new Map<string, PartGroup>();
        for (const it of items as MaintenanceItemRow[]) {
          const v = visitMap.get(it.visit_id);
          if (!v) continue;
          const g = groups.get(it.part_name) ?? {
            partName: it.part_name,
            totalSpent: 0,
            count: 0,
            entries: [] as PartTimelineEntry[],
          };
          g.totalSpent += Number(it.total_price ?? 0);
          g.count += 1;
          g.entries.push({
            visitId: v.id,
            serviceDate: v.service_date,
            quantity: Number(it.quantity ?? 1),
            totalPrice: Number(it.total_price ?? 0),
          });
          groups.set(it.part_name, g);
        }
        const arr = [...groups.values()];
        for (const g of arr) {
          g.entries.sort((a, b) => (a.serviceDate < b.serviceDate ? 1 : -1));
        }
        // Sort groups by most recent entry then total spent.
        arr.sort((a, b) => {
          const da = a.entries[0]?.serviceDate ?? '';
          const db_ = b.entries[0]?.serviceDate ?? '';
          if (da !== db_) return da < db_ ? 1 : -1;
          return b.totalSpent - a.totalSpent;
        });
        return arr;
      },
      [userId, categoryCode],
      [],
    ) ?? []
  );
}
