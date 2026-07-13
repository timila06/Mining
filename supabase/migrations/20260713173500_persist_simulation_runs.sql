alter table public.missions
  add column if not exists mission_type text not null default 'inspection',
  add column if not exists selected_scenario text not null default 'standard_sweep',
  add column if not exists paused_at timestamptz,
  add column if not exists aborted_at timestamptz;

alter table public.sensor_readings
  add column if not exists simulated boolean not null default false;

alter table public.reports
  add column if not exists zones_scanned integer not null default 0,
  add column if not exists highest_severity public.risk_level not null default 'low',
  add column if not exists hazards_detected integer not null default 0,
  add column if not exists final_entry_decision text;

create policy "Operators can create missions" on public.missions
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "Operators can update their missions" on public.missions
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "Operators can insert their mission zones" on public.mission_zones
  for insert to authenticated
  with check (
    exists (
      select 1 from public.missions
      where missions.id = mission_zones.mission_id
        and missions.created_by = auth.uid()
    )
  );

create policy "Operators can update their mission zones" on public.mission_zones
  for update to authenticated
  using (
    exists (
      select 1 from public.missions
      where missions.id = mission_zones.mission_id
        and missions.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.missions
      where missions.id = mission_zones.mission_id
        and missions.created_by = auth.uid()
    )
  );

create policy "Operators can insert their sensor readings" on public.sensor_readings
  for insert to authenticated
  with check (
    exists (
      select 1 from public.missions
      where missions.id = sensor_readings.mission_id
        and missions.created_by = auth.uid()
    )
  );

create policy "Operators can insert their mission events" on public.mission_events
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.missions
      where missions.id = mission_events.mission_id
        and missions.created_by = auth.uid()
    )
  );

create policy "Operators can create alerts for their missions" on public.alerts
  for insert to authenticated
  with check (
    exists (
      select 1 from public.missions
      where missions.id = alerts.mission_id
        and missions.created_by = auth.uid()
    )
  );

create policy "Operators can create reports for their missions" on public.reports
  for insert to authenticated
  with check (
    generated_by = auth.uid()
    and exists (
      select 1 from public.missions
      where missions.id = reports.mission_id
        and missions.created_by = auth.uid()
    )
  );
