--
-- 0005_add_tesla_seed.sql
--
-- Adds a second seed vehicle (Tesla Model X, plate "7ขร 6215") so the
-- dashboard can toggle between two vehicles per user.
--
-- Two steps, both idempotent:
--   1. Backfill every existing auth.users row with the second vehicle if
--      they don't already have one with that plate.
--   2. Update the handle_new_user() trigger so future sign-ups get both
--      vehicles automatically (still seeds the same two service centres).
--

-- 1. Backfill existing users
insert into public.vehicles (user_id, plate, model, year, mileage)
select u.id, '7ขร 6215', 'Tesla Model X', 2023, 0
from auth.users u
where not exists (
  select 1 from public.vehicles v
  where v.user_id = u.id
    and v.plate = '7ขร 6215'
);

-- 2. Update the seed trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.vehicles (user_id, plate, model, year, mileage) values
    (new.id, 'ขข4699',   'Mazda CX-5',    2016, 0),
    (new.id, '7ขร 6215', 'Tesla Model X', 2023, 0);

  insert into public.service_centers (user_id, name, is_default) values
    (new.id, 'Mazda จันทบุรี', true),
    (new.id, 'Mazda ระยอง',  true);

  return new;
end$$;
