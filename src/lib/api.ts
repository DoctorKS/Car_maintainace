import { v4 as uuid } from 'uuid';
import { supabase } from './supabase/client';
import type {
  CustomPartRow,
  MaintenanceItemRow,
  MaintenanceVisitRow,
  ServiceCenterRow,
} from '@/types/db';
import type { CategoryCode } from '@/lib/categories';
import type { DraftVisit } from '@/types/domain';

/**
 * Direct-to-Supabase mutations.
 *
 * Replaces the old offline-first repository.ts. Every call hits the network
 * synchronously — the app needs connectivity to write. The Dexie sync layer
 * was removed in this pass because the duplicate / resurrection bugs in it
 * outweighed the offline UX. Reads go through React Query hooks in
 * `src/hooks/`; mutations defined here are called from components which
 * `invalidateQueries(['<key>'])` immediately after to refresh the UI.
 *
 * Schema-probe / dead-letter / queue / flush / pull are all gone. If
 * Supabase returns an error, the mutation throws and the caller handles
 * it (toast / banner / form error).
 */

const nowIso = (): string => new Date().toISOString();

// ─── Vehicles ────────────────────────────────────────────────────────────

export async function updateMileage(vehicleId: string, mileage: number): Promise<void> {
  const { error } = await supabase
    .from('vehicles')
    .update({ mileage, updated_at: nowIso() })
    .eq('id', vehicleId);
  if (error) throw error;
}

// ─── Service centers ─────────────────────────────────────────────────────

export async function insertServiceCenter(
  userId: string,
  name: string,
): Promise<ServiceCenterRow> {
  const { data, error } = await supabase
    .from('service_centers')
    .insert({ user_id: userId, name, is_default: false })
    .select()
    .single();
  if (error) throw error;
  return data as ServiceCenterRow;
}

// ─── Custom parts ────────────────────────────────────────────────────────

export async function insertCustomPart(
  userId: string,
  categoryCode: CategoryCode,
  partName: string,
): Promise<CustomPartRow> {
  const { data, error } = await supabase
    .from('custom_parts')
    .insert({ user_id: userId, category_code: categoryCode, part_name: partName })
    .select()
    .single();
  if (error) throw error;
  return data as CustomPartRow;
}

// ─── Visits + items ──────────────────────────────────────────────────────

/**
 * Build a per-item Supabase row from a DraftItem. Sets `notes` to null when
 * blank so the server's nullable column behaves correctly; never sends
 * `notes` at all when the column is missing — the migration story for 0002
 * is the user's responsibility now (no schema probe).
 */
function itemRow(
  visitId: string,
  userId: string,
  d: DraftVisit['items'][number],
  created: string,
): Partial<MaintenanceItemRow> {
  return {
    visit_id: visitId,
    local_uuid: uuid(),
    user_id: userId,
    category_code: d.categoryCode,
    part_name: d.partName,
    quantity: d.quantity,
    total_price: d.totalPrice,
    notes: d.notes?.trim() ? d.notes.trim() : null,
    created_at: created,
  };
}

async function uploadReceipt(
  userId: string,
  visitId: string,
  blob: Blob,
  mime: string,
): Promise<string> {
  const path = `${userId}/${visitId}/${uuid()}.jpg`;
  const { error } = await supabase.storage
    .from('receipts')
    .upload(path, blob, { contentType: mime, upsert: true });
  if (error) throw error;
  return path;
}

export interface InsertVisitResult {
  visitId: string;
}

export async function insertVisit(userId: string, draft: DraftVisit): Promise<InsertVisitResult> {
  const visitId = uuid();
  const created = nowIso();

  // Upload receipt FIRST so the visit row carries the canonical path.
  // If upload fails, the visit doesn't insert — no partial state.
  let receiptPath: string | null = null;
  if (draft.receiptBlob) {
    receiptPath = await uploadReceipt(
      userId,
      visitId,
      draft.receiptBlob,
      draft.receiptMime ?? 'image/jpeg',
    );
  }

  const visit: Partial<MaintenanceVisitRow> = {
    id: visitId,
    local_uuid: uuid(),
    user_id: userId,
    vehicle_id: draft.vehicleId,
    service_date: draft.serviceDate,
    mileage: draft.mileage,
    service_center_id: draft.serviceCenterId,
    receipt_image_path: receiptPath,
    notes: draft.notes?.trim() ? draft.notes.trim() : null,
    is_scheduled: Boolean(draft.isScheduled),
    created_at: created,
    updated_at: created,
  };

  const { error: visitErr } = await supabase.from('maintenance_visits').insert(visit);
  if (visitErr) throw visitErr;

  if (draft.items.length > 0) {
    const items = draft.items.map((d) => itemRow(visitId, userId, d, created));
    const { error: itemsErr } = await supabase.from('maintenance_items').insert(items);
    if (itemsErr) throw itemsErr;
  }

  return { visitId };
}

export async function updateVisit(
  userId: string,
  visitId: string,
  draft: DraftVisit,
): Promise<void> {
  const updated_at = nowIso();

  // Optional receipt replacement.
  let receiptPath: string | null | undefined; // undefined = don't touch
  if (draft.receiptBlob) {
    receiptPath = await uploadReceipt(
      userId,
      visitId,
      draft.receiptBlob,
      draft.receiptMime ?? 'image/jpeg',
    );
  }

  // 1. Drop old items, 2. insert new items, 3. update the visit row.
  // Server's ON DELETE CASCADE is NOT used here — we delete items
  // explicitly so the result is deterministic regardless of FK config.
  const { error: delErr } = await supabase
    .from('maintenance_items')
    .delete()
    .eq('visit_id', visitId);
  if (delErr) throw delErr;

  if (draft.items.length > 0) {
    const items = draft.items.map((d) => itemRow(visitId, userId, d, updated_at));
    const { error: insErr } = await supabase.from('maintenance_items').insert(items);
    if (insErr) throw insErr;
  }

  const visitPatch: Partial<MaintenanceVisitRow> = {
    service_date: draft.serviceDate,
    mileage: draft.mileage,
    service_center_id: draft.serviceCenterId,
    notes: draft.notes !== undefined
      ? draft.notes.trim()
        ? draft.notes.trim()
        : null
      : undefined,
    is_scheduled: draft.isScheduled !== undefined ? Boolean(draft.isScheduled) : undefined,
    updated_at,
  };
  if (receiptPath !== undefined) visitPatch.receipt_image_path = receiptPath;

  // Strip undefined so Supabase doesn't clobber unchanged columns.
  const cleaned = Object.fromEntries(
    Object.entries(visitPatch).filter(([, v]) => v !== undefined),
  );

  const { error: updErr } = await supabase
    .from('maintenance_visits')
    .update(cleaned)
    .eq('id', visitId);
  if (updErr) throw updErr;
}

export async function deleteVisit(visitId: string): Promise<void> {
  const { error } = await supabase.from('maintenance_visits').delete().eq('id', visitId);
  if (error) throw error;
  // ON DELETE CASCADE on maintenance_items.visit_id handles the items.
}
