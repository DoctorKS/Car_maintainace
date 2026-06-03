import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
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

interface ItemWithVisit extends MaintenanceItemRow {
  visit?: Pick<MaintenanceVisitRow, 'id' | 'service_date' | 'vehicle_id'> | null;
}

/**
 * Group items by `part_name` within a single category, newest entry first.
 *
 * When `vehicleId` is supplied (the dashboard's active toggle) only items
 * whose embedded visit belongs to that vehicle are kept. The filter is
 * applied client-side because PostgREST embeds don't support a top-level
 * filter through the join.
 */
export function useByPart(
  userId: string | undefined,
  vehicleId: string | null | undefined,
  categoryCode: CategoryCode,
): PartGroup[] {
  const { data } = useQuery({
    queryKey: ['by-part', userId, vehicleId ?? null, categoryCode],
    queryFn: async (): Promise<PartGroup[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('maintenance_items')
        .select('*, visit:maintenance_visits(id, service_date, vehicle_id)')
        .eq('user_id', userId)
        .eq('category_code', categoryCode);
      if (error) throw error;

      const rows = ((data ?? []) as ItemWithVisit[]).filter(
        (it) => it.visit && (!vehicleId || it.visit.vehicle_id === vehicleId),
      );
      const groups = new Map<string, PartGroup>();
      for (const it of rows) {
        if (!it.visit) continue;
        const g = groups.get(it.part_name) ?? {
          partName: it.part_name,
          totalSpent: 0,
          count: 0,
          entries: [] as PartTimelineEntry[],
        };
        g.totalSpent += Number(it.total_price ?? 0);
        g.count += 1;
        g.entries.push({
          visitId: it.visit.id,
          serviceDate: it.visit.service_date,
          quantity: Number(it.quantity ?? 1),
          totalPrice: Number(it.total_price ?? 0),
        });
        groups.set(it.part_name, g);
      }

      const arr = [...groups.values()];
      for (const g of arr) {
        g.entries.sort((a, b) => (a.serviceDate < b.serviceDate ? 1 : -1));
      }
      arr.sort((a, b) => {
        const da = a.entries[0]?.serviceDate ?? '';
        const db_ = b.entries[0]?.serviceDate ?? '';
        if (da !== db_) return da < db_ ? 1 : -1;
        return b.totalSpent - a.totalSpent;
      });
      return arr;
    },
    enabled: !!userId,
    staleTime: 10_000,
  });
  return data ?? [];
}
