-- One durable alert per episode of three or more canonical active incidents.
create table if not exists public.provincial_barangay_alerts (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  barangay_id uuid not null references public.barangays(id) on delete restrict,
  incident_ids uuid[] not null check (cardinality(incident_ids) >= 3),
  opened_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  acknowledged_at timestamptz,
  acknowledged_by_user_id uuid references public.users(id) on delete set null
);

create unique index if not exists provincial_barangay_alerts_open_idx
  on public.provincial_barangay_alerts (municipality_id, barangay_id)
  where closed_at is null;
create index if not exists fire_reports_barangay_coordination_idx
  on public.fire_reports (municipality_id, barangay_id, id)
  where duplicate_of_report_id is null and barangay_id is not null
    and status not in ('RESOLVED','CLOSED','REJECTED','FALSE_REPORT','DUPLICATE');

alter table public.provincial_barangay_alerts enable row level security;
revoke all on public.provincial_barangay_alerts from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.provincial_barangay_alerts from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.provincial_barangay_alerts from authenticated;
  end if;
end $$;
