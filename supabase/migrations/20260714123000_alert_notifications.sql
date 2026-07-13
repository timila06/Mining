create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  critical_alerts boolean not null default true,
  dangerous_alerts boolean not null default true,
  mission_status_changes boolean not null default true,
  safety_approvals boolean not null default true,
  maintenance_warnings boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  alert_id uuid references public.alerts(id) on delete cascade,
  mission_id uuid references public.missions(id) on delete cascade,
  title text not null,
  message text not null,
  severity text not null,
  read_at timestamptz,
  delivery_status text not null default 'in_app_delivered',
  created_at timestamptz not null default now()
);

create table if not exists public.alert_escalations (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.alerts(id) on delete cascade,
  escalation_level integer not null default 1,
  escalated_at timestamptz not null default now(),
  notified_roles text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (alert_id, escalation_level)
);

alter table public.notifications
  drop constraint if exists notifications_delivery_status_check,
  add constraint notifications_delivery_status_check check (delivery_status in ('in_app_delivered', 'pending_email', 'pending_sms', 'failed'));

create index if not exists notifications_user_unread_idx on public.notifications(user_id, read_at, created_at desc);
create index if not exists notifications_alert_id_idx on public.notifications(alert_id);
create index if not exists alert_escalations_alert_id_idx on public.alert_escalations(alert_id);

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.alert_escalations enable row level security;

insert into public.notification_preferences (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

insert into public.system_settings (setting_key, setting_value, description)
values
  ('notification_escalation_level_1_minutes', '{"display_name":"Critical escalation level 1","value":5,"unit":"minutes"}', 'Minutes before an unacknowledged critical alert escalates to level 1.'),
  ('notification_escalation_level_2_minutes', '{"display_name":"Critical escalation level 2","value":10,"unit":"minutes"}', 'Minutes before an unacknowledged critical alert escalates to level 2.')
on conflict (setting_key) do update set
  setting_value = excluded.setting_value,
  description = excluded.description;

drop policy if exists "Users can read own notification preferences" on public.notification_preferences;
drop policy if exists "Users can update own notification preferences" on public.notification_preferences;
drop policy if exists "Users can read own notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;
drop policy if exists "Administrators can read alert escalations" on public.alert_escalations;

create policy "Users can read own notification preferences" on public.notification_preferences
  for select to authenticated
  using (user_id = auth.uid());

create policy "Users can update own notification preferences" on public.notification_preferences
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can read own notifications" on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

create policy "Users can update own notifications" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Administrators can read alert escalations" on public.alert_escalations
  for select to authenticated
  using (public.has_role(array['administrator']::public.user_role[]));

create or replace function public.ensure_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_create_notification_preferences on public.profiles;
create trigger profiles_create_notification_preferences
  after insert on public.profiles
  for each row execute function public.ensure_notification_preferences();

create or replace function public.create_alert_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mission_site uuid;
  zone_label text;
  old_rank integer;
  new_rank integer;
begin
  old_rank := case coalesce(old.risk_level::text, 'low') when 'critical' then 4 when 'high' then 3 when 'medium' then 2 else 1 end;
  new_rank := case new.risk_level::text when 'critical' then 4 when 'high' then 3 when 'medium' then 2 else 1 end;

  if tg_op = 'UPDATE' and new_rank <= old_rank then
    return new;
  end if;

  if new.risk_level not in ('high', 'critical') then
    return new;
  end if;

  select missions.mine_site_id into mission_site
  from public.missions
  where missions.id = new.mission_id;

  select mine_zones.code into zone_label
  from public.mine_zones
  where mine_zones.id = new.mine_zone_id;

  insert into public.notifications (user_id, alert_id, mission_id, title, message, severity)
  select
    profiles.id,
    new.id,
    new.mission_id,
    new.title,
    coalesce(zone_label || ': ', '') || new.description,
    new.risk_level::text
  from public.profiles
  left join public.notification_preferences prefs on prefs.user_id = profiles.id
  where profiles.role in ('administrator', 'mine_operator', 'safety_officer', 'drone_operator')
    and (profiles.mine_site_id is null or profiles.mine_site_id = mission_site or profiles.role in ('administrator', 'drone_operator'))
    and (
      (new.risk_level = 'critical' and coalesce(prefs.critical_alerts, true))
      or (new.risk_level = 'high' and coalesce(prefs.dangerous_alerts, true))
    )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists alerts_create_notifications on public.alerts;
create trigger alerts_create_notifications
  after insert or update of risk_level on public.alerts
  for each row execute function public.create_alert_notifications();

create or replace function public.create_mission_event_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mission_site uuid;
begin
  if new.event_type not in ('emergency_recall', 'return_to_base', 'mission_paused', 'mission_resumed', 'safety_approval_changed') then
    return new;
  end if;

  select missions.mine_site_id into mission_site from public.missions where missions.id = new.mission_id;

  insert into public.notifications (user_id, mission_id, title, message, severity)
  select
    profiles.id,
    new.mission_id,
    replace(initcap(replace(new.event_type, '_', ' ')), 'Mole', 'MOLE'),
    new.summary,
    case when new.event_type = 'emergency_recall' then 'critical' else 'medium' end
  from public.profiles
  left join public.notification_preferences prefs on prefs.user_id = profiles.id
  where profiles.role in ('administrator', 'mine_operator', 'safety_officer', 'drone_operator')
    and (profiles.mine_site_id is null or profiles.mine_site_id = mission_site or profiles.role in ('administrator', 'drone_operator'))
    and coalesce(prefs.mission_status_changes, true);

  return new;
end;
$$;

drop trigger if exists mission_events_create_notifications on public.mission_events;
create trigger mission_events_create_notifications
  after insert on public.mission_events
  for each row execute function public.create_mission_event_notifications();

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;
