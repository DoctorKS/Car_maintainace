import type {
  MaintenanceItemRow,
  MaintenanceVisitRow,
  ServiceCenterRow,
  VehicleRow,
} from './db';
import type { CategoryCode } from '@/lib/categories';

/** Visit + its items hydrated together — what cards/lists render. */
export interface MaintenanceVisitWithItems extends MaintenanceVisitRow {
  items: MaintenanceItemRow[];
  service_center?: ServiceCenterRow | null;
  total_amount: number;
}

/**
 * Single row in the Add/Edit form.
 *
 * `unitPrice` is form-only — what the user types in "ราคา/ชิ้น".
 * `totalPrice` is what the DB stores (= quantity × unitPrice, also
 * displayed in the "ราคารวม" field). When loading an existing visit, we
 * back-compute `unitPrice` from `totalPrice / quantity` so the form
 * round-trips cleanly.
 */
export interface DraftItem {
  categoryCode: CategoryCode;
  partName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

/** Payload for `repository.insertVisit`. */
export interface DraftVisit {
  vehicleId: string;
  serviceDate: string; // YYYY-MM-DD
  mileage: number;
  serviceCenterId: string | null;
  notes?: string;
  items: DraftItem[];
  receiptBlob?: Blob | null;
  receiptMime?: string | null;
}

export type { VehicleRow };
