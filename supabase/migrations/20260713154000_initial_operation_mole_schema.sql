create extension if not exists "pgcrypto";

create type public.user_role as enum (
  'administrator',
  'mine_operator',
  'safety_officer',
  'drone_operator',
  'viewer',
  'regulator'
);

create type public.risk_level as enum (
  'low',
  'medium',
  'high',
  'critical',
  'resolved'
);

create type public.mission_status as enum (
  'planned',
  'active',
  'paused',
  'completed',
  'cancelled'
);

create type public.zone_status as enum (
  'unknown',
  'clear',
  'caution',
  'unsafe',
  'blocked'
);

create type public.drone_status as enum (
  'available',
  'active',
  'charging',
  'maintenance',
  'offline'
);

create type public.alert_status as enum (
  'open',
  'acknowledged',
  'resolved'
);

create type public.approval_status as enum (
  'pending',
  'approved',
  'denied',
  'expired'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'viewer',
  organization text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mine_sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text not null,
  country text not null default 'Thailand',
  operator_name text,
  status public.zone_status not null default 'unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mine_zones (
  id uuid primary key default gen_random_uuid(),
  mine_site_id uuid not null references public.mine_sites(id) on delete cascade,
  code text not null,
  name text not null,
  level text,
  status public.zone_status not null default 'unknown',
  last_inspected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mine_site_id, code)
);

create table public.drones (
  id uuid primary key default gen_random_uuid(),
  mine_site_id uuid references public.mine_sites(id) on delete set null,
  drone_code text not null unique,
  name text not null,
  status public.drone_status not null default 'available',
  battery_percent integer not null default 100 check (battery_percent between 0 and 100),
  signal_percent integer not null default 100 check (signal_percent between 0 and 100),
  firmware_version text,
  maintenance_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.drone_sensors (
  id uuid primary key default gen_random_uuid(),
  drone_id uuid not null references public.drones(id) on delete cascade,
  sensor_key text not null,
  label text not null,
  unit text not null,
  safe_min numeric,
  safe_max numeric,
  status text not null default 'online',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (drone_id, sensor_key)
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  mine_site_id uuid not null references public.mine_sites(id) on delete cascade,
  drone_id uuid references public.drones(id) on delete set null,
  mission_code text not null unique,
  title text not null,
  status public.mission_status not null default 'planned',
  risk_level public.risk_level not null default 'low',
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mission_zones (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  mine_zone_id uuid not null references public.mine_zones(id) on delete cascade,
  visit_order integer not null default 1,
  status public.zone_status not null default 'unknown',
  entered_at timestamptz,
  exited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mission_id, mine_zone_id)
);

create table public.sensor_readings (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  drone_sensor_id uuid not null references public.drone_sensors(id) on delete cascade,
  mine_zone_id uuid references public.mine_zones(id) on delete set null,
  reading_value numeric not null,
  unit text not null,
  risk_level public.risk_level not null default 'low',
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid references public.missions(id) on delete cascade,
  mine_zone_id uuid references public.mine_zones(id) on delete set null,
  sensor_reading_id uuid references public.sensor_readings(id) on delete set null,
  title text not null,
  description text not null,
  risk_level public.risk_level not null,
  status public.alert_status not null default 'open',
  acknowledged_by uuid references public.profiles(id) on delete set null,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mission_events (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  event_type text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  title text not null,
  summary text not null,
  recommendations text,
  report_url text,
  generated_by uuid references public.profiles(id) on delete set null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.safety_approvals (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  mine_zone_id uuid references public.mine_zones(id) on delete set null,
  status public.approval_status not null default 'pending',
  decision_notes text,
  approved_by uuid references public.profiles(id) on delete set null,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  requester_name text not null,
  email text not null,
  organization text,
  role_title text,
  message text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.system_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null,
  description text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index mine_zones_mine_site_id_idx on public.mine_zones(mine_site_id);
create index drones_mine_site_id_idx on public.drones(mine_site_id);
create index drone_sensors_drone_id_idx on public.drone_sensors(drone_id);
create index missions_mine_site_id_idx on public.missions(mine_site_id);
create index missions_drone_id_idx on public.missions(drone_id);
create index mission_zones_mission_id_idx on public.mission_zones(mission_id);
create index sensor_readings_mission_recorded_idx on public.sensor_readings(mission_id, recorded_at desc);
create index alerts_status_risk_idx on public.alerts(status, risk_level);
create index reports_mission_id_idx on public.reports(mission_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger mine_sites_set_updated_at before update on public.mine_sites for each row execute function public.set_updated_at();
create trigger mine_zones_set_updated_at before update on public.mine_zones for each row execute function public.set_updated_at();
create trigger drones_set_updated_at before update on public.drones for each row execute function public.set_updated_at();
create trigger drone_sensors_set_updated_at before update on public.drone_sensors for each row execute function public.set_updated_at();
create trigger missions_set_updated_at before update on public.missions for each row execute function public.set_updated_at();
create trigger mission_zones_set_updated_at before update on public.mission_zones for each row execute function public.set_updated_at();
create trigger alerts_set_updated_at before update on public.alerts for each row execute function public.set_updated_at();
create trigger reports_set_updated_at before update on public.reports for each row execute function public.set_updated_at();
create trigger safety_approvals_set_updated_at before update on public.safety_approvals for each row execute function public.set_updated_at();
create trigger demo_requests_set_updated_at before update on public.demo_requests for each row execute function public.set_updated_at();
create trigger system_settings_set_updated_at before update on public.system_settings for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.mine_sites enable row level security;
alter table public.mine_zones enable row level security;
alter table public.drones enable row level security;
alter table public.drone_sensors enable row level security;
alter table public.missions enable row level security;
alter table public.mission_zones enable row level security;
alter table public.sensor_readings enable row level security;
alter table public.alerts enable row level security;
alter table public.mission_events enable row level security;
alter table public.reports enable row level security;
alter table public.safety_approvals enable row level security;
alter table public.demo_requests enable row level security;
alter table public.system_settings enable row level security;

create policy "Users can read their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Authenticated users can read mine sites" on public.mine_sites
  for select to authenticated using (true);

create policy "Authenticated users can read mine zones" on public.mine_zones
  for select to authenticated using (true);

create policy "Authenticated users can read drones" on public.drones
  for select to authenticated using (true);

create policy "Authenticated users can read drone sensors" on public.drone_sensors
  for select to authenticated using (true);

create policy "Authenticated users can read missions" on public.missions
  for select to authenticated using (true);

create policy "Authenticated users can read mission zones" on public.mission_zones
  for select to authenticated using (true);

create policy "Authenticated users can read sensor readings" on public.sensor_readings
  for select to authenticated using (true);

create policy "Authenticated users can read alerts" on public.alerts
  for select to authenticated using (true);

create policy "Authenticated users can read mission events" on public.mission_events
  for select to authenticated using (true);

create policy "Authenticated users can read reports" on public.reports
  for select to authenticated using (true);

create policy "Authenticated users can read safety approvals" on public.safety_approvals
  for select to authenticated using (true);

create policy "Anyone can create demo requests" on public.demo_requests
  for insert to anon, authenticated with check (true);

create policy "Authenticated users can read system settings" on public.system_settings
  for select to authenticated using (true);
