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

/** Single row in an Add-form: { partName, qty, total }. */
export interface DraftItem {
  categoryCode: CategoryCode;
  partName: string;
  quantity: number;
  totalPrice: number;
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
