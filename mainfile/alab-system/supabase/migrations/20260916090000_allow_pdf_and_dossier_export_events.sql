-- Municipal exports now generate PDF documents, including a single-incident
-- dossier. The audit table was written for CSV and browser print only, so its
-- check constraints rejected both values and every PDF export failed at the
-- audit insert.
--
-- This migration is self-contained: it creates the audit table when the earlier
-- migration never reached the database, and repairs the constraints when it did.

create extension if not exists pgcrypto;

create table if not exists public.municipal_export_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.users(id) on delete restrict,
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  dataset text not null,
  format text not null,
  row_count integer not null default 0,
  file_name text not null,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists municipal_export_events_created_idx
  on public.municipal_export_events (created_at desc);

create index if not exists municipal_export_events_municipality_idx
  on public.municipal_export_events (municipality_id, created_at desc);

create index if not exists municipal_export_events_actor_idx
  on public.municipal_export_events (actor_user_id, created_at desc);

-- Constraints are dropped and re-added so an existing table converges on the
-- same definition as a freshly created one.
alter table public.municipal_export_events
  drop constraint if exists municipal_export_events_dataset_check;

alter table public.municipal_export_events
  add constraint municipal_export_events_dataset_check
  check (dataset in ('INCIDENT_REGISTER', 'MUNICIPAL_SUMMARY', 'BARANGAY_BREAKDOWN', 'INCIDENT_DOSSIER'));

alter table public.municipal_export_events
  drop constraint if exists municipal_export_events_format_check;

-- PRINT_SUMMARY and PRINT_INCIDENT are retained so existing audit rows stay valid.
alter table public.municipal_export_events
  add constraint municipal_export_events_format_check
  check (format in ('CSV', 'PDF', 'PRINT_SUMMARY', 'PRINT_INCIDENT'));

alter table public.municipal_export_events enable row level security;

revoke all on table public.municipal_export_events from public, anon, authenticated;

create or replace function public.prevent_municipal_export_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'municipal export events are immutable';
end;
$$;

revoke all on function public.prevent_municipal_export_event_mutation()
  from public, anon, authenticated;

drop trigger if exists prevent_municipal_export_event_mutation
  on public.municipal_export_events;
create trigger prevent_municipal_export_event_mutation
before update or delete on public.municipal_export_events
for each row execute function public.prevent_municipal_export_event_mutation();
