alter table public.profiles
  add column if not exists email text,
  add column if not exists mine_site_id uuid references public.mine_sites(id) on delete set null,
  add column if not exists account_status text not null default 'active',
  add column if not exists last_login timestamptz;

alter table public.profiles
  drop constraint if exists profiles_account_status_check,
  add constraint profiles_account_status_check
  check (account_status in ('active', 'suspended', 'inactive'));

update public.profiles
set email = auth_users.email
from auth.users auth_users
where profiles.id = auth_users.id
  and profiles.email is null;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  target_user uuid references public.profiles(id) on delete set null,
  previous_value jsonb,
  new_value jsonb,
  administrator uuid references public.profiles(id) on delete set null,
  action_type text not null,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

create policy "Administrators can read audit logs" on public.audit_logs
  for select to authenticated
  using (public.has_role(array['administrator']::public.user_role[]));

create policy "Administrators can create audit logs" on public.audit_logs
  for insert to authenticated
  with check (
    public.has_role(array['administrator']::public.user_role[])
    and administrator = auth.uid()
  );

drop policy if exists "Administrators can read all profiles" on public.profiles;
drop policy if exists "Administrators can update profiles" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Administrators can read all profiles" on public.profiles
  for select to authenticated
  using (public.has_role(array['administrator']::public.user_role[]));

create policy "Administrators can update profiles" on public.profiles
  for update to authenticated
  using (public.has_role(array['administrator']::public.user_role[]))
  with check (public.has_role(array['administrator']::public.user_role[]));

create policy "Users can update limited own profile" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and account_status = (select p.account_status from public.profiles p where p.id = auth.uid())
    and mine_site_id is not distinct from (select p.mine_site_id from public.profiles p where p.id = auth.uid())
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, organization)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Operator'),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'mine_operator'),
    coalesce(new.raw_user_meta_data->>'organization', 'Operation MOLE')
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;
