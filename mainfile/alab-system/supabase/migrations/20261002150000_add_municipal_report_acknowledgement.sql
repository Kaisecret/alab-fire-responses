-- When the origin station first acknowledged a new fire report. The emergency
-- alarm used to remember this only in one browser, so every sign-in on
-- another device (or after clearing the browser) sounded it again for reports
-- the station had already attended to.
alter table public.fire_reports
  add column if not exists municipal_acknowledged_at timestamptz,
  add column if not exists municipal_acknowledged_by_user_id uuid references public.users(id) on delete set null;
