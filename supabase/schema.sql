-- =====================================================================
-- LIGTAS KABABAYAN: DATABASE SCHEMA  (PostgreSQL + PostGIS Supabase)
-- =====================================================================

-- =====================================================================
-- 1. EXTENSIONS
-- =====================================================================
create extension if not exists postgis;

-- =====================================================================
-- 2. TABLES
-- =====================================================================
create sequence if not exists report_seq;

create table if not exists barangays (
  id           serial primary key,
  name         text unique not null,
  municipality text,
  psgc         bigint,                             
  geom         geometry(MultiPolygon, 4326)
);


create table if not exists admins (
  user_id     uuid primary key references auth.users on delete cascade,
  barangay_id int references barangays,
  role        text not null default 'barangay_admin',
  full_name   text default '',
  created_at  timestamptz default now(),
  constraint admins_role_chk     check (role in ('super_admin', 'barangay_admin')),
  constraint admins_barangay_chk check (role = 'super_admin' or barangay_id is not null)
);

create table if not exists shelters (
  id          serial primary key,
  name        text not null,
  barangay_id int references barangays,
  capacity    int not null check (capacity > 0),
  occupied    int not null default 0 check (occupied >= 0),
  updated_at  timestamptz default now()
);

create table if not exists reports (
  id          bigint generated always as identity primary key,
  code        text unique default 'LK-' || to_char(now(), 'YYMM') || '-' || lpad(nextval('report_seq')::text, 4, '0'),
  client_id   uuid unique not null,
  user_id     uuid references auth.users on delete set null, 
  level       int not null check (level between 1 and 5),
  lat         float8 not null check (lat between -90 and 90),
  lng         float8 not null check (lng between -180 and 180),
  barangay_id int references barangays,
  name        text default '',
  phone       text default '',
  head        text default '',
  vul         text[] default '{}',
  descr       text default '',
  address     text default '',    
  source      text default 'app',
  status      text not null default 'new' check (status in ('new', 'ack', 'done')),
  status_by   uuid references auth.users on delete set null,
  status_at   timestamptz,
  created_at  timestamptz default now()
);

alter table barangays add column if not exists municipality text;
alter table barangays add column if not exists psgc         bigint;
alter table barangays alter column municipality drop default;
alter table admins    add column if not exists role         text not null default 'barangay_admin';
alter table admins    add column if not exists full_name    text default '';
alter table admins    add column if not exists created_at   timestamptz default now();
alter table reports   add column if not exists user_id      uuid references auth.users on delete set null;
alter table reports   add column if not exists address      text default '';
alter table reports   add column if not exists status_by    uuid references auth.users on delete set null;
alter table reports   add column if not exists status_at    timestamptz;

do $$ begin
  alter table admins add constraint admins_role_chk check (role in ('super_admin', 'barangay_admin'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table admins add constraint admins_barangay_chk check (role = 'super_admin' or barangay_id is not null);
exception when duplicate_object then null; end $$;

-- =====================================================================
-- 3. INDEXES
-- =====================================================================
create index        if not exists barangays_geom_idx on barangays using gist (geom); 
create unique index if not exists barangays_psgc_key on barangays (psgc);
create index        if not exists admins_barangay_idx on admins (barangay_id);
create index        if not exists reports_queue_idx  on reports (barangay_id, status); 
create index        if not exists reports_user_idx   on reports (user_id, created_at); 

-- =====================================================================
-- 4. SECURITY 
-- =====================================================================
alter table barangays enable row level security;
alter table admins    enable row level security;
alter table shelters  enable row level security;
alter table reports   enable row level security;

create or replace function my_barangay()
returns int language sql stable security definer set search_path = public as
$$ select barangay_id from admins where user_id = (select auth.uid()) $$;

create or replace function is_super()
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from admins
                   where user_id = (select auth.uid()) and role = 'super_admin') $$;

drop policy if exists barangays_public on barangays;
create policy barangays_public on barangays for select using (true);

drop policy if exists shelters_public on shelters;
create policy shelters_public on shelters for select using (true);

drop policy if exists admins_team on admins;
create policy admins_team on admins for select to authenticated
  using (user_id = (select auth.uid()) or barangay_id = my_barangay() or is_super());

drop policy if exists admin_read_reports on reports;
create policy admin_read_reports on reports for select to authenticated
  using (barangay_id = my_barangay() or is_super());

drop policy if exists admin_update_reports on reports;
create policy admin_update_reports on reports for update to authenticated
  using (barangay_id = my_barangay() or is_super());

drop policy if exists admin_update_shelters on shelters;
create policy admin_update_shelters on shelters for update to authenticated
  using (barangay_id = my_barangay() or is_super());

drop policy if exists super_insert_shelters on shelters;
create policy super_insert_shelters on shelters for insert to authenticated
  with check (is_super());

revoke update on reports  from authenticated;
revoke update on shelters from authenticated;
grant  update (status, address)      on reports  to authenticated;
grant  update (occupied, updated_at) on shelters to authenticated;
revoke insert, delete on shelters from authenticated;
grant  insert (name, barangay_id, capacity) on shelters to authenticated;
grant  usage, select on sequence shelters_id_seq to authenticated;

create or replace function stamp_report_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    new.status_by := (select auth.uid());
    new.status_at := now();
  end if;
  return new;
end $$;

drop trigger if exists reports_stamp_status on reports;
create trigger reports_stamp_status before update on reports
  for each row execute function stamp_report_status();

-- =====================================================================
-- 5. REALTIME  (live updates for the admin dashboard)
-- =====================================================================
do $$ begin
  alter publication supabase_realtime add table reports;
exception when duplicate_object then null;
end $$;

-- =====================================================================
-- 6. CITIZEN FUNCTIONS  (signed-in users only)
-- =====================================================================
drop function if exists submit_report(uuid, int, float8, float8, text, text, text, text[], text, uuid);  -- old version
drop function if exists submit_report(uuid, int, float8, float8, text, text, text, text[], text);

create or replace function submit_report(
  p_client_id uuid, p_level int, p_lat float8, p_lng float8,
  p_name text default '', p_phone text default '', p_head text default '',
  p_vul text[] default '{}', p_desc text default '')
returns table(report_code text, report_status text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  uid uuid := auth.uid();
  b   int;
begin
  if uid is null then raise exception 'login_required'; end if;

  -- which barangay is the pin in? Also keeps out-of-area and prank requests out.
  select id into b from barangays
   where st_contains(geom, st_setsrid(st_point(p_lng, p_lat), 4326)) limit 1;
  if b is null then raise exception 'outside_area'; end if;

  -- the limiter
  if exists (
       select 1 from reports
        where user_id = uid
          and client_id <> p_client_id
          and status <> 'done'
          and created_at > now() - interval '3 hours')   -- time limit: change here
  then
    raise exception 'request_ongoing';
  end if;

  insert into reports(client_id, user_id, level, lat, lng, barangay_id, name, phone, head, vul, descr)
  values (p_client_id, uid, p_level, p_lat, p_lng, b,
          left(p_name, 100), left(p_phone, 30), left(p_head, 20),
          coalesce(p_vul[1:10], '{}'), left(p_desc, 500))
  on conflict (client_id) do nothing;

  return query select r.code, r.status from reports r where r.client_id = p_client_id and r.user_id = uid;
end $$;

create or replace function update_report_details(
  p_client_id uuid, p_name text, p_phone text, p_head text, p_vul text[], p_desc text)
returns void language sql security definer set search_path = public as $$
  update reports
     set name = left(p_name, 100), phone = left(p_phone, 30), head = left(p_head, 20),
         vul = coalesce(p_vul[1:10], '{}'), descr = left(p_desc, 500)
   where client_id = p_client_id and user_id = (select auth.uid());
$$;

create or replace function get_report_status(p_client_id uuid)
returns text language sql security definer set search_path = public as
$$ select status from reports where client_id = p_client_id and user_id = (select auth.uid()) $$;

-- Signed-in users only (nothing here is open to anonymous callers)
revoke all on function submit_report(uuid, int, float8, float8, text, text, text, text[], text) from public, anon;
revoke all on function update_report_details(uuid, text, text, text, text[], text)               from public, anon;
revoke all on function get_report_status(uuid)                                                   from public, anon;
grant execute on function submit_report(uuid, int, float8, float8, text, text, text, text[], text) to authenticated;
grant execute on function update_report_details(uuid, text, text, text, text[], text)               to authenticated;
grant execute on function get_report_status(uuid)                                                   to authenticated;

-- =====================================================================
-- 7. ADMIN FUNCTIONS 
-- =====================================================================
create or replace function add_admin(
  p_email    text,
  p_barangay text default null,
  p_role     text default 'barangay_admin',
  p_name     text default '')
returns text language plpgsql security definer set search_path = public, auth as $$
declare u uuid; b int;
begin
  select id into u from auth.users where lower(email) = lower(p_email);
  if u is null then
    raise exception 'No user with email %. Create it in Authentication > Users first.', p_email;
  end if;

  if p_role = 'barangay_admin' then
    select id into b from barangays where name = p_barangay;
    if b is null then raise exception 'Barangay "%" not found', p_barangay; end if;
  end if;

  insert into admins(user_id, barangay_id, role, full_name)
  values (u, b, p_role, p_name)
  on conflict (user_id) do update
    set barangay_id = excluded.barangay_id,
        role        = excluded.role,
        full_name   = excluded.full_name;

  return p_email || ' is now ' || p_role || coalesce(' of ' || p_barangay, '');
end $$;

revoke all on function add_admin(text, text, text, text) from public, anon, authenticated;

create or replace function import_barangays(
  p_geojson jsonb, p_municipality text,
  p_name_key text default 'name', p_code_key text default null)
returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare n integer;
begin
  if p_geojson->>'type' is distinct from 'FeatureCollection' then
    raise exception 'Expected a GeoJSON FeatureCollection';
  end if;
  if coalesce(trim(p_municipality), '') = '' then
    raise exception 'Give the municipality name';
  end if;

  insert into barangays(name, municipality, psgc, geom)
  select trim(f->'properties'->>p_name_key),
         trim(p_municipality),
         case when p_code_key is null then null else (f->'properties'->>p_code_key)::bigint end,
         st_multi(st_collectionextract(
           st_makevalid(st_setsrid(st_geomfromgeojson((f->'geometry')::text), 4326)), 3))
    from jsonb_array_elements(p_geojson->'features') as f
   where coalesce(trim(f->'properties'->>p_name_key), '') <> ''
     and f->>'geometry' is not null
  on conflict (name) do update
    set geom         = excluded.geom,
        municipality = excluded.municipality,
        psgc         = coalesce(excluded.psgc, barangays.psgc);

  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function import_barangays(jsonb, text, text, text) from public, anon, authenticated;
grant execute on function import_barangays(jsonb, text, text, text) to service_role;

