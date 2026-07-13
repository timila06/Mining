drop policy if exists "Authenticated users can read missions" on public.missions;
drop policy if exists "Authenticated users can read mission zones" on public.mission_zones;
drop policy if exists "Authenticated users can read sensor readings" on public.sensor_readings;
drop policy if exists "Authenticated users can read alerts" on public.alerts;
drop policy if exists "Authenticated users can read mission events" on public.mission_events;
drop policy if exists "Authenticated users can read reports" on public.reports;

create policy "Operators can read permitted missions" on public.missions
  for select to authenticated
  using (created_by is null or created_by = auth.uid());

create policy "Operators can read permitted mission zones" on public.mission_zones
  for select to authenticated
  using (
    exists (
      select 1 from public.missions
      where missions.id = mission_zones.mission_id
        and (missions.created_by is null or missions.created_by = auth.uid())
    )
  );

create policy "Operators can read permitted sensor readings" on public.sensor_readings
  for select to authenticated
  using (
    exists (
      select 1 from public.missions
      where missions.id = sensor_readings.mission_id
        and (missions.created_by is null or missions.created_by = auth.uid())
    )
  );

create policy "Operators can read permitted alerts" on public.alerts
  for select to authenticated
  using (
    mission_id is null
    or exists (
      select 1 from public.missions
      where missions.id = alerts.mission_id
        and (missions.created_by is null or missions.created_by = auth.uid())
    )
  );

create policy "Operators can read permitted mission events" on public.mission_events
  for select to authenticated
  using (
    exists (
      select 1 from public.missions
      where missions.id = mission_events.mission_id
        and (missions.created_by is null or missions.created_by = auth.uid())
    )
  );

create policy "Operators can read permitted reports" on public.reports
  for select to authenticated
  using (
    generated_by is null
    or generated_by = auth.uid()
    or exists (
      select 1 from public.missions
      where missions.id = reports.mission_id
        and (missions.created_by is null or missions.created_by = auth.uid())
    )
  );
