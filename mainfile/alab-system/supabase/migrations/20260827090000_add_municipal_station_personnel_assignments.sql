-- Municipal BFP may operate multiple stations, with personnel assigned to one active station.
-- All application access remains through trusted server-side PostgreSQL clients.

alter table public.municipal_bfp_stations
  drop constraint if exists municipal_bfp_stations_municipality_id_key,
  add column if not exists status text not null default 'ACTIVE',
  add column if not exists deactivated_at timestamptz;

alter table public.municipal_bfp_stations
  drop constraint if exists municipal_bfp_stations_status_check;
alter table public.municipal_bfp_stations
  add constraint municipal_bfp_stations_status_check
  check ((status = 'ACTIVE' and deactivated_at is null) or (status = 'INACTIVE' and deactivated_at is not null));

create unique index if not exists municipal_bfp_stations_active_name_idx
  on public.municipal_bfp_stations (municipality_id, lower(station_name))
  where status = 'ACTIVE';

create index if not exists municipal_bfp_stations_municipality_status_idx
  on public.municipal_bfp_stations (municipality_id, status, created_at);

create table public.bfp_station_assignments (
  id uuid primary key default gen_random_uuid(),
  personnel_profile_id uuid not null references public.bfp_personnel_profiles(id) on delete restrict,
  station_id uuid not null references public.municipal_bfp_stations(id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED')),
  assigned_by_user_id uuid not null references public.users(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  revoked_by_user_id uuid references public.users(id) on delete restrict,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'ACTIVE' and revoked_at is null) or (status = 'REVOKED' and revoked_at is not null))
);

create unique index bfp_station_assignments_one_active_personnel_idx
  on public.bfp_station_assignments (personnel_profile_id)
  where status = 'ACTIVE';

create index bfp_station_assignments_station_status_idx
  on public.bfp_station_assignments (station_id, status);

alter table public.bfp_credential_events drop constraint if exists bfp_credential_events_event_type_check;
alter table public.bfp_credential_events add constraint bfp_credential_events_event_type_check check (
  event_type in (
    'ACCOUNT_ISSUED', 'PASSWORD_CHANGED', 'PASSWORD_RESET', 'ROLE_CHANGED', 'SUSPENDED', 'REACTIVATED',
    'ASSIGNMENT_REVOKED', 'STATION_CREATED', 'STATION_UPDATED', 'STATION_DEACTIVATED',
    'STATION_ASSIGNED', 'STATION_TRANSFERRED'
  )
);

alter table public.bfp_station_assignments enable row level security;

revoke all on table public.municipal_bfp_stations from anon, authenticated;
revoke all on table public.bfp_station_assignments from anon, authenticated;
