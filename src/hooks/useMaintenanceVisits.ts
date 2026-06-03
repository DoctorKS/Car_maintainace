import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/sync/db';
import type { MaintenanceVisitWithItems } from '@/types/domain';
import type { MaintenanceItemRow, MaintenanceVisitRow, ServiceCenterRow } from '@/types/db';

const hydrate = (
  v: MaintenanceVisitRow,
  items: MaintenanceItemRow[],
  centers: Map<string, ServiceCenterRow>,
): MaintenanceVisitWithItems => ({
  ...v,
  items,
  service_center: v.service_center_id ? (centers.get(v.service_center_id) ?? null) : null,
  total_amount: items.reduce((s, i) => s + Number(i.total_price ?? 0), 0),
});

/**
 * All of a user's visits, newest first, with items + center hydrated.
 * Pass `limit` to cap (e.g. 5 on the dashboard).
 */
export function useMaintenanceVisits(
  userId: string | undefined,
  options: { limit?: number; offset?: number } = {},
): MaintenanceVisitWithItems[] {
  const { limit, offset = 0 } = options;
  const visits = useLiveQuery(
    async (): Promise<MaintenanceVisitWithItems[]> => {
      if (!userId) return [];
      let q = db.maintenance_visits.where('user_id').equals(userId);
      const all = (await q.toArray()).sort((a, b) =>
        a.service_date < b.service_date ? 1 : a.service_date > b.service_date ? -1 : 0,
      );
      const sliced = limit ? all.slice(offset, offset + limit) : all.slice(offset);
      const visitIds = sliced.map((v) => v.id);
      const [items, centers] = await Promise.all([
        db.maintenance_items.where('visit_id').anyOf(visitIds).toArray(),
        db.service_centers.where('user_id').equals(userId).toArray(),
      ]);
      const centerMap = new Map(centers.map((c) => [c.id, c]));
      const itemsByVisit = new Map<string, MaintenanceItemRow[]>();
      for (const it of items) {
        const arr = itemsByVisit.get(it.visit_id) ?? [];
        arr.push(it);
        itemsByVisit.set(it.visit_id, arr);
      }
      return sliced.map((v) => hydrate(v, itemsByVisit.get(v.id) ?? [], centerMap));
    },
    [userId, limit, offset],
    [],
  );
  return visits ?? [];
}

/** Visits whose service_date falls in [fromIso, toIso] inclusive. */
export function useVisitsInRange(
  userId: string | undefined,
  fromIso: string,
  toIso: string,
): MaintenanceVisitWithItems[] {
  const visits = useLiveQuery(
    async () => {
      if (!userId) return [];
      const matched = (await db.maintenance_visits.where('user_id').equals(userId).toArray())
        .filter((v) => v.service_date >= fromIso && v.service_date <= toIso)
        .sort((a, b) => (a.service_date < b.service_date ? 1 : -1));
      const visitIds = matched.map((v) => v.id);
      const [items, centers] = await Promise.all([
        db.maintenance_items.where('visit_id').anyOf(visitIds).toArray(),
        db.service_centers.where('user_id').equals(userId).toArray(),
      ]);
      const centerMap = new Map(centers.map((c) => [c.id, c]));
      const itemsByVisit = new Map<string, MaintenanceItemRow[]>();
      for (const it of items) {
        const arr = itemsByVisit.get(it.visit_id) ?? [];
        arr.push(it);
        itemsByVisit.set(it.visit_id, arr);
      }
      return matched.map((v) => hydrate(v, itemsByVisit.get(v.id) ?? [], centerMap));
    },
    [userId, fromIso, toIso],
    [],
  );
  return visits ?? [];
}

/** Just the set of dates with at least one visit in [from, to]. */
export function useVisitDateSet(
  userId: string | undefined,
  fromIso: string,
  toIso: string,
): Set<string> {
  const dates = useLiveQuery(
    async () => {
      if (!userId) return new Set<string>();
      const rows = await db.maintenance_visits.where('user_id').equals(userId).toArray();
      const s = new Set<string>();
      for (const r of rows) {
        if (r.service_date >= fromIso && r.service_date <= toIso) s.add(r.service_date);
      }
      return s;
    },
    [userId, fromIso, toIso],
    new Set<string>(),
  );
  return dates ?? new Set<string>();
}

export function useVisitCount(userId: string | undefined): number {
  return (
    useLiveQuery(
      async () => {
        if (!userId) return 0;
        return db.maintenance_visits.where('user_id').equals(userId).count();
      },
      [userId],
      0,
    ) ?? 0
  );
}
