create table public.resident_security_settings (
  resident_profile_id uuid not null unique references public.resident_profiles(id) on delete cascade,
  pin_hash text not null check (char_length(trim(pin_hash)) between 60 and 255),
  bfp_contact_allowed boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.resident_login_activity (
  id uuid primary key default gen_random_uuid(),
  resident_profile_id uuid not null references public.resident_profiles(id) on delete cascade,
  device_label text not null check (char_length(trim(device_label)) between 1 and 200),
  occurred_at timestamptz not null default now()
);

create index resident_login_activity_profile_occurred_idx
  on public.resident_login_activity (resident_profile_id, occurred_at desc);

alter table public.resident_security_settings enable row level security;
alter table public.resident_login_activity enable row level security;
