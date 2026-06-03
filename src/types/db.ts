/**
 * Hand-written DB types — kept in sync with supabase/migrations/0001_init.sql.
 *
 * Once you've run `supabase gen types typescript --linked > src/types/db.generated.ts`,
 * you can switch imports to that file. This handwritten version means the app
 * compiles before the Supabase project is provisioned.
 */

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export interface VehicleRow {
  id: string;
  user_id: string;
  plate: string;
  model: string;
  year: number;
  mileage: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceCenterRow {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

export interface MaintenanceVisitRow {
  id: string;
  local_uuid: string;
  user_id: string;
  vehicle_id: string;
  service_date: string; // ISO date YYYY-MM-DD
  mileage: number;
  service_center_id: string | null;
  receipt_image_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceItemRow {
  id: string;
  local_uuid: string;
  visit_id: string;
  user_id: string;
  category_code: number; // 1..6
  part_name: string;
  quantity: number;
  total_price: number;
  /** Per-item note. Added by 0002_item_notes.sql; null on rows created before. */
  notes: string | null;
  created_at: string;
}

export interface CustomPartRow {
  id: string;
  user_id: string;
  category_code: number;
  part_name: string;
  created_at: string;
}

export type EntityName =
  | 'vehicles'
  | 'service_centers'
  | 'maintenance_visits'
  | 'maintenance_items'
  | 'custom_parts';
