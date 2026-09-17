-- Provincial acknowledgement of a forwarded backup request.
--
-- The municipality already has acknowledged_at, which silences its own popup
-- while the grace period keeps running. The province needs its own record:
-- reusing the municipal column would arrive pre-acknowledged whenever the
-- municipality had seen the request before forwarding it, and the provincial
-- alarm would never sound for exactly the requests that were escalated by hand.

alter table public.incident_backup_requests
  add column if not exists provincial_acknowledged_at timestamptz,
  add column if not exists provincial_acknowledged_by_user_id uuid
    references public.users(id) on delete set null;

-- Drives the provincial alarm poll: the unacknowledged forwarded requests.
create index if not exists incident_backup_requests_provincial_idx
  on public.incident_backup_requests (forwarded_at desc)
  where status = 'FORWARDED_PROVINCIAL' and provincial_acknowledged_at is null;
