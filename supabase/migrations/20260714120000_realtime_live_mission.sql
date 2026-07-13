do $$
begin
  alter publication supabase_realtime add table public.missions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.mission_zones;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.sensor_readings;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.alerts;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.mission_events;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.drones;
exception when duplicate_object then null;
end $$;

drop policy if exists "Mission controllers can add control events" on public.mission_events;

create policy "Mission controllers can add control events" on public.mission_events
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.has_role(array['administrator', 'mine_operator', 'drone_operator']::public.user_role[])
    and exists (
      select 1 from public.missions
      where missions.id = mission_events.mission_id
    )
  );
