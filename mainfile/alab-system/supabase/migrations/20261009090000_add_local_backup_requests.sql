-- Local backup: a responder asks for another station from their own town, and
-- the town's officers send it into the response already running. It never
-- reaches the province and does not raise an alarm level.
create table if not exists public.incident_local_backup_requests (
  id uuid primary key default gen_random_uuid(),
  fire_report_id uuid not null references public.fire_reports(id) on delete cascade,
  dispatch_id uuid not null references public.incident_dispatches(id) on delete cascade,
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  requested_by_user_id uuid not null references public.users(id) on delete restrict,
  requested_station_ids uuid[] not null check (cardinality(requested_station_ids) between 1 and 10),
  reason text check (reason is null or char_length(reason) <= 500),
  status text not null default 'PENDING' check (status in ('PENDING', 'SENT', 'DECLINED', 'CANCELLED')),
  sent_station_ids uuid[],
  handled_by_user_id uuid references public.users(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'PENDING') = (handled_at is null))
);

-- One open request per response and town: a second tap waits on the first.
create unique index if not exists incident_local_backup_requests_one_pending_idx
  on public.incident_local_backup_requests (dispatch_id, municipality_id)
  where status = 'PENDING';
create index if not exists incident_local_backup_requests_municipality_idx
  on public.incident_local_backup_requests (municipality_id, status, created_at);

alter table public.incident_local_backup_requests enable row level security;
revoke all on public.incident_local_backup_requests from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.incident_local_backup_requests from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.incident_local_backup_requests from authenticated;
  end if;
end $$;

alter table public.account_notifications
  drop constraint if exists account_notifications_event_type_check;
alter table public.account_notifications
  add constraint account_notifications_event_type_check check (
    event_type in (
      'FIRE_REPORT_CREATED','FIRE_RESPONSE_STARTED','INCIDENT_DISPATCH_ASSIGNED',
      'INCIDENT_DISPATCH_STATUS_CHANGED','RESIDENT_APPLICATION_SUBMITTED',
      'RESIDENT_APPLICATION_RESUBMITTED','RESIDENT_APPLICATION_APPROVED',
      'RESIDENT_APPLICATION_CHANGES_REQUESTED','MUNICIPAL_ACCOUNT_CREATED',
      'NEARBY_INCIDENT_ASSIGNED','NEARBY_MONITORING_STARTED','ASSISTANCE_REQUESTED',
      'ASSISTANCE_ACCEPTED','ASSISTANCE_PARTIALLY_ACCEPTED','ASSISTANCE_REJECTED',
      'ASSISTANCE_CANCELLED','ASSISTANCE_COMPLETED','NEARBY_SELECTION_DEGRADED',
      'BACKUP_REQUESTED','BACKUP_FORWARDED','ALARM_DECLARED',
      'LOCAL_BACKUP_REQUESTED','LOCAL_BACKUP_SENT','LOCAL_BACKUP_DECLINED'
    )
  );
