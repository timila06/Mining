create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.has_role(allowed_roles public.user_role[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_role() = any(allowed_roles), false)
$$;

drop policy if exists "Operators can create missions" on public.missions;
drop policy if exists "Operators can update their missions" on public.missions;
drop policy if exists "Operators can insert their mission zones" on public.mission_zones;
drop policy if exists "Operators can update their mission zones" on public.mission_zones;
drop policy if exists "Operators can insert their sensor readings" on public.sensor_readings;
drop policy if exists "Operators can insert their mission events" on public.mission_events;
drop policy if exists "Operators can create alerts for their missions" on public.alerts;
drop policy if exists "Operators can update permitted alerts" on public.alerts;
drop policy if exists "Operators can create reports for their missions" on public.reports;

create policy "Mission operators can create missions" on public.missions
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.has_role(array['administrator', 'mine_operator', 'drone_operator']::public.user_role[])
  );

create policy "Mission operators can update their missions" on public.missions
  for update to authenticated
  using (
    (created_by = auth.uid() and public.has_role(array['administrator', 'mine_operator', 'drone_operator']::public.user_role[]))
    or public.has_role(array['administrator']::public.user_role[])
  )
  with check (
    (created_by = auth.uid() and public.has_role(array['administrator', 'mine_operator', 'drone_operator']::public.user_role[]))
    or public.has_role(array['administrator']::public.user_role[])
  );

create policy "Mission operators can insert mission zones" on public.mission_zones
  for insert to authenticated
  with check (
    public.has_role(array['administrator', 'mine_operator', 'drone_operator']::public.user_role[])
    and exists (
      select 1 from public.missions
      where missions.id = mission_zones.mission_id
        and (missions.created_by = auth.uid() or public.has_role(array['administrator']::public.user_role[]))
    )
  );

create policy "Mission operators can update mission zones" on public.mission_zones
  for update to authenticated
  using (
    public.has_role(array['administrator', 'mine_operator', 'drone_operator']::public.user_role[])
    and exists (
      select 1 from public.missions
      where missions.id = mission_zones.mission_id
        and (missions.created_by = auth.uid() or public.has_role(array['administrator']::public.user_role[]))
    )
  )
  with check (
    public.has_role(array['administrator', 'mine_operator', 'drone_operator']::public.user_role[])
    and exists (
      select 1 from public.missions
      where missions.id = mission_zones.mission_id
        and (missions.created_by = auth.uid() or public.has_role(array['administrator']::public.user_role[]))
    )
  );

create policy "Mission operators can insert sensor readings" on public.sensor_readings
  for insert to authenticated
  with check (
    public.has_role(array['administrator', 'mine_operator', 'drone_operator']::public.user_role[])
    and exists (
      select 1 from public.missions
      where missions.id = sensor_readings.mission_id
        and (missions.created_by = auth.uid() or public.has_role(array['administrator']::public.user_role[]))
    )
  );

create policy "Mission operators can insert mission events" on public.mission_events
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.has_role(array['administrator', 'mine_operator', 'safety_officer', 'drone_operator']::public.user_role[])
    and exists (
      select 1 from public.missions
      where missions.id = mission_events.mission_id
        and (missions.created_by = auth.uid() or public.has_role(array['administrator', 'safety_officer']::public.user_role[]))
    )
  );

create policy "Operational users can create alerts" on public.alerts
  for insert to authenticated
  with check (
    public.has_role(array['administrator', 'mine_operator', 'safety_officer', 'drone_operator']::public.user_role[])
    and exists (
      select 1 from public.missions
      where missions.id = alerts.mission_id
        and (missions.created_by = auth.uid() or public.has_role(array['administrator', 'safety_officer']::public.user_role[]))
    )
  );

create policy "Safety users can update permitted alerts" on public.alerts
  for update to authenticated
  using (
    public.has_role(array['administrator', 'mine_operator', 'safety_officer']::public.user_role[])
    and (
      mission_id is null
      or exists (
        select 1 from public.missions
        where missions.id = alerts.mission_id
          and (missions.created_by is null or missions.created_by = auth.uid() or public.has_role(array['administrator', 'safety_officer']::public.user_role[]))
      )
    )
  )
  with check (
    public.has_role(array['administrator', 'mine_operator', 'safety_officer']::public.user_role[])
    and (
      mission_id is null
      or exists (
        select 1 from public.missions
        where missions.id = alerts.mission_id
          and (missions.created_by is null or missions.created_by = auth.uid() or public.has_role(array['administrator', 'safety_officer']::public.user_role[]))
      )
    )
  );

create policy "Report authors can create reports" on public.reports
  for insert to authenticated
  with check (
    generated_by = auth.uid()
    and public.has_role(array['administrator', 'mine_operator', 'safety_officer']::public.user_role[])
    and exists (
      select 1 from public.missions
      where missions.id = reports.mission_id
        and (missions.created_by = auth.uid() or public.has_role(array['administrator', 'safety_officer']::public.user_role[]))
    )
  );
