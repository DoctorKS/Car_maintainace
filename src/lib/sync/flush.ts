import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { db, META_KEYS, type PendingMutation, type PendingUpload } from './db';
import type { EntityName } from '@/types/db';

/**
 * Drain `pending_mutations` and `pending_uploads` against Supabase.
 *
 * - Idempotent via `(user_id, local_uuid)` upserts on visits/items.
 * - Transient errors → exponential backoff per mutation, capped 30s.
 * - Permanent errors (RLS/auth) → recorded in meta + surfaced via OfflineBadge.
 */

let flushing = false;
let scheduled: number | null = null;

const MAX_BACKOFF_MS = 30_000;
const MIN_BACKOFF_MS = 800;

const backoffMs = (attempts: number): number =>
  Math.min(MAX_BACKOFF_MS, MIN_BACKOFF_MS * 2 ** Math.max(0, attempts - 1));

/** Schedule a flush asap (next tick) — safe to call frequently. */
export function scheduleFlush(): void {
  if (scheduled !== null) return;
  scheduled = window.setTimeout(() => {
    scheduled = null;
    void flushNow();
  }, 0);
}

export async function flushNow(): Promise<void> {
  if (flushing) return;
  if (!isSupabaseConfigured()) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

  flushing = true;
  try {
    await drainMutations();
    await drainUploads();
    await db.meta.put({ key: META_KEYS.lastFlushError, value: null });
  } catch (err) {
    console.warn('[sync] flush error', err);
    await db.meta.put({
      key: META_KEYS.lastFlushError,
      value: (err as Error)?.message ?? String(err),
    });
  } finally {
    flushing = false;
  }
}

async function drainMutations(): Promise<void> {
  // FIFO loop; bail on first transient failure (it will retry on next trigger).
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const m = await db.pending_mutations.orderBy('id').first();
    if (!m) return;

    try {
      await applyMutation(m);
      await db.pending_mutations.delete(m.id!);
    } catch (err) {
      const next: PendingMutation = {
        ...m,
        attempts: m.attempts + 1,
        last_error: (err as Error)?.message ?? String(err),
      };
      await db.pending_mutations.put(next);

      // Surface but don't keep retrying in this tick — let the next trigger
      // (online event, visibilitychange, manual button) backoff.
      const wait = backoffMs(next.attempts);
      window.setTimeout(() => scheduleFlush(), wait);
      throw err;
    }
  }
}

async function applyMutation(m: PendingMutation): Promise<void> {
  const entity = m.entity as EntityName;
  const payload = m.payload as { id?: string; local_uuid?: string } & Record<string, unknown>;

  if (m.op === 'delete') {
    const { error } = await supabase.from(entity).delete().eq('id', payload.id as string);
    if (error) throw error;
    return;
  }

  // upsert by (user_id, local_uuid) when available — idempotent across replays.
  const onConflict = payload.local_uuid ? 'user_id,local_uuid' : 'id';
  const { data, error } = await supabase
    .from(entity)
    .upsert(payload, { onConflict })
    .select()
    .single();
  if (error) throw error;

  // Adopt server-canonical row into local cache (clear dirty flag).
  if (data) {
    const local = { ...(data as object), _dirty: 0 as const };
    const table = db.table(entity);
    await table.put(local);
  }
}

async function drainUploads(): Promise<void> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const u = await db.pending_uploads.orderBy('id').first();
    if (!u) return;

    try {
      await applyUpload(u);
      await db.pending_uploads.delete(u.id!);
    } catch (err) {
      await db.pending_uploads.put({ ...u, attempts: u.attempts + 1 });
      const wait = backoffMs(u.attempts + 1);
      window.setTimeout(() => scheduleFlush(), wait);
      throw err;
    }
  }
}

async function applyUpload(u: PendingUpload): Promise<void> {
  const { error } = await supabase.storage
    .from('receipts')
    .upload(u.storage_path, u.blob, {
      contentType: u.mime,
      upsert: true,
    });
  if (error) throw error;

  // Patch the visit's receipt_image_path now that the object exists.
  const visitId = u.visit_id;
  const local = await db.maintenance_visits.get(visitId);
  if (local) {
    const next = { ...local, receipt_image_path: u.storage_path, _dirty: 1 as const };
    await db.maintenance_visits.put(next);
    await db.pending_mutations.add({
      entity: 'maintenance_visits',
      op: 'update',
      payload: { ...next, _dirty: undefined },
      attempts: 0,
      created_at: Date.now(),
    });
  }
}

/** Wire global listeners — call once from main.tsx. */
export function installFlushListeners(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', () => scheduleFlush());
  window.addEventListener('focus', () => scheduleFlush());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleFlush();
  });
}
