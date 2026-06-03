import { v4 as uuid } from 'uuid';
import { db } from './db';
import { enqueue } from './queue';
import { scheduleFlush } from './flush';
import type {
  CustomPartRow,
  MaintenanceItemRow,
  MaintenanceVisitRow,
  ServiceCenterRow,
  VehicleRow,
} from '@/types/db';
import type { CategoryCode } from '@/lib/categories';
import type { DraftVisit } from '@/types/domain';

/**
 * Write-through repository.
 *
 * Every mutation:
 *   1. Generates IDs client-side (so optimistic UI links work).
 *   2. Writes Dexie inside a transaction, then enqueues the mutation.
 *   3. Triggers a flush attempt (silent if offline).
 *
 * Reads happen straight from Dexie via `useLiveQuery` in hooks/.
 */

const nowIso = () => new Date().toISOString();

// ---------- Vehicles ---------------------------------------------------------

export async function updateMileage(vehicleId: string, mileage: number): Promise<void> {
  const v = await db.vehicles.get(vehicleId);
  if (!v) throw new Error('Vehicle not found locally');
  const next: VehicleRow = { ...v, mileage, updated_at: nowIso() };
  await db.transaction('rw', [db.vehicles, db.pending_mutations], async () => {
    await db.vehicles.put({ ...next, _dirty: 1 });
    await enqueue('vehicles', 'update', next);
  });
  scheduleFlush();
}

// ---------- Service centers --------------------------------------------------

export async function insertServiceCenter(
  userId: string,
  name: string,
): Promise<ServiceCenterRow> {
  const row: ServiceCenterRow = {
    id: uuid(),
    user_id: userId,
    name,
    is_default: false,
    created_at: nowIso(),
  };
  await db.transaction('rw', [db.service_centers, db.pending_mutations], async () => {
    await db.service_centers.put({ ...row, _dirty: 1 });
    await enqueue('service_centers', 'insert', row);
  });
  scheduleFlush();
  return row;
}

// ---------- Custom parts -----------------------------------------------------

export async function insertCustomPart(
  userId: string,
  categoryCode: CategoryCode,
  partName: string,
): Promise<CustomPartRow> {
  const row: CustomPartRow = {
    id: uuid(),
    user_id: userId,
    category_code: categoryCode,
    part_name: partName,
    created_at: nowIso(),
  };
  await db.transaction('rw', [db.custom_parts, db.pending_mutations], async () => {
    await db.custom_parts.put({ ...row, _dirty: 1 });
    await enqueue('custom_parts', 'insert', row);
  });
  scheduleFlush();
  return row;
}

// ---------- Visits + items ---------------------------------------------------

export async function insertVisit(
  userId: string,
  draft: DraftVisit,
): Promise<{ visitId: string; pendingReceipt: boolean }> {
  const visitId = uuid();
  const visitLocalUuid = uuid();
  const created = nowIso();

  // If a receipt was attached, predict its storage path now (so we can write it
  // straight onto the visit row); the actual upload is queued separately.
  const receiptPath = draft.receiptBlob
    ? `${userId}/${visitId}/${uuid()}.jpg`
    : null;

  const visit: MaintenanceVisitRow = {
    id: visitId,
    local_uuid: visitLocalUuid,
    user_id: userId,
    vehicle_id: draft.vehicleId,
    service_date: draft.serviceDate,
    mileage: draft.mileage,
    service_center_id: draft.serviceCenterId,
    receipt_image_path: receiptPath,
    notes: draft.notes ?? null,
    created_at: created,
    updated_at: created,
  };

  const items: MaintenanceItemRow[] = draft.items.map((d) => ({
    id: uuid(),
    local_uuid: uuid(),
    visit_id: visitId,
    user_id: userId,
    category_code: d.categoryCode,
    part_name: d.partName,
    quantity: d.quantity,
    total_price: d.totalPrice,
    notes: d.notes?.trim() ? d.notes.trim() : null,
    created_at: created,
  }));

  await db.transaction(
    'rw',
    [db.maintenance_visits, db.maintenance_items, db.pending_mutations, db.pending_uploads],
    async () => {
      await db.maintenance_visits.put({ ...visit, _dirty: 1 });
      await db.maintenance_items.bulkPut(items.map((i) => ({ ...i, _dirty: 1 })));

      await enqueue('maintenance_visits', 'insert', visit);
      for (const it of items) {
        await enqueue('maintenance_items', 'insert', it);
      }

      if (draft.receiptBlob && receiptPath) {
        await db.pending_uploads.add({
          visit_id: visitId,
          storage_path: receiptPath,
          blob: draft.receiptBlob,
          mime: draft.receiptMime ?? 'image/jpeg',
          attempts: 0,
          created_at: Date.now(),
        });
      }
    },
  );

  scheduleFlush();
  return { visitId, pendingReceipt: Boolean(draft.receiptBlob) };
}

/**
 * Update an existing visit + its items.
 *
 * Strategy: keep the visit row (so its id + local_uuid stay stable), but
 * fully replace the items by deleting old rows and inserting fresh ones.
 * The mutation queue is FIFO and idempotent, so on the server we get
 * `delete(items.old) → insert(items.new) → update(visit)` in order, with
 * no risk of stale items lingering.
 *
 * Receipt upload behaviour matches insertVisit: a new Blob is queued for
 * upload + a follow-up update patches `receipt_image_path`. If no new blob
 * is attached, the previous receipt_image_path is preserved.
 */
export async function updateVisit(
  userId: string,
  visitId: string,
  draft: DraftVisit,
): Promise<{ pendingReceipt: boolean }> {
  const existing = await db.maintenance_visits.get(visitId);
  if (!existing) throw new Error('ไม่พบรายการที่จะแก้ไข');

  const updated_at = nowIso();
  const receiptPath = draft.receiptBlob
    ? `${userId}/${visitId}/${uuid()}.jpg`
    : existing.receipt_image_path;

  const visit: MaintenanceVisitRow = {
    ...existing,
    service_date: draft.serviceDate,
    mileage: draft.mileage,
    service_center_id: draft.serviceCenterId,
    receipt_image_path: receiptPath,
    notes: draft.notes ?? existing.notes,
    updated_at,
  };

  const newItems: MaintenanceItemRow[] = draft.items.map((d) => ({
    id: uuid(),
    local_uuid: uuid(),
    visit_id: visitId,
    user_id: userId,
    category_code: d.categoryCode,
    part_name: d.partName,
    quantity: d.quantity,
    total_price: d.totalPrice,
    notes: d.notes?.trim() ? d.notes.trim() : null,
    created_at: updated_at,
  }));

  await db.transaction(
    'rw',
    [db.maintenance_visits, db.maintenance_items, db.pending_mutations, db.pending_uploads],
    async () => {
      // 1) Delete old items locally + queue server deletes.
      const oldItems = await db.maintenance_items.where('visit_id').equals(visitId).toArray();
      for (const old of oldItems) {
        await db.maintenance_items.delete(old.id);
        await enqueue('maintenance_items', 'delete', { id: old.id, user_id: userId });
      }

      // 2) Insert replacement items.
      await db.maintenance_items.bulkPut(newItems.map((i) => ({ ...i, _dirty: 1 })));
      for (const it of newItems) {
        await enqueue('maintenance_items', 'insert', it);
      }

      // 3) Update the visit row.
      await db.maintenance_visits.put({ ...visit, _dirty: 1 });
      await enqueue('maintenance_visits', 'update', visit);

      // 4) If a new photo was attached, queue upload + later receipt-path patch.
      if (draft.receiptBlob && receiptPath && receiptPath !== existing.receipt_image_path) {
        await db.pending_uploads.add({
          visit_id: visitId,
          storage_path: receiptPath,
          blob: draft.receiptBlob,
          mime: draft.receiptMime ?? 'image/jpeg',
          attempts: 0,
          created_at: Date.now(),
        });
      }
    },
  );

  scheduleFlush();
  return { pendingReceipt: Boolean(draft.receiptBlob) };
}

export async function deleteVisit(visitId: string): Promise<void> {
  const v = await db.maintenance_visits.get(visitId);
  if (!v) return;
  await db.transaction(
    'rw',
    [db.maintenance_visits, db.maintenance_items, db.pending_mutations],
    async () => {
      await db.maintenance_visits.delete(visitId);
      await db.maintenance_items.where('visit_id').equals(visitId).delete();
      await enqueue('maintenance_visits', 'delete', { id: visitId, user_id: v.user_id });
    },
  );
  scheduleFlush();
}
