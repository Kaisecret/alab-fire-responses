-- Municipal Reporting & Export Events Audit Table
-- Records all official municipal reporting export activities with actor, municipality, dataset, format, filters, and row count.

create table if not exists public.municipal_export_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.users(id) on delete restrict,
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  dataset text not null check (dataset in ('INCIDENT_REGISTER', 'MUNICIPAL_SUMMARY', 'BARANGAY_BREAKDOWN')),
  format text not null check (format in ('CSV', 'PRINT_SUMMARY', 'PRINT_INCIDENT')),
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
