-- What each alarm level actually summoned.
--
-- An alarm level was a number in a log: it recorded that the province had
-- declared a 2nd alarm, but not which municipality that reached. Mutual aid is
-- the whole point of declaring one, so who was called has to be part of the
-- record rather than something re-derived from today's station coordinates,
-- which move.

create table if not exists public.incident_alarm_summons (
  id uuid primary key default gen_random_uuid(),
  fire_report_id uuid not null references public.fire_reports(id) on delete cascade,
  alarm_level integer not null check (alarm_level between 1 and 4),
  -- The municipality that was called. Null for the origin's own first alarm,
  -- which summons nobody outside itself.
  summoned_municipality_id uuid references public.municipalities(id) on delete restrict,
  assistance_request_id uuid references public.intermunicipal_assistance_requests(id) on delete set null,
  -- Metres from the fire to that municipality's nearest station when it was
  -- called, kept so a later reader can see why it was chosen.
  distance_meters integer,
  created_at timestamptz not null default now(),
  -- One summons per municipality per incident: a 3rd alarm does not call again
  -- a municipality the 2nd alarm already reached.
  unique (fire_report_id, summoned_municipality_id)
);

create index if not exists incident_alarm_summons_report_idx
  on public.incident_alarm_summons (fire_report_id, alarm_level);

alter table public.incident_alarm_summons enable row level security;
revoke all on table public.incident_alarm_summons from public, anon, authenticated;
