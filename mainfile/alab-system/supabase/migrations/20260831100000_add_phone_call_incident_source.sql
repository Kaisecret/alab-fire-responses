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
      and caller_phone ~ '^\\+?[0-9]{10,15}$'
      and created_by_user_id is not null
    )
  );

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
