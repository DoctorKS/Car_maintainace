import { db, type Op } from './db';
import type { EntityName } from '@/types/db';

/**
 * Enqueue a mutation to be replayed against Supabase.
 *
 * Callers should also write the row to its local table within the same
 * transaction so the UI sees the change immediately. `repository.ts` does that.
 */
export async function enqueue(
  entity: EntityName,
  op: Op,
  payload: object,
): Promise<void> {
  await db.pending_mutations.add({
    entity,
    op,
    payload,
    attempts: 0,
    created_at: Date.now(),
  });
}

export async function pendingCount(): Promise<number> {
  return db.pending_mutations.count();
}
