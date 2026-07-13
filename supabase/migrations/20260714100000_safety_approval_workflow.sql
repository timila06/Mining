alter table public.reports
  add column if not exists report_status text not null default 'draft';

alter table public.safety_approvals
  add column if not exists report_id uuid references public.reports(id) on delete cascade,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists decision text,
  add column if not exists comments text,
  add column if not exists conditions text,
  add column if not exists corrective_actions text,
  add column if not exists approved_at timestamptz;

create unique index if not exists safety_approvals_report_id_key
  on public.safety_approvals(report_id)
  where report_id is not null;

alter table public.safety_approvals
  drop constraint if exists safety_approvals_decision_check,
  add constraint safety_approvals_decision_check
  check (
    decision is null
    or decision in (
      'Safe to enter',
      'Conditional entry',
      'Restricted access',
      'Do not enter',
      'Emergency response required'
    )
  );

drop policy if exists "Safety users can create safety approvals" on public.safety_approvals;
drop policy if exists "Safety users can update safety approvals" on public.safety_approvals;

create policy "Safety users can create safety approvals" on public.safety_approvals
  for insert to authenticated
  with check (
    public.has_role(array['administrator', 'safety_officer']::public.user_role[])
    and reviewed_by = auth.uid()
  );

create policy "Safety users can update safety approvals" on public.safety_approvals
  for update to authenticated
  using (public.has_role(array['administrator', 'safety_officer']::public.user_role[]))
  with check (
    public.has_role(array['administrator', 'safety_officer']::public.user_role[])
    and reviewed_by = auth.uid()
  );

drop policy if exists "Safety users can update report approvals" on public.reports;

create policy "Safety users can update report approvals" on public.reports
  for update to authenticated
  using (public.has_role(array['administrator', 'safety_officer']::public.user_role[]))
  with check (public.has_role(array['administrator', 'safety_officer']::public.user_role[]));
