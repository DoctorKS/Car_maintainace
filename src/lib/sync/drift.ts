import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { db } from './db';
import type { EntityName } from '@/types/db';

/**
 * Drift check — answer the question "is my local state in sync with the
 * Supabase server?".
 *
 * It surfaces three levels of trouble:
 *
 *   1. queue health — anything in pending_mutations / pending_uploads /
 *      dead_letters is by definition drift.
 *   2. stuck mutations — pending entries that have failed > 3 times
 *      (probably hitting a hard error, e.g. RLS or schema).
 *   3. row-count mismatch — for each user-scoped table, compare local
 *      count vs server count (HEAD request, no body). Mismatch means
 *      either (a) we haven't pulled the latest, or (b) something we
 *      wrote locally hasn't reached the server.
 *
 * Auto-runs every 5 min via `useDriftStatus`. Manual run via the 🩺 button.
 */

export interface EntityCount {
  entity: EntityName;
  local: number;
  server: number;
}

export interface DriftResult {
  pending: number;
  uploads: number;
  deadLetters: number;
  stuckPending: number;
  counts: EntityCount[];
  /** True when ANY of the above signals indicate trouble. */
  drifted: boolean;
  /** The first signal we found, for a short toast / banner string. */
  primaryReason: string | null;
  checkedAt: number;
}

const ENTITIES: EntityName[] = [
  'vehicles',
  'service_centers',
  'maintenance_visits',
  'maintenance_items',
  'custom_parts',
];

async function localCount(entity: EntityName, userId: string): Promise<number> {
  // Dynamic dispatch over Dexie table names — every entity in ENTITIES
  // has a `user_id` index.
  return db.table(entity).where('user_id').equals(userId).count();
}

async function serverCount(entity: EntityName): Promise<number> {
  // head:true → HEAD request, returns Content-Range with count and no body.
  const { count, error } = await supabase
    .from(entity)
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function runDriftCheck(userId: string | undefined): Promise<DriftResult> {
  const checkedAt = Date.now();
  const [pending, uploads, deadLetters, stuckPending] = await Promise.all([
    db.pending_mutations.count(),
    db.pending_uploads.count(),
    db.dead_letters.count(),
    db.pending_mutations.filter((m) => m.attempts > 3).count(),
  ]);

  let counts: EntityCount[] = [];
  if (userId && isSupabaseConfigured()) {
    counts = await Promise.all(
      ENTITIES.map(async (entity) => {
        try {
          const [local, server] = await Promise.all([
            localCount(entity, userId),
            serverCount(entity),
          ]);
          return { entity, local, server };
        } catch (e) {
          console.warn('[drift] server count failed for', entity, e);
          return { entity, local: 0, server: -1 }; // -1 = unknown
        }
      }),
    );
  }

  const mismatched = counts.filter((c) => c.server >= 0 && c.local !== c.server);

  const reasons: string[] = [];
  if (pending > 0) reasons.push(`pending ${pending}`);
  if (uploads > 0) reasons.push(`uploads ${uploads}`);
  if (deadLetters > 0) reasons.push(`dead ${deadLetters}`);
  if (stuckPending > 0) reasons.push(`stuck ${stuckPending}`);
  if (mismatched.length > 0) {
    reasons.push(
      `count ` +
        mismatched.map((c) => `${c.entity}(${c.local}≠${c.server})`).join(' '),
    );
  }

  return {
    pending,
    uploads,
    deadLetters,
    stuckPending,
    counts,
    drifted: reasons.length > 0,
    primaryReason: reasons[0] ?? null,
    checkedAt,
  };
}

/** Format a DriftResult for a one-line toast / banner. */
export function summarizeDrift(r: DriftResult): string {
  if (!r.drifted) return '🩺 ทุกอย่าง sync — ไม่พบ drift';
  return `🩺 drift · ${r.primaryReason} (ดู console)`;
}
