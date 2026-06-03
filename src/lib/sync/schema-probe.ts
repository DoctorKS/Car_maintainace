import { supabase } from '@/lib/supabase/client';

/**
 * Detect schema drift between the client code and the live Supabase project.
 *
 * Right now the only optional column we probe is `maintenance_items.notes`
 * (added by `supabase/migrations/0002_item_notes.sql`). If the migration
 * wasn't applied, every per-item upsert that carries a `notes` field is
 * rejected by PostgREST with code 42703 ("column ... does not exist"),
 * and the offline queue retries forever.
 *
 * Once the probe sets the state, `flush.ts` strips the offending field on
 * the fly so existing data still syncs (notes are lost on items if the
 * column is missing — fix is to run 0002 — but every other field lands).
 */

type SchemaState = 'unknown' | 'ok' | 'item-notes-missing';

let _state: SchemaState = 'unknown';
let _inFlight: Promise<SchemaState> | null = null;

export function getSchemaState(): SchemaState {
  return _state;
}

export function hasItemNotes(): boolean {
  // Optimistic when we haven't probed yet — flush will retry on failure.
  return _state !== 'item-notes-missing';
}

/** Force a re-probe (e.g. after the user says they've run a migration). */
export function resetSchemaProbe(): void {
  _state = 'unknown';
  _inFlight = null;
}

/** Mark the column missing — called by flush.ts when an upsert error confirms it. */
export function markItemNotesMissing(): void {
  if (_state === 'item-notes-missing') return;
  _state = 'item-notes-missing';
  console.error(
    "[schema] maintenance_items.notes confirmed missing from upsert error. " +
      "Run supabase/migrations/0002_item_notes.sql in the Supabase SQL editor to keep the per-item note column. " +
      "Until then the client will strip 'notes' so the rest of each item still syncs.",
  );
}

export async function probeSchema(): Promise<SchemaState> {
  if (_state !== 'unknown') return _state;
  if (_inFlight) return _inFlight;

  _inFlight = (async () => {
    try {
      const { error } = await supabase
        .from('maintenance_items')
        .select('notes')
        .limit(1);
      if (error) {
        const msg = error.message ?? '';
        const code = (error as { code?: string }).code ?? '';
        const isMissingColumn =
          code === '42703' ||
          /column.*notes.*does not exist/i.test(msg) ||
          /could not find.*'notes'/i.test(msg);
        if (isMissingColumn) {
          _state = 'item-notes-missing';
          console.error(
            "[schema] maintenance_items.notes is missing on the live Supabase project. " +
              "Run supabase/migrations/0002_item_notes.sql in the SQL editor to enable per-item notes. " +
              "The client will strip 'notes' from item upserts in the meantime so the rest of the row still syncs.",
          );
        } else {
          // Some other error (auth, RLS, network). Don't assume schema is broken.
          _state = 'ok';
        }
      } else {
        _state = 'ok';
      }
    } catch (e) {
      // Network error — assume ok and try again later (resetSchemaProbe).
      console.warn('[schema] probe failed transient', e);
      _state = 'ok';
    } finally {
      _inFlight = null;
    }
    return _state;
  })();

  return _inFlight;
}
