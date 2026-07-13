alter type public.alert_status add value if not exists 'investigating';
alter type public.alert_status add value if not exists 'dismissed';

alter table public.alerts
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists recommended_action text,
  add column if not exists resolution_note text,
  add column if not exists corrective_action text,
  add column if not exists dismissed_at timestamptz;

update public.alerts
set recommended_action = case risk_level
  when 'critical' then 'Block human entry and dispatch a safety officer before clearance.'
  when 'high' then 'Keep the zone under review and inspect supporting sensor trends.'
  when 'medium' then 'Monitor the zone and confirm conditions before entry.'
  else 'Record the finding and continue routine monitoring.'
end
where recommended_action is null;

drop policy if exists "Operators can read permitted alerts" on public.alerts;
drop policy if exists "Operators can create alerts for their missions" on public.alerts;

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

create policy "Operators can create alerts for their missions" on public.alerts
  for insert to authenticated
  with check (
    exists (
      select 1 from public.missions
      where missions.id = alerts.mission_id
        and missions.created_by = auth.uid()
    )
  );

create policy "Operators can update permitted alerts" on public.alerts
  for update to authenticated
  using (
    mission_id is null
    or exists (
      select 1 from public.missions
      where missions.id = alerts.mission_id
        and (missions.created_by is null or missions.created_by = auth.uid())
    )
  )
  with check (
    mission_id is null
    or exists (
      select 1 from public.missions
      where missions.id = alerts.mission_id
        and (missions.created_by is null or missions.created_by = auth.uid())
    )
  );
