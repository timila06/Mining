create or replace function public.run_alert_escalations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  level_one_minutes numeric := 5;
  level_two_minutes numeric := 10;
  inserted_count integer := 0;
  second_inserted_count integer := 0;
begin
  select coalesce((setting_value->>'value')::numeric, 5)
  into level_one_minutes
  from public.system_settings
  where setting_key = 'notification_escalation_level_1_minutes';

  select coalesce((setting_value->>'value')::numeric, 10)
  into level_two_minutes
  from public.system_settings
  where setting_key = 'notification_escalation_level_2_minutes';

  insert into public.alert_escalations (alert_id, escalation_level, notified_roles)
  select alerts.id, 1, array['administrator', 'safety_officer']
  from public.alerts
  where alerts.risk_level = 'critical'
    and alerts.status in ('open', 'acknowledged')
    and alerts.created_at <= now() - make_interval(mins => level_one_minutes::integer)
    and not exists (
      select 1 from public.alert_escalations
      where alert_escalations.alert_id = alerts.id
        and alert_escalations.escalation_level = 1
    )
  on conflict do nothing;

  get diagnostics inserted_count = row_count;

  insert into public.alert_escalations (alert_id, escalation_level, notified_roles)
  select alerts.id, 2, array['administrator', 'safety_officer']
  from public.alerts
  where alerts.risk_level = 'critical'
    and alerts.status in ('open', 'acknowledged')
    and alerts.created_at <= now() - make_interval(mins => level_two_minutes::integer)
    and not exists (
      select 1 from public.alert_escalations
      where alert_escalations.alert_id = alerts.id
        and alert_escalations.escalation_level = 2
    )
  on conflict do nothing;

  get diagnostics second_inserted_count = row_count;
  inserted_count := inserted_count + second_inserted_count;
  return inserted_count;
end;
$$;

create or replace function public.notify_alert_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  alert_row public.alerts%rowtype;
  mission_site uuid;
begin
  select * into alert_row from public.alerts where id = new.alert_id;
  select missions.mine_site_id into mission_site from public.missions where id = alert_row.mission_id;

  insert into public.notifications (user_id, alert_id, mission_id, title, message, severity)
  select
    profiles.id,
    alert_row.id,
    alert_row.mission_id,
    'Escalation level ' || new.escalation_level || ': ' || alert_row.title,
    'Critical alert remains unacknowledged beyond the configured escalation window.',
    'critical'
  from public.profiles
  left join public.notification_preferences prefs on prefs.user_id = profiles.id
  where profiles.role in ('administrator', 'safety_officer')
    and (profiles.mine_site_id is null or profiles.mine_site_id = mission_site or profiles.role = 'administrator')
    and coalesce(prefs.critical_alerts, true);

  return new;
end;
$$;

drop trigger if exists alert_escalations_create_notifications on public.alert_escalations;
create trigger alert_escalations_create_notifications
  after insert on public.alert_escalations
  for each row execute function public.notify_alert_escalation();
