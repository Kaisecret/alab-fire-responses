-- Resident emergency operations: status history, station coordinates, and response audit.
-- All application access remains through the server-side PostgreSQL client.

alter table public.fire_reports
  add column if not exists responding_bfp_user_id uuid references public.users(id) on delete set null,
  add column if not exists responding_station_name text,
  add column if not exists response_started_at timestamptz;

alter table public.fire_reports drop constraint if exists fire_reports_status_check;
alter table public.fire_reports add constraint fire_reports_status_check check (
  status in (
    'SUBMITTED', 'UNDER_VERIFICATION', 'CONFIRMED', 'REJECTED', 'FALSE_REPORT',
    'DUPLICATE', 'NEEDS_MORE_INFO', 'CLOSED', 'PENDING_VERIFICATION', 'VERIFIED',
    'RESPONDING', 'FIRETRUCK_DISPATCHED', 'RESPONDER_ARRIVED', 'UNDER_CONTROL', 'RESOLVED'
  )
);

create table if not exists public.fire_report_status_history (
  id uuid primary key default gen_random_uuid(),
  fire_report_id uuid not null references public.fire_reports(id) on delete restrict,
  previous_status text,
  next_status text not null,
  actor_user_id uuid references public.users(id) on delete set null,
  resident_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.municipal_bfp_stations (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null unique references public.municipalities(id) on delete restrict,
  station_name text not null check (char_length(trim(station_name)) between 2 and 160),
  latitude numeric(9, 6) not null check (latitude between 4 and 22),
  longitude numeric(9, 6) not null check (longitude between 116 and 127),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fire_reports_municipality_status_submitted_idx
  on public.fire_reports (municipality_id, status, submitted_at desc);
create index if not exists fire_report_status_history_report_created_idx
  on public.fire_report_status_history (fire_report_id, created_at asc);

alter table public.fire_report_status_history enable row level security;
alter table public.municipal_bfp_stations enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fire-report-photos', 'fire-report-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
