-- Reports of the same fire (within 50 m of an open incident) link to the first
-- report instead of opening a second incident. Additive only.

alter table public.fire_reports
  add column if not exists duplicate_of_report_id uuid
    references public.fire_reports(id) on delete set null;

create index if not exists fire_reports_duplicate_of_idx
  on public.fire_reports (duplicate_of_report_id)
  where duplicate_of_report_id is not null;

-- Open, unlinked reports are the only candidates when a new report arrives.
create index if not exists fire_reports_open_primary_idx
  on public.fire_reports (submitted_at desc, latitude, longitude)
  where duplicate_of_report_id is null
    and status not in ('RESOLVED', 'CLOSED', 'REJECTED', 'FALSE_REPORT', 'DUPLICATE');
