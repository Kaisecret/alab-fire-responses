-- Provincial Management: Cross-domain audit, idempotency, and operational records.

create table if not exists public.provincial_management_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.users(id) on delete restrict,
  target_type text not null check (
    target_type in ('STATION', 'PERSONNEL', 'RESIDENT', 'APPLICATION', 'MUNICIPALITY', 'FIRE_REPORT', 'EXPORT')
  ),
  target_id text not null,
  municipality_id uuid references public.municipalities(id) on delete restrict,
  action text not null,
  reason text check (reason is null or char_length(reason) <= 1000),
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists provincial_management_events_created_idx
  on public.provincial_management_events (created_at desc);
create index if not exists provincial_management_events_municipality_idx
  on public.provincial_management_events (municipality_id, created_at desc);
create index if not exists provincial_management_events_target_idx
  on public.provincial_management_events (target_type, target_id, created_at desc);
create index if not exists provincial_management_events_actor_idx
  on public.provincial_management_events (actor_user_id, created_at desc);

create table if not exists public.provincial_management_operations (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.users(id) on delete restrict,
  request_id text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  payload_digest text not null,
  result_status text not null,
  saved_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (actor_user_id, request_id)
);

create index if not exists provincial_management_operations_actor_req_idx
  on public.provincial_management_operations (actor_user_id, request_id);

alter table public.provincial_management_events enable row level security;
alter table public.provincial_management_operations enable row level security;

revoke all on table public.provincial_management_events from public, anon, authenticated;
revoke all on table public.provincial_management_operations from public, anon, authenticated;

create or replace function public.prevent_provincial_management_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'provincial management events are immutable';
end;
$$;

revoke all on function public.prevent_provincial_management_event_mutation()
  from public, anon, authenticated;

drop trigger if exists prevent_provincial_management_event_mutation
  on public.provincial_management_events;
create trigger prevent_provincial_management_event_mutation
before update or delete on public.provincial_management_events
for each row execute function public.prevent_provincial_management_event_mutation();
