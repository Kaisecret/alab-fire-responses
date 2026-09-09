create table if not exists public.resident_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.resident_verifications(id) on delete restrict,
  recipient_user_id uuid not null references public.users(id) on delete restrict,
  channel text not null check (channel in ('SMS', 'EMAIL')),
  destination text not null,
  template_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'SENT', 'FAILED')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  provider_message_id text,
  last_error text,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  dedupe_key text not null,
  unique (dedupe_key)
);

create index if not exists resident_notification_deliveries_pending_idx
  on public.resident_notification_deliveries (status, next_attempt_at, created_at)
  where status in ('PENDING', 'FAILED');

create index if not exists resident_notification_deliveries_verification_idx
  on public.resident_notification_deliveries (verification_id, created_at desc);

create index if not exists resident_notification_deliveries_recipient_idx
  on public.resident_notification_deliveries (recipient_user_id, created_at desc);

alter table public.resident_notification_deliveries enable row level security;
