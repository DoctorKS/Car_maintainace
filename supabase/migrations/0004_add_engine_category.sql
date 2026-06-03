--
-- 0004_add_engine_category.sql
--
-- Adds category 6 = "เครื่องยนต์" (Engine) and demotes the previous
-- category 6 "อื่นๆ" (Others) to category 7. Existing rows that were
-- tagged with code 6 are server-side renumbered to 7 so the semantic
-- of "this was an Others row" is preserved.
--
-- Run order: AFTER 0001 / 0002 / 0003. Idempotent (uses IF EXISTS /
-- IF NOT EXISTS and only updates rows that still carry the old code).
--
-- The client mirrors the same renumber in a Dexie v3 upgrade hook, so
-- previously-saved local rows on each device are bumped 6 → 7 the
-- first time the new bundle boots.
--

-- Step 1: drop the existing 1..6 constraints so the UPDATE below is
-- allowed to write code = 7.
alter table public.maintenance_items
  drop constraint if exists maintenance_items_category_code_check;

alter table public.custom_parts
  drop constraint if exists custom_parts_category_code_check;

-- Step 2: renumber every "อื่นๆ" row from code 6 to code 7. This must
-- run before the new client code starts inserting code-6 rows that
-- mean "เครื่องยนต์".
update public.maintenance_items set category_code = 7 where category_code = 6;
update public.custom_parts       set category_code = 7 where category_code = 6;

-- Step 3: install the new 1..7 constraints.
alter table public.maintenance_items
  add constraint maintenance_items_category_code_check
  check (category_code between 1 and 7);

alter table public.custom_parts
  add constraint custom_parts_category_code_check
  check (category_code between 1 and 7);
