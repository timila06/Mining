alter table public.drones
  add column if not exists model text not null default 'MOLE rugged underground scout',
  add column if not exists battery_health integer not null default 94 check (battery_health between 0 and 100),
  add column if not exists total_flight_hours numeric not null default 128.4,
  add column if not exists last_mission_at timestamptz,
  add column if not exists last_maintenance_at timestamptz,
  add column if not exists next_maintenance_due_at timestamptz,
  add column if not exists maintenance_required boolean not null default false,
  add column if not exists preflight_passed_at timestamptz,
  add column if not exists last_diagnostic_result text not null default 'passed';

alter table public.drone_sensors
  add column if not exists sensor_type text not null default 'environmental',
  add column if not exists last_calibration_at timestamptz,
  add column if not exists next_calibration_due_at timestamptz,
  add column if not exists last_diagnostic_result text not null default 'passed',
  add column if not exists required_for_mission boolean not null default true;

alter table public.drones
  drop constraint if exists drones_last_diagnostic_result_check,
  add constraint drones_last_diagnostic_result_check check (last_diagnostic_result in ('passed', 'failed', 'warning', 'not_run'));

alter table public.drone_sensors
  drop constraint if exists drone_sensors_status_check,
  add constraint drone_sensors_status_check check (status in ('online', 'offline', 'warning', 'failed', 'calibration_due')),
  drop constraint if exists drone_sensors_last_diagnostic_result_check,
  add constraint drone_sensors_last_diagnostic_result_check check (last_diagnostic_result in ('passed', 'failed', 'warning', 'not_run'));

create table if not exists public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  drone_id uuid not null references public.drones(id) on delete cascade,
  performed_by uuid references public.profiles(id) on delete set null,
  maintenance_type text not null,
  notes text,
  status text not null default 'completed',
  performed_at timestamptz not null default now(),
  next_due_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.diagnostic_runs (
  id uuid primary key default gen_random_uuid(),
  drone_id uuid not null references public.drones(id) on delete cascade,
  sensor_id uuid references public.drone_sensors(id) on delete set null,
  run_by uuid references public.profiles(id) on delete set null,
  diagnostic_type text not null,
  result text not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.maintenance_records
  drop constraint if exists maintenance_records_status_check,
  add constraint maintenance_records_status_check check (status in ('required', 'scheduled', 'completed'));

alter table public.diagnostic_runs
  drop constraint if exists diagnostic_runs_result_check,
  add constraint diagnostic_runs_result_check check (result in ('passed', 'failed', 'warning'));

create index if not exists maintenance_records_drone_id_idx on public.maintenance_records(drone_id, performed_at desc);
create index if not exists diagnostic_runs_drone_id_idx on public.diagnostic_runs(drone_id, created_at desc);
create index if not exists diagnostic_runs_sensor_id_idx on public.diagnostic_runs(sensor_id, created_at desc);

alter table public.maintenance_records enable row level security;
alter table public.diagnostic_runs enable row level security;

update public.drones
set
  model = coalesce(model, 'MOLE rugged underground scout'),
  battery_health = coalesce(battery_health, 94),
  total_flight_hours = coalesce(total_flight_hours, 128.4),
  last_maintenance_at = coalesce(last_maintenance_at, now() - interval '21 days'),
  next_maintenance_due_at = coalesce(next_maintenance_due_at, now() + interval '39 days'),
  preflight_passed_at = coalesce(preflight_passed_at, now() - interval '2 hours'),
  last_diagnostic_result = coalesce(last_diagnostic_result, 'passed')
where drone_code = 'MOLE-01';

update public.drone_sensors
set
  sensor_type = case
    when sensor_key in ('methane', 'oxygen') then 'gas'
    when sensor_key in ('temperature', 'humidity') then 'environmental'
    when sensor_key = 'lidar_clearance' then 'navigation'
    else 'communication'
  end,
  last_calibration_at = coalesce(last_calibration_at, now() - interval '18 days'),
  next_calibration_due_at = coalesce(next_calibration_due_at, now() + interval '72 days'),
  last_diagnostic_result = coalesce(last_diagnostic_result, 'passed'),
  required_for_mission = true
where drone_id = (select id from public.drones where drone_code = 'MOLE-01');

insert into public.system_settings (setting_key, setting_value, description)
values
  ('threshold_minimum_battery_health', '{"display_name":"Minimum battery health","value":70,"unit":"%","severity_level":"high","sensor_key":"battery_health","comparison":"lt"}', 'Minimum battery health required before launching a mission.'),
  ('threshold_preflight_valid_hours', '{"display_name":"Pre-flight validity","value":12,"unit":"hours","severity_level":"medium","sensor_key":"preflight","comparison":"gt"}', 'Hours before a completed pre-flight check expires.')
on conflict (setting_key) do update set
  setting_value = excluded.setting_value,
  description = excluded.description;

drop policy if exists "Authenticated users can read maintenance records" on public.maintenance_records;
drop policy if exists "Authenticated users can read diagnostic runs" on public.diagnostic_runs;
drop policy if exists "Drone managers can create maintenance records" on public.maintenance_records;
drop policy if exists "Drone managers can create diagnostic runs" on public.diagnostic_runs;
drop policy if exists "Drone managers can update drones" on public.drones;
drop policy if exists "Drone managers can update sensors" on public.drone_sensors;
drop policy if exists "Administrators can create audit logs" on public.audit_logs;
drop policy if exists "Operational users can create audit logs" on public.audit_logs;

create policy "Authenticated users can read maintenance records" on public.maintenance_records
  for select to authenticated
  using (true);

create policy "Authenticated users can read diagnostic runs" on public.diagnostic_runs
  for select to authenticated
  using (true);

create policy "Drone managers can create maintenance records" on public.maintenance_records
  for insert to authenticated
  with check (
    performed_by = auth.uid()
    and public.has_role(array['administrator', 'drone_operator']::public.user_role[])
  );

create policy "Drone managers can create diagnostic runs" on public.diagnostic_runs
  for insert to authenticated
  with check (
    run_by = auth.uid()
    and public.has_role(array['administrator', 'drone_operator']::public.user_role[])
  );

create policy "Drone managers can update drones" on public.drones
  for update to authenticated
  using (public.has_role(array['administrator', 'drone_operator']::public.user_role[]))
  with check (public.has_role(array['administrator', 'drone_operator']::public.user_role[]));

create policy "Drone managers can update sensors" on public.drone_sensors
  for update to authenticated
  using (public.has_role(array['administrator', 'drone_operator']::public.user_role[]))
  with check (public.has_role(array['administrator', 'drone_operator']::public.user_role[]));

create policy "Operational users can create audit logs" on public.audit_logs
  for insert to authenticated
  with check (
    administrator = auth.uid()
    and public.has_role(array['administrator', 'drone_operator']::public.user_role[])
  );
