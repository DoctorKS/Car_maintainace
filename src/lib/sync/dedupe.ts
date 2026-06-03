import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { db } from './db';
import type { MaintenanceItemRow, MaintenanceVisitRow } from '@/types/db';

/**
 * Clean up `pullAll` resurrection ghosts.
 *
 * If a user hit the race that the new pull guard now prevents, their Dexie
 * already has rows that don't exist on the server. This sweep:
 *
 *   1. Fetches the canonical set of `(id, local_uuid)` for both
 *      maintenance_visits and maintenance_items from Supabase.
 *   2. Deletes any local row whose `id` isn't in the server set AND
 *      isn't currently dirty (`_dirty !== 1` — leaving room for
 *      legitimately pending local writes).
 *   3. Reports counts so the dock toast can confirm what was cleaned.
 *
 * Safe to run at any time. The ⬆ Force-resync button calls this before
 * draining the queue so a single tap clears stuck duplicates.
 */
export interface DedupeSummary {
  visitsRemoved: number;
  itemsRemoved: number;
  /** True when we couldn't reach Supabase — skip the sweep silently. */
  skipped: boolean;
}

export async function dedupeAgainstServer(userId: string | undefined): Promise<DedupeSummary> {
  if (!userId || !isSupabaseConfigured()) {
    return { visitsRemoved: 0, itemsRemoved: 0, skipped: true };
  }

  // 1. Pull canonical id lists from Supabase. RLS scopes to the current user.
  const [visitsRes, itemsRes] = await Promise.all([
    supabase.from('maintenance_visits').select('id').returns<Pick<MaintenanceVisitRow, 'id'>[]>(),
    supabase.from('maintenance_items').select('id').returns<Pick<MaintenanceItemRow, 'id'>[]>(),
  ]);

  if (visitsRes.error || itemsRes.error) {
    console.warn('[dedupe] server fetch failed', visitsRes.error ?? itemsRes.error);
    return { visitsRemoved: 0, itemsRemoved: 0, skipped: true };
  }

  const serverVisitIds = new Set((visitsRes.data ?? []).map((r) => r.id));
  const serverItemIds = new Set((itemsRes.data ?? []).map((r) => r.id));

  let visitsRemoved = 0;
  let itemsRemoved = 0;

  await db.transaction(
    'rw',
    [db.maintenance_visits, db.maintenance_items],
    async () => {
      const localVisits = await db.maintenance_visits.where('user_id').equals(userId).toArray();
      for (const v of localVisits) {
        if (v._dirty === 1) continue; // pending local write — keep it
        if (!serverVisitIds.has(v.id)) {
          await db.maintenance_visits.delete(v.id);
          visitsRemoved += 1;
        }
      }
      const localItems = await db.maintenance_items.where('user_id').equals(userId).toArray();
      for (const it of localItems) {
        if (it._dirty === 1) continue;
        if (!serverItemIds.has(it.id)) {
          await db.maintenance_items.delete(it.id);
          itemsRemoved += 1;
        }
      }
    },
  );

  return { visitsRemoved, itemsRemoved, skipped: false };
}
