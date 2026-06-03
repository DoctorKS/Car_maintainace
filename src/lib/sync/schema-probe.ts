import { supabase } from '@/lib/supabase/client';

/**
 * Detect schema drift between the client code and the live Supabase project.
 *
 * Optional columns we probe:
 *   - `maintenance_items.notes`         — added by 0002_item_notes.sql
 *   - `maintenance_visits.is_scheduled` — added by 0003_visit_scheduled.sql
 *
 * When a column is missing, `flush.ts` strips it from upserts so the rest
 * of the row still syncs. The user should still run the migration; the
 * console.error message points at the file.
 */

export type SchemaIssue = 'item-notes' | 'visit-scheduled';

const _missing = new Set<SchemaIssue>();
let _itemsProbed = false;
let _visitsProbed = false;
let _itemsInFlight: Promise<void> | null = null;
let _visitsInFlight: Promise<void> | null = null;

export const hasItemNotes = (): boolean => !_missing.has('item-notes');
export const hasVisitScheduled = (): boolean => !_missing.has('visit-scheduled');

export function getMissingColumns(): readonly SchemaIssue[] {
  return Array.from(_missing);
}

/** Force a re-probe (e.g. after the user signs into a different project). */
export function resetSchemaProbe(): void {
  _missing.clear();
  _itemsProbed = false;
  _visitsProbed = false;
  _itemsInFlight = null;
  _visitsInFlight = null;
}

/** Called by flush.ts when an upsert error confirms the column is missing. */
export function markItemNotesMissing(): void {
  if (_missing.has('item-notes')) return;
  _missing.add('item-notes');
  console.error(
    "[schema] maintenance_items.notes confirmed missing from upsert. " +
      "Run supabase/migrations/0002_item_notes.sql in the Supabase SQL editor. " +
      "Client will keep stripping 'notes' so the rest of each item still syncs.",
  );
}

export function markVisitScheduledMissing(): void {
  if (_missing.has('visit-scheduled')) return;
  _missing.add('visit-scheduled');
  console.error(
    "[schema] maintenance_visits.is_scheduled confirmed missing. " +
      "Run supabase/migrations/0003_visit_scheduled.sql in the Supabase SQL editor. " +
      "Client will keep stripping 'is_scheduled' so visits still sync (เช็คระยะ flag will be lost until the migration runs).",
  );
}

const PGRST_COLUMN_MISSING = '42703';

function looksLikeMissingColumn(error: { code?: string; message?: string }, col: string): boolean {
  if ((error.code ?? '') === PGRST_COLUMN_MISSING) return true;
  const m = error.message ?? '';
  if (new RegExp(`column.*${col}.*does not exist`, 'i').test(m)) return true;
  if (new RegExp(`could not find.*'${col}'`, 'i').test(m)) return true;
  return false;
}

export async function probeSchema(): Promise<void> {
  await Promise.all([probeItemNotes(), probeVisitScheduled()]);
}

async function probeItemNotes(): Promise<void> {
  if (_itemsProbed) return;
  if (_itemsInFlight) return _itemsInFlight;
  _itemsInFlight = (async () => {
    try {
      const { error } = await supabase.from('maintenance_items').select('notes').limit(1);
      if (error && looksLikeMissingColumn(error, 'notes')) {
        markItemNotesMissing();
      }
    } catch (e) {
      console.warn('[schema] item-notes probe transient', e);
    } finally {
      _itemsProbed = true;
      _itemsInFlight = null;
    }
  })();
  return _itemsInFlight;
}

async function probeVisitScheduled(): Promise<void> {
  if (_visitsProbed) return;
  if (_visitsInFlight) return _visitsInFlight;
  _visitsInFlight = (async () => {
    try {
      const { error } = await supabase
        .from('maintenance_visits')
        .select('is_scheduled')
        .limit(1);
      if (error && looksLikeMissingColumn(error, 'is_scheduled')) {
        markVisitScheduledMissing();
      }
    } catch (e) {
      console.warn('[schema] visit-scheduled probe transient', e);
    } finally {
      _visitsProbed = true;
      _visitsInFlight = null;
    }
  })();
  return _visitsInFlight;
}
