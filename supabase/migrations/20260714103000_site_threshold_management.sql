alter table public.mine_sites
  add column if not exists mine_type text not null default 'underground',
  add column if not exists location text,
  add column if not exists emergency_contact text,
  add column if not exists base_station_info text;

alter table public.mine_zones
  add column if not exists map_coordinates jsonb not null default '{"x":0,"y":0,"z":0}'::jsonb,
  add column if not exists restricted boolean not null default false;

update public.mine_sites
set
  location = coalesce(location, region || ', ' || country),
  emergency_contact = coalesce(emergency_contact, '+66 emergency control room'),
  base_station_info = coalesce(base_station_info, 'MOLE-01 base station at north access tunnel')
where name = 'Operation MOLE Demo Mine';

insert into public.system_settings (setting_key, setting_value, description)
values
  ('threshold_oxygen', '{"display_name":"Oxygen","value":19.5,"unit":"%","severity_level":"critical","sensor_key":"oxygen","comparison":"lt"}', 'Minimum oxygen percentage before alerting.'),
  ('threshold_carbon_monoxide', '{"display_name":"Carbon monoxide","value":25,"unit":"ppm","severity_level":"high","sensor_key":"carbon_monoxide","comparison":"gt"}', 'Maximum carbon monoxide level before alerting.'),
  ('threshold_methane', '{"display_name":"Methane","value":5,"unit":"% LEL","severity_level":"critical","sensor_key":"methane","comparison":"gt"}', 'Maximum methane level before alerting.'),
  ('threshold_hydrogen_sulfide', '{"display_name":"Hydrogen sulfide","value":10,"unit":"ppm","severity_level":"high","sensor_key":"hydrogen_sulfide","comparison":"gt"}', 'Maximum hydrogen sulfide level before alerting.'),
  ('threshold_particulate_matter', '{"display_name":"Particulate matter","value":50,"unit":"ug/m3","severity_level":"medium","sensor_key":"particulate_matter","comparison":"gt"}', 'Maximum particulate matter level before alerting.'),
  ('threshold_radiation', '{"display_name":"Radiation","value":0.5,"unit":"mSv/h","severity_level":"critical","sensor_key":"radiation","comparison":"gt"}', 'Maximum radiation level before alerting.'),
  ('threshold_low_battery_return', '{"display_name":"Low-battery auto-return","value":25,"unit":"%","severity_level":"medium","sensor_key":"battery","comparison":"lt"}', 'Battery percentage that triggers automatic return.'),
  ('threshold_low_signal_return', '{"display_name":"Low-signal auto-return","value":55,"unit":"%","severity_level":"medium","sensor_key":"radio_signal","comparison":"lt"}', 'Signal percentage that triggers automatic return.')
on conflict (setting_key) do update set
  setting_value = excluded.setting_value,
  description = excluded.description;

drop policy if exists "Administrators can create mine sites" on public.mine_sites;
drop policy if exists "Administrators can update mine sites" on public.mine_sites;
drop policy if exists "Administrators can create mine zones" on public.mine_zones;
drop policy if exists "Administrators can update mine zones" on public.mine_zones;
drop policy if exists "Administrators can create system settings" on public.system_settings;
drop policy if exists "Administrators can update system settings" on public.system_settings;

create policy "Administrators can create mine sites" on public.mine_sites
  for insert to authenticated
  with check (public.has_role(array['administrator']::public.user_role[]));

create policy "Administrators can update mine sites" on public.mine_sites
  for update to authenticated
  using (public.has_role(array['administrator']::public.user_role[]))
  with check (public.has_role(array['administrator']::public.user_role[]));

create policy "Administrators can create mine zones" on public.mine_zones
  for insert to authenticated
  with check (public.has_role(array['administrator']::public.user_role[]));

create policy "Administrators can update mine zones" on public.mine_zones
  for update to authenticated
  using (public.has_role(array['administrator']::public.user_role[]))
  with check (public.has_role(array['administrator']::public.user_role[]));

create policy "Administrators can create system settings" on public.system_settings
  for insert to authenticated
  with check (public.has_role(array['administrator']::public.user_role[]));

create policy "Administrators can update system settings" on public.system_settings
  for update to authenticated
  using (public.has_role(array['administrator']::public.user_role[]))
  with check (public.has_role(array['administrator']::public.user_role[]));
