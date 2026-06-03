import { db } from './db';
import { scheduleFlush } from './flush';

/**
 * Manual "kick the queue" — same intent as Shift_count's `manualResync()`:
 *   - reset attempts/last_error on every pending mutation (so the next
 *     drain skips the backoff and tries immediately),
 *   - resurrect everything in dead_letters back into pending_mutations
 *     so a fresh attempt runs.
 *
 * Returns the counts that were touched so the caller can render a toast.
 */
export interface ResyncSummary {
  reset: number;
  revived: number;
}

export async function forceResyncQueue(): Promise<ResyncSummary> {
  let reset = 0;
  let revived = 0;

  await db.transaction('rw', [db.pending_mutations, db.dead_letters], async () => {
    const pending = await db.pending_mutations.toArray();
    for (const m of pending) {
      if (m.attempts > 0 || m.last_error) {
        await db.pending_mutations.put({
          ...m,
          attempts: 0,
          last_error: null,
        });
        reset += 1;
      }
    }

    const dead = await db.dead_letters.toArray();
    for (const d of dead) {
      await db.pending_mutations.add({
        entity: d.entity,
        op: d.op,
        payload: d.payload,
        attempts: 0,
        last_error: null,
        created_at: d.enqueued_at,
      });
      await db.dead_letters.delete(d.id!);
      revived += 1;
    }
  });

  scheduleFlush();
  return { reset, revived };
}
