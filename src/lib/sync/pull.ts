import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { db, META_KEYS } from './db';
import type {
  CustomPartRow,
  EntityName,
  MaintenanceItemRow,
  MaintenanceVisitRow,
  ServiceCenterRow,
  VehicleRow,
} from '@/types/db';

/**
 * Delta pull — fetches rows updated since the last successful pull and
 * bulk-puts them into Dexie with `_dirty = 0`.
 *
 * Runs on login, after every successful flush, and on Dashboard mount.
 *
 * **Pull guard** (added 2026-06 after a "duplicate ใน Dexie แต่ไม่มีใน
 * Supabase" report): each bulkPut filters out two classes of rows before
 * writing:
 *
 *   1. **Tombstoned IDs** — rows whose `id` appears in `pending_mutations`
 *      or `dead_letters` as a `delete` op. Without this, a delete that's
 *      still in flight gets resurrected by the very next pull: local
 *      had it removed, server still has it, pull sees server, bulkPut
 *      reinserts. Then flush deletes on server but Dexie keeps the row.
 *      Users see "ลบเท่าไหร่ก็ duplicate ใหม่".
 *
 *   2. **Dirty local rows** (`_dirty=1`) — these have pending writes the
 *      server hasn't seen. Letting pull overwrite would clobber the
 *      user's typing. Skip and let flush sync them when it runs.
 *
 * `lastSyncedAt` is only advanced after a successful transaction so a
 * dropped pull retries the same delta next time.
 */

interface Pullable {
  id: string;
}

async function deletedIds(entity: EntityName): Promise<Set<string>> {
  const [pending, dead] = await Promise.all([
    db.pending_mutations
      .filter((m) => m.entity === entity && m.op === 'delete')
      .toArray(),
    db.dead_letters.filter((m) => m.entity === entity && m.op === 'delete').toArray(),
  ]);
  const out = new Set<string>();
  for (const m of pending) {
    const id = (m.payload as { id?: string }).id;
    if (id) out.add(id);
  }
  for (const m of dead) {
    const id = (m.payload as { id?: string }).id;
    if (id) out.add(id);
  }
  return out;
}

async function dirtyIds(table: { toArray: () => Promise<Array<{ id?: string; _dirty?: number }>> }): Promise<Set<string>> {
  const all = await table.toArray();
  const out = new Set<string>();
  for (const r of all) {
    if (r._dirty === 1 && r.id) out.add(r.id);
  }
  return out;
}

async function safeBulkPut<T extends Pullable>(
  entity: EntityName,
  rows: T[],
): Promise<void> {
  if (!rows.length) return;
  const table = db.table(entity);
  const [tombstones, dirty] = await Promise.all([
    deletedIds(entity),
    dirtyIds(table),
  ]);
  const filtered = rows.filter((r) => !tombstones.has(r.id) && !dirty.has(r.id));
  if (filtered.length === 0) return;
  await table.bulkPut(filtered.map((r) => ({ ...(r as object), _dirty: 0 })));
}

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
    [
      db.vehicles,
      db.service_centers,
      db.maintenance_visits,
      db.maintenance_items,
      db.custom_parts,
      db.pending_mutations,
      db.dead_letters,
    ],
    async () => {
      await safeBulkPut('vehicles', v.data ?? []);
      await safeBulkPut('service_centers', sc.data ?? []);
      await safeBulkPut('maintenance_visits', mv.data ?? []);
      await safeBulkPut('maintenance_items', mi.data ?? []);
      await safeBulkPut('custom_parts', cp.data ?? []);
    },
  );

  await db.meta.put({ key: META_KEYS.lastSyncedAt, value: new Date().toISOString() });
}
