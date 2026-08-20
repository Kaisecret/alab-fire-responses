create table public.account_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.users(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  event_type text not null check (event_type in (
    'FIRE_REPORT_CREATED',
    'FIRE_RESPONSE_STARTED',
    'RESIDENT_APPLICATION_SUBMITTED',
    'RESIDENT_APPLICATION_RESUBMITTED',
    'RESIDENT_APPLICATION_APPROVED',
    'RESIDENT_APPLICATION_CHANGES_REQUESTED',
    'MUNICIPAL_ACCOUNT_CREATED'
  )),
  category text not null check (category in ('INCIDENT', 'APPLICATION', 'RESPONSE', 'ACCOUNT', 'SYSTEM')),
  title text not null check (char_length(title) between 1 and 120),
  summary text not null check (char_length(summary) between 1 and 240),
  action_href text check (action_href is null or (char_length(action_href) <= 300 and action_href like '/%')),
  entity_type text check (entity_type is null or char_length(entity_type) <= 50),
  entity_id uuid,
  context jsonb not null default '{}'::jsonb check (jsonb_typeof(context) = 'object'),
  dedupe_key text check (dedupe_key is null or char_length(dedupe_key) <= 180),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index account_notifications_recipient_created_idx
  on public.account_notifications (recipient_user_id, created_at desc);

create index account_notifications_recipient_unread_idx
  on public.account_notifications (recipient_user_id, created_at desc)
  where read_at is null;

create unique index account_notifications_recipient_dedupe_key
  on public.account_notifications (recipient_user_id, dedupe_key)
  where dedupe_key is not null;

alter table public.account_notifications enable row level security;

comment on table public.account_notifications is
  'Server-owned in-app notifications for ALAB custom authenticated accounts.';
