import Dexie, { type Table } from 'dexie';
import type {
  CustomPartRow,
  EntityName,
  MaintenanceItemRow,
  MaintenanceVisitRow,
  ServiceCenterRow,
  VehicleRow,
} from '@/types/db';

/** A row stored locally — same shape as server, plus a dirty flag. */
type LocalRow<T> = T & { _dirty?: 0 | 1 };

export type Op = 'insert' | 'update' | 'delete';

export interface PendingMutation {
  id?: number;
  entity: EntityName;
  op: Op;
  // payload is the row to upsert (insert/update) or { id, user_id } (delete)
  payload: object;
  attempts: number;
  last_error?: string | null;
  created_at: number;
}

export interface PendingUpload {
  id?: number;
  visit_id: string; // server uuid OR temp local visit id
  storage_path: string; // proposed object path
  blob: Blob;
  mime: string;
  attempts: number;
  created_at: number;
}

export interface MetaRow {
  key: string;
  value: unknown;
}

class AppDB extends Dexie {
  vehicles!: Table<LocalRow<VehicleRow>, string>;
  service_centers!: Table<LocalRow<ServiceCenterRow>, string>;
  maintenance_visits!: Table<LocalRow<MaintenanceVisitRow>, string>;
  maintenance_items!: Table<LocalRow<MaintenanceItemRow>, string>;
  custom_parts!: Table<LocalRow<CustomPartRow>, string>;
  pending_mutations!: Table<PendingMutation, number>;
  pending_uploads!: Table<PendingUpload, number>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super('cx5-maint');
    this.version(1).stores({
      vehicles:           '&id, user_id, _dirty',
      service_centers:    '&id, user_id, name, _dirty',
      maintenance_visits: '&id, &local_uuid, user_id, service_date, vehicle_id, _dirty',
      maintenance_items:  '&id, &local_uuid, user_id, visit_id, category_code, part_name, _dirty',
      custom_parts:       '&id, user_id, [user_id+category_code+part_name], _dirty',
      pending_mutations:  '++id, entity, created_at',
      pending_uploads:    '++id, visit_id, created_at',
      meta:               '&key',
    });
  }
}

export const db = new AppDB();

/** Clear all user-scoped tables (e.g. on sign-out). */
export async function clearLocalUserData(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.vehicles,
      db.service_centers,
      db.maintenance_visits,
      db.maintenance_items,
      db.custom_parts,
      db.pending_mutations,
      db.pending_uploads,
      db.meta,
    ],
    async () => {
      await Promise.all([
        db.vehicles.clear(),
        db.service_centers.clear(),
        db.maintenance_visits.clear(),
        db.maintenance_items.clear(),
        db.custom_parts.clear(),
        db.pending_mutations.clear(),
        db.pending_uploads.clear(),
        db.meta.clear(),
      ]);
    },
  );
}

export const META_KEYS = {
  lastSyncedAt: 'lastSyncedAt',
  lastFlushError: 'lastFlushError',
} as const;
