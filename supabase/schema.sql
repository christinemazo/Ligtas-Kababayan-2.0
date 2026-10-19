-- =====================================================================
-- 1. EXTENSIONS AND SEQUENCES
-- =====================================================================
create extension if not exists postgis;
create sequence if not exists report_seq;

-- =====================================================================
-- 2. TABLES
-- =====================================================================
create table if not exists barangays (
  id   serial primary key,
  name text unique not null,
  geom geometry(MultiPolygon, 4326)
);
alter table barangays add column if not exists municipality text default 'Calbayog City';

-- One row per admin ACCOUNT. Many accounts can share the same barangay_id.
create table if not exists admins (
  user_id     uuid primary key references auth.users on delete cascade,
  barangay_id int references barangays
);
alter table admins add column if not exists role       text not null default 'barangay_admin';
alter table admins add column if not exists full_name  text default '';
alter table admins add column if not exists created_at timestamptz default now();

do $$ begin
  alter table admins add constraint admins_role_chk
    check (role in ('super_admin', 'barangay_admin'));
exception when duplicate_object then null; end $$;

-- a barangay admin MUST have a barangay; a super admin does not need one
do $$ begin
  alter table admins add constraint admins_barangay_chk
    check (role = 'super_admin' or barangay_id is not null);
exception when duplicate_object then null; end $$;

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
  client_id   uuid unique not null,   -- random id made on the phone; acts as the citizen's secret
  level       int not null check (level between 1 and 5),
  lat         float8 not null check (lat between -90 and 90),
  lng         float8 not null check (lng between -180 and 180),
  barangay_id int references barangays,
  name        text default '',
  phone       text default '',
  head        text default '',
  vul         text[] default '{}',
  descr       text default '',
  address     text default '',   -- street address looked up by the admin dashboard
  source      text default 'app',
  status      text default 'new' check (status in ('new', 'ack', 'done')),
  created_at  timestamptz default now()
);

-- for databases created before these columns existed
alter table reports add column if not exists address   text default '';
alter table reports add column if not exists status_by uuid references auth.users on delete set null;  -- which admin last changed the status
alter table reports add column if not exists status_at timestamptz;

-- =====================================================================
-- 3. INDEXES
-- =====================================================================
create index if not exists barangays_geom_idx   on barangays using gist (geom);  -- fast "which barangay is this point in"
create index if not exists reports_queue_idx    on reports (barangay_id, status);
create index if not exists admins_barangay_idx  on admins (barangay_id);

-- =====================================================================
-- 4. SECURITY (Row Level Security: nobody reads anything unless a policy allows it)
-- =====================================================================
alter table barangays enable row level security;
alter table admins    enable row level security;
alter table shelters  enable row level security;
alter table reports   enable row level security;

-- The barangay the logged-in admin belongs to (null for citizens and super admins)
create or replace function my_barangay()
returns int language sql stable security definer set search_path = public as
$$ select barangay_id from admins where user_id = (select auth.uid()) $$;

-- True if the logged-in user is a super admin (e.g. city DRRMO)
create or replace function is_super()
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from admins
                   where user_id = (select auth.uid()) and role = 'super_admin') $$;

-- Public read
drop policy if exists barangays_public on barangays;
create policy barangays_public on barangays for select using (true);

drop policy if exists shelters_public on shelters;
create policy shelters_public on shelters for select using (true);

-- Admins see themselves and the other admins of their own barangay (super admin sees all)
drop policy if exists admins_self on admins;
drop policy if exists admins_team on admins;
create policy admins_team on admins for select to authenticated
  using (user_id = (select auth.uid())
         or barangay_id = my_barangay()
         or is_super());

-- Admins read and update only their own barangay's reports and shelters
drop policy if exists admin_read_reports on reports;
create policy admin_read_reports on reports for select to authenticated
  using (barangay_id = my_barangay() or is_super());

drop policy if exists admin_update_reports on reports;
create policy admin_update_reports on reports for update to authenticated
  using (barangay_id = my_barangay() or is_super());

drop policy if exists admin_update_shelters on shelters;
create policy admin_update_shelters on shelters for update to authenticated
  using (barangay_id = my_barangay() or is_super());

-- Only a super admin can ADD evacuation centers. Barangay admins can only update occupancy
-- (the update policy above) and nobody can delete (no delete policy exists).
drop policy if exists super_insert_shelters on shelters;
create policy super_insert_shelters on shelters for insert to authenticated
  with check (is_super());
grant usage, select on sequence shelters_id_seq to authenticated;

-- Citizens (anon) have NO direct access to reports. They use the functions in section 6.

-- Admins can only change what the dashboard needs: report status, shelter occupancy
revoke update on reports  from authenticated;
revoke update on shelters from authenticated;
grant  update (status, address)       on reports  to authenticated;
grant  update (occupied, updated_at)  on shelters to authenticated;

-- Automatically record WHICH admin acknowledged / rescued a report and WHEN.
-- Done in the database so the browser cannot fake it.
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
-- 5. REALTIME (live updates for the admin page)
-- =====================================================================
do $$ begin
  alter publication supabase_realtime add table reports;
exception when duplicate_object then null;   -- already added
end $$;

-- =====================================================================
-- 6. CITIZEN FUNCTIONS (safe to retry: the same client_id never makes a duplicate)
-- =====================================================================
create or replace function submit_report(
  p_client_id uuid, p_level int, p_lat float8, p_lng float8,
  p_name text default '', p_phone text default '', p_head text default '',
  p_vul text[] default '{}', p_desc text default '')
returns table(report_code text, report_status text)
language plpgsql security definer set search_path = public, extensions as $$
declare b int;
begin
  select id into b from barangays
   where st_contains(geom, st_setsrid(st_point(p_lng, p_lat), 4326)) limit 1;

  -- also acts as a prank / out-of-area filter
  if b is null then raise exception 'outside_area'; end if;

  insert into reports(client_id, level, lat, lng, barangay_id, name, phone, head, vul, descr)
  values (p_client_id, p_level, p_lat, p_lng, b, p_name, p_phone, p_head, p_vul, p_desc)
  on conflict (client_id) do nothing;

  return query select r.code, r.status from reports r where r.client_id = p_client_id;
end $$;

create or replace function update_report_details(
  p_client_id uuid, p_name text, p_phone text, p_head text, p_vul text[], p_desc text)
returns void language sql security definer set search_path = public as $$
  update reports
     set name = p_name, phone = p_phone, head = p_head, vul = p_vul, descr = p_desc
   where client_id = p_client_id;
$$;

create or replace function get_report_status(p_client_id uuid)
returns text language sql security definer set search_path = public as
$$ select status from reports where client_id = p_client_id $$;

grant execute on function submit_report, update_report_details, get_report_status to anon, authenticated;

-- =====================================================================
-- 7. SAMPLE DATA (so you can test before you have real boundaries)
-- TODO: replace with real Calbayog barangay polygons (import GeoJSON) and real shelters.
-- =====================================================================
insert into barangays(name, geom) values
  ('Sample Brgy 1', st_multi(st_makeenvelope(124.59, 12.05, 124.62, 12.08, 4326))),
  ('Sample Brgy 2', st_multi(st_makeenvelope(124.55, 12.02, 124.59, 12.05, 4326)))
on conflict (name) do nothing;

insert into shelters(name, barangay_id, capacity, occupied)
select v.name, b.id, v.capacity, v.occupied
  from (values
    ('Sample Evacuation Center A', 'Sample Brgy 1', 100, 42),
    ('Sample Evacuation Center B', 'Sample Brgy 2',  80, 74)
  ) as v(name, brgy, capacity, occupied)
  join barangays b on b.name = v.brgy
 where not exists (select 1 from shelters);

-- =====================================================================
-- 8. ASSIGN ADMIN ACCOUNTS TO BARANGAYS
-- Steps: (1) Authentication > Users > Add user (email + password, tick "Auto confirm")
--        (2) run add_admin() below with that email
-- Run it again with a different email and the same barangay to add more admins to it.
-- Run it again with the same email and a different barangay to move that account.
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

-- only you (SQL editor / service role) may run it, never the public app
revoke all on function add_admin(text, text, text, text) from public, anon, authenticated;

-- Examples (remove the leading -- to run):
-- select add_admin('juan@email.com',  'Sample Brgy 1', 'barangay_admin', 'Juan Dela Cruz');
-- select add_admin('maria@email.com', 'Sample Brgy 1', 'barangay_admin', 'Maria Santos');  -- 2nd admin, same barangay
-- select add_admin('pedro@email.com', 'Sample Brgy 2', 'barangay_admin', 'Pedro Reyes');   -- different barangay
-- select add_admin('drrmo@email.com', null, 'super_admin', 'City DRRMO');                  -- sees every barangay

-- =====================================================================
-- 9. ONLY THE SUPER ADMIN CAN ADD EVACUATION CENTERS
-- Barangay admins can still update occupancy of their own centers (section 4),
-- but cannot add or delete centers.
-- =====================================================================
revoke insert, delete on shelters from authenticated;
grant  insert (name, barangay_id, capacity) on shelters to authenticated;

drop policy if exists super_insert_shelters on shelters;
create policy super_insert_shelters on shelters for insert to authenticated
  with check (is_super());