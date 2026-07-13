do $$
declare
  site_id uuid;
  demo_drone_id uuid;
  sensor_gas uuid;
  sensor_o2 uuid;
  sensor_temp uuid;
  sensor_humidity uuid;
  sensor_lidar uuid;
  sensor_signal uuid;
  zone_a uuid;
  zone_b uuid;
  zone_c uuid;
  zone_d uuid;
  zone_e uuid;
  zone_f uuid;
  mission_active uuid;
  mission_1 uuid;
  mission_2 uuid;
  mission_3 uuid;
begin
  insert into public.mine_sites (name, region, country, operator_name, status)
  select 'Operation MOLE Demo Mine', 'Chiang Rai Highlands', 'Thailand', 'MOLE Safety Consortium', 'caution'
  where not exists (
    select 1 from public.mine_sites where name = 'Operation MOLE Demo Mine'
  );

  select id into site_id from public.mine_sites where name = 'Operation MOLE Demo Mine' limit 1;

  insert into public.mine_zones (mine_site_id, code, name, level, status, last_inspected_at)
  values
    (site_id, 'A1', 'North Access Tunnel', 'L1', 'clear', now() - interval '45 minutes'),
    (site_id, 'B2', 'Ventilation Bend', 'L1', 'caution', now() - interval '38 minutes'),
    (site_id, 'C3', 'Old Extraction Chamber', 'L2', 'unsafe', now() - interval '27 minutes'),
    (site_id, 'D4', 'Pump Gallery', 'L2', 'clear', now() - interval '22 minutes'),
    (site_id, 'E5', 'Service Shaft Base', 'L3', 'blocked', now() - interval '18 minutes'),
    (site_id, 'F6', 'Return Airway', 'L3', 'caution', now() - interval '12 minutes')
  on conflict (mine_site_id, code) do update set
    name = excluded.name,
    level = excluded.level,
    status = excluded.status,
    last_inspected_at = excluded.last_inspected_at;

  select id into zone_a from public.mine_zones where public.mine_zones.mine_site_id = site_id and code = 'A1';
  select id into zone_b from public.mine_zones where public.mine_zones.mine_site_id = site_id and code = 'B2';
  select id into zone_c from public.mine_zones where public.mine_zones.mine_site_id = site_id and code = 'C3';
  select id into zone_d from public.mine_zones where public.mine_zones.mine_site_id = site_id and code = 'D4';
  select id into zone_e from public.mine_zones where public.mine_zones.mine_site_id = site_id and code = 'E5';
  select id into zone_f from public.mine_zones where public.mine_zones.mine_site_id = site_id and code = 'F6';

  insert into public.drones (mine_site_id, drone_code, name, status, battery_percent, signal_percent, firmware_version, maintenance_due_at)
  values (site_id, 'MOLE-01', 'MOLE-01', 'active', 72, 88, 'v0.8.4-demo', now() + interval '12 days')
  on conflict (drone_code) do update set
    mine_site_id = excluded.mine_site_id,
    status = excluded.status,
    battery_percent = excluded.battery_percent,
    signal_percent = excluded.signal_percent,
    firmware_version = excluded.firmware_version,
    maintenance_due_at = excluded.maintenance_due_at;

  select id into demo_drone_id from public.drones where drone_code = 'MOLE-01';

  insert into public.drone_sensors (drone_id, sensor_key, label, unit, safe_min, safe_max, status)
  values
    (demo_drone_id, 'methane', 'Methane', '% LEL', 0, 5, 'online'),
    (demo_drone_id, 'oxygen', 'Oxygen', '%', 19.5, 23.5, 'online'),
    (demo_drone_id, 'temperature', 'Temperature', 'C', 5, 38, 'online'),
    (demo_drone_id, 'humidity', 'Humidity', '%', 20, 85, 'online'),
    (demo_drone_id, 'lidar_clearance', 'LiDAR Clearance', 'm', 1.5, 30, 'online'),
    (demo_drone_id, 'radio_signal', 'Radio Signal', '%', 55, 100, 'online')
  on conflict (drone_id, sensor_key) do update set
    label = excluded.label,
    unit = excluded.unit,
    safe_min = excluded.safe_min,
    safe_max = excluded.safe_max,
    status = excluded.status;

  select id into sensor_gas from public.drone_sensors where public.drone_sensors.drone_id = demo_drone_id and sensor_key = 'methane';
  select id into sensor_o2 from public.drone_sensors where public.drone_sensors.drone_id = demo_drone_id and sensor_key = 'oxygen';
  select id into sensor_temp from public.drone_sensors where public.drone_sensors.drone_id = demo_drone_id and sensor_key = 'temperature';
  select id into sensor_humidity from public.drone_sensors where public.drone_sensors.drone_id = demo_drone_id and sensor_key = 'humidity';
  select id into sensor_lidar from public.drone_sensors where public.drone_sensors.drone_id = demo_drone_id and sensor_key = 'lidar_clearance';
  select id into sensor_signal from public.drone_sensors where public.drone_sensors.drone_id = demo_drone_id and sensor_key = 'radio_signal';

  insert into public.missions (mine_site_id, drone_id, mission_code, title, status, risk_level, progress_percent, started_at, completed_at)
  values
    (site_id, demo_drone_id, 'MOLE-ACT-004', 'Live airway sweep', 'active', 'high', 64, now() - interval '52 minutes', null),
    (site_id, demo_drone_id, 'MOLE-CMP-003', 'Pump gallery inspection', 'completed', 'medium', 100, now() - interval '2 days 4 hours', now() - interval '2 days 3 hours'),
    (site_id, demo_drone_id, 'MOLE-CMP-002', 'North access gas check', 'completed', 'low', 100, now() - interval '4 days 2 hours', now() - interval '4 days 1 hour'),
    (site_id, demo_drone_id, 'MOLE-CMP-001', 'Service shaft mapping', 'completed', 'critical', 100, now() - interval '7 days 6 hours', now() - interval '7 days 5 hours')
  on conflict (mission_code) do update set
    title = excluded.title,
    status = excluded.status,
    risk_level = excluded.risk_level,
    progress_percent = excluded.progress_percent,
    started_at = excluded.started_at,
    completed_at = excluded.completed_at;

  select id into mission_active from public.missions where mission_code = 'MOLE-ACT-004';
  select id into mission_1 from public.missions where mission_code = 'MOLE-CMP-003';
  select id into mission_2 from public.missions where mission_code = 'MOLE-CMP-002';
  select id into mission_3 from public.missions where mission_code = 'MOLE-CMP-001';

  insert into public.mission_zones (mission_id, mine_zone_id, visit_order, status, entered_at, exited_at)
  values
    (mission_active, zone_a, 1, 'clear', now() - interval '49 minutes', now() - interval '42 minutes'),
    (mission_active, zone_b, 2, 'caution', now() - interval '41 minutes', now() - interval '31 minutes'),
    (mission_active, zone_c, 3, 'unsafe', now() - interval '30 minutes', null),
    (mission_active, zone_f, 4, 'unknown', null, null),
    (mission_1, zone_d, 1, 'clear', now() - interval '2 days 4 hours', now() - interval '2 days 3 hours 20 minutes'),
    (mission_2, zone_a, 1, 'clear', now() - interval '4 days 2 hours', now() - interval '4 days 1 hour 20 minutes'),
    (mission_3, zone_e, 1, 'blocked', now() - interval '7 days 6 hours', now() - interval '7 days 5 hours 30 minutes')
  on conflict (mission_id, mine_zone_id) do update set
    visit_order = excluded.visit_order,
    status = excluded.status,
    entered_at = excluded.entered_at,
    exited_at = excluded.exited_at;

  delete from public.alerts where mission_id in (mission_active, mission_1, mission_2, mission_3);
  delete from public.sensor_readings where mission_id in (mission_active, mission_1, mission_2, mission_3);
  delete from public.mission_events where mission_id in (mission_active, mission_1, mission_2, mission_3);
  delete from public.reports where mission_id in (mission_active, mission_1, mission_2, mission_3);

  insert into public.sensor_readings (mission_id, drone_sensor_id, mine_zone_id, reading_value, unit, risk_level, recorded_at)
  values
    (mission_active, sensor_gas, zone_b, 2.1, '% LEL', 'low', now() - interval '30 minutes'),
    (mission_active, sensor_o2, zone_b, 20.7, '%', 'low', now() - interval '29 minutes'),
    (mission_active, sensor_temp, zone_b, 31.4, 'C', 'medium', now() - interval '28 minutes'),
    (mission_active, sensor_humidity, zone_b, 72.0, '%', 'low', now() - interval '27 minutes'),
    (mission_active, sensor_lidar, zone_b, 7.8, 'm', 'low', now() - interval '26 minutes'),
    (mission_active, sensor_signal, zone_b, 91, '%', 'low', now() - interval '25 minutes'),
    (mission_active, sensor_gas, zone_c, 5.8, '% LEL', 'high', now() - interval '18 minutes'),
    (mission_active, sensor_o2, zone_c, 18.9, '%', 'high', now() - interval '17 minutes'),
    (mission_active, sensor_temp, zone_c, 35.6, 'C', 'medium', now() - interval '16 minutes'),
    (mission_active, sensor_humidity, zone_c, 81.5, '%', 'medium', now() - interval '15 minutes'),
    (mission_active, sensor_lidar, zone_c, 2.1, 'm', 'high', now() - interval '14 minutes'),
    (mission_active, sensor_signal, zone_c, 66, '%', 'medium', now() - interval '13 minutes'),
    (mission_active, sensor_gas, zone_c, 7.2, '% LEL', 'critical', now() - interval '7 minutes'),
    (mission_active, sensor_o2, zone_c, 18.3, '%', 'critical', now() - interval '6 minutes'),
    (mission_active, sensor_signal, zone_c, 58, '%', 'medium', now() - interval '5 minutes'),
    (mission_1, sensor_gas, zone_d, 1.2, '% LEL', 'low', now() - interval '2 days 3 hours 42 minutes'),
    (mission_1, sensor_o2, zone_d, 20.9, '%', 'low', now() - interval '2 days 3 hours 40 minutes'),
    (mission_1, sensor_temp, zone_d, 28.8, 'C', 'low', now() - interval '2 days 3 hours 38 minutes'),
    (mission_1, sensor_lidar, zone_d, 11.4, 'm', 'low', now() - interval '2 days 3 hours 35 minutes'),
    (mission_2, sensor_gas, zone_a, 0.8, '% LEL', 'low', now() - interval '4 days 1 hour 50 minutes'),
    (mission_2, sensor_o2, zone_a, 21.1, '%', 'low', now() - interval '4 days 1 hour 47 minutes'),
    (mission_2, sensor_signal, zone_a, 94, '%', 'low', now() - interval '4 days 1 hour 45 minutes'),
    (mission_3, sensor_lidar, zone_e, 1.1, 'm', 'critical', now() - interval '7 days 5 hours 50 minutes'),
    (mission_3, sensor_gas, zone_e, 4.9, '% LEL', 'medium', now() - interval '7 days 5 hours 48 minutes'),
    (mission_3, sensor_o2, zone_e, 19.2, '%', 'high', now() - interval '7 days 5 hours 45 minutes');

  insert into public.alerts (mission_id, mine_zone_id, title, description, risk_level, status, created_at)
  values
    (mission_active, zone_c, 'Methane above threshold', 'MOLE-01 detected a rising methane concentration in the old extraction chamber.', 'critical', 'open', now() - interval '7 minutes'),
    (mission_active, zone_c, 'Oxygen below safe range', 'Oxygen readings dropped below the operator safety threshold.', 'high', 'open', now() - interval '6 minutes'),
    (mission_active, zone_c, 'Narrow clearance detected', 'LiDAR shows restricted clearance before the eastern crosscut.', 'high', 'acknowledged', now() - interval '14 minutes'),
    (mission_3, zone_e, 'Blocked service shaft route', 'Historical map route is obstructed and requires a manual safety review.', 'medium', 'resolved', now() - interval '7 days 5 hours 30 minutes');

  insert into public.mission_events (mission_id, event_type, summary, metadata, created_at)
  values
    (mission_active, 'zone_entered', 'MOLE-01 entered Old Extraction Chamber.', '{"zone":"C3"}', now() - interval '30 minutes'),
    (mission_active, 'alert_created', 'Critical methane alert opened.', '{"sensor":"methane","value":7.2}', now() - interval '7 minutes'),
    (mission_1, 'mission_completed', 'Pump gallery inspection completed with no critical findings.', '{}', now() - interval '2 days 3 hours'),
    (mission_3, 'route_blocked', 'Service shaft path marked blocked after LiDAR scan.', '{"zone":"E5"}', now() - interval '7 days 5 hours 30 minutes');

  insert into public.reports (mission_id, title, summary, recommendations, generated_at)
  values
    (mission_1, 'Pump Gallery Inspection Summary', 'Pump gallery remains passable with normal gas and temperature readings.', 'Schedule routine follow-up scan in seven days.', now() - interval '2 days 2 hours'),
    (mission_3, 'Service Shaft Mapping Review', 'MOLE-01 mapped a blocked route at the service shaft base and identified limited clearance.', 'Keep the route closed until a manual support inspection is completed.', now() - interval '7 days 4 hours');
end $$;

