-- The province is alerted once a municipality has three or more active
-- reports, in any of its barangays. Three in one barangay are already three in
-- its municipality, so one alert per municipality replaces the per-barangay
-- alert and the same reports never ring twice.

-- Open per-barangay alerts end here and reopen per municipality on the next poll.
update public.provincial_barangay_alerts
   set closed_at = now(), updated_at = now()
 where closed_at is null;

-- Kept for the closed per-barangay history; municipality alerts leave it empty.
alter table public.provincial_barangay_alerts alter column barangay_id drop not null;

drop index if exists public.provincial_barangay_alerts_open_idx;
create unique index if not exists provincial_barangay_alerts_open_municipality_idx
  on public.provincial_barangay_alerts (municipality_id)
  where closed_at is null;

create index if not exists fire_reports_municipal_coordination_idx
  on public.fire_reports (municipality_id, id)
  where duplicate_of_report_id is null
    and status not in ('RESOLVED','CLOSED','REJECTED','FALSE_REPORT','DUPLICATE');
