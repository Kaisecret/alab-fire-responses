-- Responder backup escalation.
--
-- A responder on scene raises a backup request from the mobile app. It goes to
-- the municipality that owns the incident, which either forwards it to the
-- province or lets it forward itself after a grace period. The province then
-- declares an alarm level, which is what summons further municipalities.

create extension if not exists pgcrypto;

create table if not exists public.incident_backup_requests (
  id uuid primary key default gen_random_uuid(),
  fire_report_id uuid not null references public.fire_reports(id) on delete cascade,
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  -- The responder who called for backup.
  requested_by_user_id uuid not null references public.users(id) on delete restrict,
  dispatch_id uuid references public.incident_dispatches(id) on delete set null,
  reason text,
  requested_firetrucks integer not null default 0 check (requested_firetrucks between 0 and 500),
  requested_personnel integer not null default 0 check (requested_personnel between 0 and 500),

  status text not null default 'PENDING_MUNICIPAL'
    check (status in ('PENDING_MUNICIPAL', 'FORWARDED_PROVINCIAL', 'RESOLVED', 'CANCELLED')),

  -- Acknowledgement by the municipality that owns the incident.
  acknowledged_by_user_id uuid references public.users(id) on delete set null,
  acknowledged_at timestamptz,

  -- Forwarding to the province, whether by hand or by the grace period expiring.
  forwarded_at timestamptz,
  forwarded_by_user_id uuid references public.users(id) on delete set null,
  forwarded_automatically boolean not null default false,

  -- The deadline after which an un-forwarded request escalates on its own.
  auto_forward_at timestamptz not null default now() + interval '60 seconds',

  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One open request per incident: a second responder asking for backup joins the
-- existing escalation instead of starting a competing one.
create unique index if not exists incident_backup_requests_open_idx
  on public.incident_backup_requests (fire_report_id)
  where status in ('PENDING_MUNICIPAL', 'FORWARDED_PROVINCIAL');

create index if not exists incident_backup_requests_municipality_idx
  on public.incident_backup_requests (municipality_id, status, created_at desc);

-- Drives the sweep that forwards expired requests; partial so it stays small.
create index if not exists incident_backup_requests_due_idx
  on public.incident_backup_requests (auto_forward_at)
  where status = 'PENDING_MUNICIPAL';

alter table public.incident_backup_requests enable row level security;
revoke all on table public.incident_backup_requests from public, anon, authenticated;

-- Alarm levels are the province's declaration of magnitude. Each level is
-- recorded once per incident so the progression stays auditable.
create table if not exists public.incident_alarm_levels (
  id uuid primary key default gen_random_uuid(),
  fire_report_id uuid not null references public.fire_reports(id) on delete cascade,
  backup_request_id uuid references public.incident_backup_requests(id) on delete set null,
  alarm_level integer not null check (alarm_level between 1 and 5),
  declared_by_user_id uuid not null references public.users(id) on delete restrict,
  note text,
  declared_at timestamptz not null default now()
);

-- A level is declared once per incident; raising it means declaring the next.
create unique index if not exists incident_alarm_levels_unique_idx
  on public.incident_alarm_levels (fire_report_id, alarm_level);

create index if not exists incident_alarm_levels_report_idx
  on public.incident_alarm_levels (fire_report_id, alarm_level desc);

alter table public.incident_alarm_levels enable row level security;
revoke all on table public.incident_alarm_levels from public, anon, authenticated;

-- Alarm declarations are a record of what was ordered during an emergency and
-- must not be rewritten after the fact.
create or replace function public.prevent_incident_alarm_level_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'incident alarm levels are immutable';
end;
$$;

revoke all on function public.prevent_incident_alarm_level_mutation()
  from public, anon, authenticated;

drop trigger if exists prevent_incident_alarm_level_mutation
  on public.incident_alarm_levels;
create trigger prevent_incident_alarm_level_mutation
before update or delete on public.incident_alarm_levels
for each row execute function public.prevent_incident_alarm_level_mutation();
