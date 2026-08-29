-- Station-team emergency dispatch, responder lifecycle, and server-owned mobile push devices.
-- Access is exclusively through ALAB's trusted server-side PostgreSQL client.

create table public.incident_dispatches (
  id uuid primary key default gen_random_uuid(),
  fire_report_id uuid not null references public.fire_reports(id) on delete restrict,
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  dispatched_by_user_id uuid not null references public.users(id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'COMPLETED', 'CANCELLED')),
  dispatched_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'ACTIVE' and completed_at is null and cancelled_at is null)
    or (status = 'COMPLETED' and completed_at is not null and cancelled_at is null)
    or (status = 'CANCELLED' and cancelled_at is not null and completed_at is null)
  )
);

create unique index incident_dispatches_one_active_report_idx
  on public.incident_dispatches (fire_report_id)
  where status = 'ACTIVE';
create index incident_dispatches_municipality_status_dispatched_idx
  on public.incident_dispatches (municipality_id, status, dispatched_at desc);
create index incident_dispatches_actor_dispatched_idx
  on public.incident_dispatches (dispatched_by_user_id, dispatched_at desc);

create table public.incident_dispatch_stations (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null references public.incident_dispatches(id) on delete restrict,
  station_id uuid not null references public.municipal_bfp_stations(id) on delete restrict,
  station_name_snapshot text not null check (char_length(trim(station_name_snapshot)) between 2 and 160),
  station_latitude_snapshot numeric(9, 6) not null check (station_latitude_snapshot between 4 and 22),
  station_longitude_snapshot numeric(9, 6) not null check (station_longitude_snapshot between 116 and 127),
  created_at timestamptz not null default now(),
  unique (dispatch_id, station_id)
);

create index incident_dispatch_stations_station_idx
  on public.incident_dispatch_stations (station_id);

create table public.incident_dispatch_recipients (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null references public.incident_dispatches(id) on delete restrict,
  dispatch_station_id uuid not null references public.incident_dispatch_stations(id) on delete restrict,
  recipient_user_id uuid not null references public.users(id) on delete restrict,
  recipient_name_snapshot text not null check (char_length(trim(recipient_name_snapshot)) between 2 and 100),
  status text not null default 'ASSIGNED' check (status in ('ASSIGNED', 'ACKNOWLEDGED', 'EN_ROUTE', 'ON_SCENE', 'COMPLETED')),
  assigned_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  en_route_at timestamptz,
  on_scene_at timestamptz,
  completed_at timestamptz,
  arrival_candidate_started_at timestamptz,
  latest_latitude numeric(9, 6) check (latest_latitude between -90 and 90),
  latest_longitude numeric(9, 6) check (latest_longitude between -180 and 180),
  latest_location_at timestamptz,
  arrival_method text check (arrival_method in ('AUTO_GEOFENCE', 'MANUAL')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dispatch_id, recipient_user_id),
  check ((status in ('ASSIGNED', 'ACKNOWLEDGED') and en_route_at is null and on_scene_at is null) or status in ('EN_ROUTE', 'ON_SCENE', 'COMPLETED')),
  check (on_scene_at is null or en_route_at is not null),
  check (completed_at is null or on_scene_at is not null)
);

create index incident_dispatch_recipients_dispatch_status_idx
  on public.incident_dispatch_recipients (dispatch_id, status, assigned_at);
create index incident_dispatch_recipients_user_active_idx
  on public.incident_dispatch_recipients (recipient_user_id, assigned_at desc)
  where status <> 'COMPLETED';
create index incident_dispatch_recipients_station_status_idx
  on public.incident_dispatch_recipients (dispatch_station_id, status);

create table public.bfp_mobile_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  installation_id text not null check (char_length(trim(installation_id)) between 16 and 255),
  fcm_token text not null unique check (char_length(trim(fcm_token)) between 20 and 4096),
  platform text not null check (platform in ('ANDROID', 'IOS')),
  app_version text check (app_version is null or char_length(app_version) <= 60),
  push_enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, installation_id)
);

create index bfp_mobile_devices_user_active_idx
  on public.bfp_mobile_devices (user_id, last_seen_at desc)
  where revoked_at is null and push_enabled = true;

create table public.push_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  account_notification_id uuid not null references public.account_notifications(id) on delete cascade,
  device_id uuid not null references public.bfp_mobile_devices(id) on delete restrict,
  status text not null default 'PENDING' check (status in ('PENDING', 'SENT', 'FAILED', 'INVALID')),
  provider_message_id text,
  failure_code text,
  attempted_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_notification_id, device_id)
);

create index push_notification_deliveries_device_status_idx
  on public.push_notification_deliveries (device_id, status, created_at desc);
create index push_notification_deliveries_pending_idx
  on public.push_notification_deliveries (created_at)
  where status = 'PENDING';

alter table public.account_notifications
  drop constraint if exists account_notifications_event_type_check;
alter table public.account_notifications
  add constraint account_notifications_event_type_check check (event_type in (
    'FIRE_REPORT_CREATED', 'FIRE_RESPONSE_STARTED',
    'INCIDENT_DISPATCH_ASSIGNED', 'INCIDENT_DISPATCH_STATUS_CHANGED',
    'RESIDENT_APPLICATION_SUBMITTED', 'RESIDENT_APPLICATION_RESUBMITTED',
    'RESIDENT_APPLICATION_APPROVED', 'RESIDENT_APPLICATION_CHANGES_REQUESTED',
    'MUNICIPAL_ACCOUNT_CREATED'
  ));

alter table public.incident_dispatches enable row level security;
alter table public.incident_dispatch_stations enable row level security;
alter table public.incident_dispatch_recipients enable row level security;
alter table public.bfp_mobile_devices enable row level security;
alter table public.push_notification_deliveries enable row level security;

revoke all on table public.incident_dispatches from anon, authenticated;
revoke all on table public.incident_dispatch_stations from anon, authenticated;
revoke all on table public.incident_dispatch_recipients from anon, authenticated;
revoke all on table public.bfp_mobile_devices from anon, authenticated;
revoke all on table public.push_notification_deliveries from anon, authenticated;

comment on table public.incident_dispatches is
  'A Municipal Admin dispatch of one active fire report to one or more municipal stations.';
comment on table public.incident_dispatch_recipients is
  'One lifecycle row for each active BFP account at a station selected for an incident dispatch.';
comment on table public.bfp_mobile_devices is
  'Server-owned FCM device registrations for authenticated Municipal BFP accounts.';
