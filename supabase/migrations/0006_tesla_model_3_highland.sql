--
-- 0006_tesla_model_3_highland.sql
--
-- Renames the second seed vehicle: "Tesla Model X" (year 2023) →
-- "Tesla Model 3 Highland" (year 2024). The Dashboard's display strips
-- the leading "Tesla " prefix, so `vehicle.model = 'Tesla Model 3 Highland'`
-- renders as "Model 3 Highland" in the Tesla card.
--
-- Two idempotent steps:
--   1. UPDATE every existing row identified by plate "7ขร 6215".
--   2. Replace handle_new_user() so future sign-ups get the new model
--      name directly.
--

-- 1. Update existing rows
update public.vehicles
set    model = 'Tesla Model 3 Highland',
       year  = 2024,
       updated_at = now()
where  plate = '7ขร 6215';

-- 2. Refresh the trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.vehicles (user_id, plate, model, year, mileage) values
    (new.id, 'ขข4699',   'Mazda CX-5',              2016, 0),
    (new.id, '7ขร 6215', 'Tesla Model 3 Highland',  2024, 0);

  insert into public.service_centers (user_id, name, is_default) values
    (new.id, 'Mazda จันทบุรี', true),
    (new.id, 'Mazda ระยอง',  true);

  return new;
end$$;
