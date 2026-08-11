create table public.registration_otps (
  id uuid primary key,
  phone text not null check (phone ~ '^639[0-9]{9}$'),
  payload jsonb not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempt_count integer not null default 0 check (attempt_count >= 0 and attempt_count <= 5),
  last_sent_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index registration_otps_phone_expires_at_idx
  on public.registration_otps (phone, expires_at desc);

alter table public.registration_otps enable row level security;
