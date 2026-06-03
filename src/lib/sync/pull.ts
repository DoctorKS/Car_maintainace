import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { db, META_KEYS } from './db';
import type {
  CustomPartRow,
  MaintenanceItemRow,
  MaintenanceVisitRow,
  ServiceCenterRow,
  VehicleRow,
} from '@/types/db';

/**
 * Delta pull — fetches rows updated since the last successful pull and
 * bulk-puts them into Dexie with `_dirty = 0`.
 *
 * Runs on login, after every successful flush, and on `online` events.
 */
export async function pullAll(): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const since = ((await db.meta.get(META_KEYS.lastSyncedAt))?.value as string) ?? '1970-01-01';

  // Vehicles, service_centers, visits use updated_at; items / custom_parts use created_at.
  const [v, sc, mv, mi, cp] = await Promise.all([
    supabase
      .from('vehicles')
      .select('*')
      .gte('updated_at', since)
      .returns<VehicleRow[]>(),
    supabase
      .from('service_centers')
      .select('*')
      .gte('created_at', since)
      .returns<ServiceCenterRow[]>(),
    supabase
      .from('maintenance_visits')
      .select('*')
      .gte('updated_at', since)
      .returns<MaintenanceVisitRow[]>(),
    supabase
      .from('maintenance_items')
      .select('*')
      .gte('created_at', since)
      .returns<MaintenanceItemRow[]>(),
    supabase
      .from('custom_parts')
      .select('*')
      .gte('created_at', since)
      .returns<CustomPartRow[]>(),
  ]);

  // Stop early on errors — don't update lastSyncedAt.
  if (v.error || sc.error || mv.error || mi.error || cp.error) {
    const err = v.error ?? sc.error ?? mv.error ?? mi.error ?? cp.error;
    throw err;
  }

  await db.transaction(
    'rw',
    [db.vehicles, db.service_centers, db.maintenance_visits, db.maintenance_items, db.custom_parts],
    async () => {
      if (v.data?.length) await db.vehicles.bulkPut(v.data.map((r) => ({ ...r, _dirty: 0 })));
      if (sc.data?.length)
        await db.service_centers.bulkPut(sc.data.map((r) => ({ ...r, _dirty: 0 })));
      if (mv.data?.length)
        await db.maintenance_visits.bulkPut(mv.data.map((r) => ({ ...r, _dirty: 0 })));
      if (mi.data?.length)
        await db.maintenance_items.bulkPut(mi.data.map((r) => ({ ...r, _dirty: 0 })));
      if (cp.data?.length) await db.custom_parts.bulkPut(cp.data.map((r) => ({ ...r, _dirty: 0 })));
    },
  );

  await db.meta.put({ key: META_KEYS.lastSyncedAt, value: new Date().toISOString() });
}
