--
-- 0003_visit_scheduled.sql
--
-- "เช็คระยะ" — boolean flag marking a visit as a scheduled
-- interval-based service check (10,000 km service, etc.).
--
-- Nullable-free with a default of false so historical rows behave as
-- "not a scheduled check" without backfill.
--
alter table public.maintenance_visits
  add column if not exists is_scheduled boolean not null default false;
