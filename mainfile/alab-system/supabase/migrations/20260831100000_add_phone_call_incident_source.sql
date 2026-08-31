alter table public.fire_reports
  alter column resident_profile_id drop not null,
  add column if not exists report_source text not null default 'ALAB_APP',
  add column if not exists caller_name text,
  add column if not exists caller_phone text,
  add column if not exists created_by_user_id uuid references public.users(id) on delete set null,
  add column if not exists reported_at timestamptz not null default now();

alter table public.fire_reports
  add constraint fire_reports_report_source_check
  check (report_source in ('ALAB_APP', 'PHONE_CALL'));

alter table public.fire_reports
  add constraint fire_reports_source_shape_check check (
    (report_source = 'ALAB_APP' and resident_profile_id is not null)
    or (
      report_source = 'PHONE_CALL' and resident_profile_id is null
      and char_length(trim(caller_name)) between 2 and 120
      and caller_phone ~ E'^\\+?[0-9]{10,15}$'
      and created_by_user_id is not null
    )
  );

create or replace function public.fire_reports_phone_creator_scope_fn()
returns trigger
language plpgsql
as $$
begin
  if new.report_source = 'PHONE_CALL' and not exists (
    select 1
    from public.bfp_municipality_assignments assignment
    join public.bfp_personnel_profiles personnel
      on personnel.id = assignment.personnel_profile_id
    join public.users u
      on u.id = personnel.user_id
    where assignment.municipality_id = new.municipality_id
      and assignment.assignment_role in ('MUNICIPAL_ADMIN', 'MUNICIPAL_STAFF')
      and assignment.status = 'ACTIVE'
      and u.role = 'MUNICIPAL_BFP'
      and u.id = new.created_by_user_id
  ) then
    raise exception 'Phone-call incident creator must be an active municipal BFP assigned to the incident municipality';
  end if;
  return new;
end;
$$;

drop trigger if exists fire_reports_phone_creator_scope_trg on public.fire_reports;
create trigger fire_reports_phone_creator_scope_trg
  before insert or update of report_source, created_by_user_id, municipality_id
  on public.fire_reports
  for each row
  execute function public.fire_reports_phone_creator_scope_fn();

create index if not exists fire_reports_municipality_source_submitted_idx
  on public.fire_reports (municipality_id, report_source, submitted_at desc);

comment on column public.fire_reports.report_source is
  'Incident intake source; server-side code owns this field.';
comment on column public.fire_reports.caller_name is
  'Phone caller name; server-side code owns this field.';
comment on column public.fire_reports.caller_phone is
  'Phone caller number; server-side code owns this field.';
comment on column public.fire_reports.created_by_user_id is
  'Staff user who recorded a phone incident; server-side code owns this field.';
comment on column public.fire_reports.reported_at is
  'Time the incident was reported; server-side code owns this field.';
comment on table public.fire_reports is
  'Incident source and caller fields are written by trusted server-side code.';
