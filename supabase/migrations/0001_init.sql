--
-- CX-5 Maintenance — initial schema.
-- Tables, RLS, new-user seed trigger, storage bucket + policies.
--

create extension if not exists "uuid-ossp";

-- =========================================================================
-- Tables
-- =========================================================================

create table public.vehicles (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  plate       text not null,
  model       text not null,
  year        int  not null,
  mileage     int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index vehicles_user_idx on public.vehicles(user_id);

create table public.service_centers (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);
create index service_centers_user_idx on public.service_centers(user_id);

create table public.maintenance_visits (
  id                  uuid primary key default uuid_generate_v4(),
  local_uuid          uuid not null,
  user_id             uuid not null references auth.users(id) on delete cascade,
  vehicle_id          uuid not null references public.vehicles(id) on delete cascade,
  service_date        date not null,
  mileage             int  not null,
  service_center_id   uuid references public.service_centers(id) on delete set null,
  receipt_image_path  text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, local_uuid)
);
create index visits_user_date_idx on public.maintenance_visits(user_id, service_date desc);
create index visits_vehicle_idx   on public.maintenance_visits(vehicle_id);

create table public.maintenance_items (
  id             uuid primary key default uuid_generate_v4(),
  local_uuid     uuid not null,
  visit_id       uuid not null references public.maintenance_visits(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  category_code  smallint not null check (category_code between 1 and 6),
  part_name      text not null,
  quantity       numeric(10,2) not null default 1,
  total_price    numeric(12,2) not null default 0,
  created_at     timestamptz not null default now(),
  unique (user_id, local_uuid)
);
create index items_visit_idx           on public.maintenance_items(visit_id);
create index items_user_category_idx   on public.maintenance_items(user_id, category_code, part_name);

create table public.custom_parts (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  category_code  smallint not null check (category_code between 1 and 6),
  part_name      text not null,
  created_at     timestamptz not null default now(),
  unique (user_id, category_code, part_name)
);

-- =========================================================================
-- updated_at trigger
-- =========================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

create trigger visits_set_updated_at
  before update on public.maintenance_visits
  for each row execute function public.set_updated_at();

-- =========================================================================
-- RLS
-- =========================================================================

alter table public.vehicles            enable row level security;
alter table public.service_centers     enable row level security;
alter table public.maintenance_visits  enable row level security;
alter table public.maintenance_items   enable row level security;
alter table public.custom_parts        enable row level security;

-- vehicles
create policy "vehicles_select_own" on public.vehicles
  for select using (user_id = auth.uid());
create policy "vehicles_insert_own" on public.vehicles
  for insert with check (user_id = auth.uid());
create policy "vehicles_update_own" on public.vehicles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "vehicles_delete_own" on public.vehicles
  for delete using (user_id = auth.uid());

-- service_centers
create policy "sc_select_own" on public.service_centers
  for select using (user_id = auth.uid());
create policy "sc_insert_own" on public.service_centers
  for insert with check (user_id = auth.uid());
create policy "sc_update_own" on public.service_centers
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sc_delete_own" on public.service_centers
  for delete using (user_id = auth.uid());

-- maintenance_visits
create policy "visits_select_own" on public.maintenance_visits
  for select using (user_id = auth.uid());
create policy "visits_insert_own" on public.maintenance_visits
  for insert with check (user_id = auth.uid());
create policy "visits_update_own" on public.maintenance_visits
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "visits_delete_own" on public.maintenance_visits
  for delete using (user_id = auth.uid());

-- maintenance_items
create policy "items_select_own" on public.maintenance_items
  for select using (user_id = auth.uid());
create policy "items_insert_own" on public.maintenance_items
  for insert with check (user_id = auth.uid());
create policy "items_update_own" on public.maintenance_items
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "items_delete_own" on public.maintenance_items
  for delete using (user_id = auth.uid());

-- custom_parts
create policy "cp_select_own" on public.custom_parts
  for select using (user_id = auth.uid());
create policy "cp_insert_own" on public.custom_parts
  for insert with check (user_id = auth.uid());
create policy "cp_update_own" on public.custom_parts
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cp_delete_own" on public.custom_parts
  for delete using (user_id = auth.uid());

-- =========================================================================
-- New-user seed: vehicle + 2 service centers
-- =========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.vehicles (user_id, plate, model, year, mileage)
  values (new.id, 'ขข4699', 'Mazda CX-5', 2016, 0);

  insert into public.service_centers (user_id, name, is_default) values
    (new.id, 'Mazda จันทบุรี', true),
    (new.id, 'Mazda ระยอง',  true);

  return new;
end$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- Storage bucket: receipts (private, per-user folder)
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "receipts_select_own" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "receipts_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "receipts_update_own" on storage.objects
  for update using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "receipts_delete_own" on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
