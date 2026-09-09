create table if not exists public.incident_municipal_observers (
  id uuid primary key,
  fire_report_id uuid not null references public.fire_reports(id) on delete restrict,
  dispatch_id uuid not null references public.incident_dispatches(id) on delete restrict,
  origin_municipality_id uuid not null references public.municipalities(id) on delete restrict,
  observer_municipality_id uuid not null references public.municipalities(id) on delete restrict,
  nearest_station_id uuid not null references public.municipal_bfp_stations(id) on delete restrict,
  station_latitude_snapshot numeric(9,6) not null check (station_latitude_snapshot between 4 and 22),
  station_longitude_snapshot numeric(9,6) not null check (station_longitude_snapshot between 115 and 130),
  distance_meters numeric(12,2) not null check (distance_meters >= 0),
  status text not null check (status in ('ACTIVE','ENDED')),
  selected_at timestamptz not null,
  acknowledged_by_user_id uuid references public.users(id) on delete restrict,
  acknowledged_at timestamptz,
  ended_at timestamptz,
  unique (dispatch_id, observer_municipality_id),
  check (origin_municipality_id <> observer_municipality_id),
  check (
    (status = 'ACTIVE' and ended_at is null)
    or (status = 'ENDED' and ended_at is not null)
  ),
  check (
    (acknowledged_by_user_id is null and acknowledged_at is null)
    or (acknowledged_by_user_id is not null and acknowledged_at is not null)
  )
);

create index if not exists incident_municipal_observers_active_queue_idx
  on public.incident_municipal_observers (observer_municipality_id, status, selected_at desc);
create index if not exists incident_municipal_observers_report_status_idx
  on public.incident_municipal_observers (fire_report_id, status);

create table if not exists public.intermunicipal_assistance_requests (
  id uuid primary key,
  fire_report_id uuid not null references public.fire_reports(id) on delete restrict,
  dispatch_id uuid not null references public.incident_dispatches(id) on delete restrict,
  observer_id uuid not null references public.incident_municipal_observers(id) on delete restrict,
  requester_municipality_id uuid not null references public.municipalities(id) on delete restrict,
  recipient_municipality_id uuid not null references public.municipalities(id) on delete restrict,
  requested_by_user_id uuid not null references public.users(id) on delete restrict,
  requested_firetrucks smallint not null default 0 check (requested_firetrucks >= 0),
  requested_personnel smallint not null default 0 check (requested_personnel >= 0),
  request_note text check (request_note is null or char_length(request_note) <= 500),
  status text not null check (
    status in ('REQUESTED','ACCEPTED','PARTIALLY_ACCEPTED','REJECTED','CANCELLED','COMPLETED')
  ),
  offered_firetrucks smallint check (offered_firetrucks is null or offered_firetrucks >= 0),
  offered_personnel smallint check (offered_personnel is null or offered_personnel >= 0),
  response_note text check (response_note is null or char_length(response_note) <= 500),
  responded_by_user_id uuid references public.users(id) on delete restrict,
  requested_at timestamptz not null,
  responded_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null,
  check (requested_firetrucks > 0 or requested_personnel > 0),
  check (requester_municipality_id <> recipient_municipality_id),
  constraint intermunicipal_assistance_status_shape_check check (
    (status = 'REQUESTED'
      and offered_firetrucks is null and offered_personnel is null
      and responded_by_user_id is null and responded_at is null
      and completed_at is null)
    or (status = 'ACCEPTED'
      and offered_firetrucks = requested_firetrucks
      and offered_personnel = requested_personnel
      and responded_by_user_id is not null and responded_at is not null
      and completed_at is null)
    or (status = 'PARTIALLY_ACCEPTED'
      and offered_firetrucks between 0 and requested_firetrucks
      and offered_personnel between 0 and requested_personnel
      and offered_firetrucks + offered_personnel > 0
      and (offered_firetrucks < requested_firetrucks or offered_personnel < requested_personnel)
      and responded_by_user_id is not null and responded_at is not null
      and completed_at is null)
    or (status = 'REJECTED'
      and offered_firetrucks = 0 and offered_personnel = 0
      and responded_by_user_id is not null and responded_at is not null
      and completed_at is null)
    or (status = 'CANCELLED'
      and offered_firetrucks is null and offered_personnel is null
      and responded_by_user_id is null and responded_at is null
      and completed_at is null)
    or (status = 'COMPLETED'
      and offered_firetrucks between 0 and requested_firetrucks
      and offered_personnel between 0 and requested_personnel
      and offered_firetrucks + offered_personnel > 0
      and responded_by_user_id is not null and responded_at is not null
      and completed_at is not null)
  )
);

create unique index if not exists intermunicipal_assistance_one_open_recipient_idx
  on public.intermunicipal_assistance_requests (dispatch_id, recipient_municipality_id)
  where status in ('REQUESTED','ACCEPTED','PARTIALLY_ACCEPTED');
create index if not exists intermunicipal_assistance_origin_idx
  on public.intermunicipal_assistance_requests (requester_municipality_id, requested_at desc);
create index if not exists intermunicipal_assistance_recipient_idx
  on public.intermunicipal_assistance_requests (recipient_municipality_id, requested_at desc);

create table if not exists public.intermunicipal_coordination_events (
  id uuid primary key,
  fire_report_id uuid not null references public.fire_reports(id) on delete restrict,
  dispatch_id uuid not null references public.incident_dispatches(id) on delete restrict,
  assistance_request_id uuid references public.intermunicipal_assistance_requests(id) on delete restrict,
  actor_user_id uuid references public.users(id) on delete restrict,
  origin_municipality_id uuid not null references public.municipalities(id) on delete restrict,
  recipient_municipality_id uuid references public.municipalities(id) on delete restrict,
  event_type text not null check (
    event_type in (
      'OBSERVERS_SELECTED','OBSERVER_ALERT_ACKNOWLEDGED','SELECTION_DEGRADED','ASSISTANCE_REQUESTED',
      'ASSISTANCE_ACCEPTED','ASSISTANCE_PARTIALLY_ACCEPTED','ASSISTANCE_REJECTED',
      'ASSISTANCE_CANCELLED','ASSISTANCE_COMPLETED','OBSERVER_ACCESS_ENDED'
    )
  ),
  old_status text,
  new_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null
);

create index if not exists intermunicipal_coordination_events_report_idx
  on public.intermunicipal_coordination_events (fire_report_id, created_at desc);
create index if not exists intermunicipal_coordination_events_created_idx
  on public.intermunicipal_coordination_events (created_at desc);

alter table public.incident_municipal_observers enable row level security;
alter table public.intermunicipal_assistance_requests enable row level security;
alter table public.intermunicipal_coordination_events enable row level security;

revoke all on table public.incident_municipal_observers from public, anon, authenticated;
revoke all on table public.intermunicipal_assistance_requests from public, anon, authenticated;
revoke all on table public.intermunicipal_coordination_events from public, anon, authenticated;

create or replace function public.prevent_intermunicipal_coordination_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'intermunicipal coordination events are immutable';
end;
$$;

revoke all on function public.prevent_intermunicipal_coordination_event_mutation()
  from public, anon, authenticated;

drop trigger if exists prevent_intermunicipal_coordination_event_mutation
  on public.intermunicipal_coordination_events;
create trigger prevent_intermunicipal_coordination_event_mutation
before update or delete on public.intermunicipal_coordination_events
for each row execute function public.prevent_intermunicipal_coordination_event_mutation();

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
      'ASSISTANCE_CANCELLED','ASSISTANCE_COMPLETED','NEARBY_SELECTION_DEGRADED'
    )
  );
