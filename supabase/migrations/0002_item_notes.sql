--
-- 0002_item_notes.sql
--
-- Per-item notes — shown in MaintenanceCard sub-rows under the part name.
-- Nullable so existing rows continue to work.
--

alter table public.maintenance_items
  add column if not exists notes text;
