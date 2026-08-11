create extension if not exists pgcrypto;

create table public.municipalities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  province text not null default 'Antique',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.barangays (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (municipality_id, name)
);

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and char_length(email) <= 100),
  username text not null unique check (username ~ '^[A-Za-z0-9_.-]{3,30}$'),
  password_hash text not null,
  phone text not null unique check (phone ~ '^\+?[0-9]{10,15}$'),
  role text not null default 'RESIDENT' check (role in ('RESIDENT')),
  account_status text not null default 'ACTIVE' check (account_status in ('ACTIVE', 'SUSPENDED')),
  terms_accepted_at timestamptz not null,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resident_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete restrict,
  first_name text not null check (char_length(first_name) between 1 and 50),
  last_name text not null check (char_length(last_name) between 1 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resident_addresses (
  id uuid primary key default gen_random_uuid(),
  resident_profile_id uuid not null references public.resident_profiles(id) on delete restrict,
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  barangay_id uuid not null references public.barangays(id) on delete restrict,
  province text not null default 'Antique',
  sitio_or_purok text,
  complete_address text not null check (char_length(complete_address) between 1 and 200),
  nearby_landmark text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index resident_addresses_one_primary_idx
  on public.resident_addresses (resident_profile_id)
  where is_primary;

create table public.resident_verifications (
  id uuid primary key default gen_random_uuid(),
  resident_profile_id uuid not null references public.resident_profiles(id) on delete restrict,
  front_document_key text not null,
  back_document_key text,
  selfie_key text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'VERIFIED', 'REJECTED')),
  reviewed_by_user_id uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index resident_verifications_profile_updated_idx
  on public.resident_verifications (resident_profile_id, updated_at desc);

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  resident_profile_id uuid not null unique references public.resident_profiles(id) on delete restrict,
  push_enabled boolean not null default true,
  incident_updates_enabled boolean not null default true,
  emergency_alerts_enabled boolean not null default true,
  guide_updates_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fire_reports (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique,
  resident_profile_id uuid not null references public.resident_profiles(id) on delete restrict,
  reporter_name_snapshot text not null,
  reporter_phone_snapshot text not null,
  fire_type text not null check (fire_type in ('HOUSE_BUILDING', 'GRASS', 'FOREST', 'VEHICLE', 'OTHER')),
  description text not null,
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED', 'UNDER_VERIFICATION', 'CONFIRMED', 'REJECTED', 'FALSE_REPORT', 'DUPLICATE', 'NEEDS_MORE_INFO', 'CLOSED')),
  latitude numeric(9, 6) not null check (latitude between -90 and 90),
  longitude numeric(9, 6) not null check (longitude between -180 and 180),
  location_accuracy_meters numeric(10, 2),
  location_method text not null check (location_method in ('GPS', 'MANUAL_PIN')),
  location_quality text,
  is_within_antique boolean not null,
  municipality_id uuid references public.municipalities(id) on delete restrict,
  barangay_id uuid references public.barangays(id) on delete restrict,
  address_label text,
  nearest_landmark text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index fire_reports_resident_submitted_idx
  on public.fire_reports (resident_profile_id, submitted_at desc);
create index fire_reports_status_submitted_idx
  on public.fire_reports (status, submitted_at desc);
create index fire_reports_municipality_submitted_idx
  on public.fire_reports (municipality_id, submitted_at desc);

create table public.fire_report_photos (
  id uuid primary key default gen_random_uuid(),
  fire_report_id uuid not null references public.fire_reports(id) on delete restrict,
  storage_key text not null,
  original_file_name text not null,
  mime_type text not null,
  file_size_bytes integer not null check (file_size_bytes > 0),
  captured_at timestamptz,
  uploaded_at timestamptz not null default now()
);

create index fire_report_photos_report_idx on public.fire_report_photos (fire_report_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  resident_profile_id uuid not null references public.resident_profiles(id) on delete restrict,
  fire_report_id uuid references public.fire_reports(id) on delete set null,
  type text not null,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_profile_created_idx on public.notifications (resident_profile_id, created_at desc);

alter table public.users enable row level security;
alter table public.municipalities enable row level security;
alter table public.barangays enable row level security;
alter table public.resident_profiles enable row level security;
alter table public.resident_addresses enable row level security;
alter table public.resident_verifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.fire_reports enable row level security;
alter table public.fire_report_photos enable row level security;
alter table public.notifications enable row level security;

-- The existing application uses server-side pg queries and custom sessions.
-- Do not grant anon/authenticated Data API access until the Auth migration adds ownership policies.
