-- Same-browser repeats grant status access without creating another fire report.
create table if not exists public.resident_fire_report_follows (
  fire_report_id uuid not null references public.fire_reports(id) on delete cascade,
  resident_profile_id uuid not null references public.resident_profiles(id) on delete cascade,
  reporting_device_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (fire_report_id, resident_profile_id)
);

create index if not exists resident_fire_report_follows_device_idx
  on public.resident_fire_report_follows (reporting_device_id, created_at desc);
create index if not exists resident_fire_report_follows_resident_idx
  on public.resident_fire_report_follows (resident_profile_id, fire_report_id);

-- Internal to the server, which checks the application's signed resident session.
alter table public.resident_fire_report_follows enable row level security;
revoke all on public.resident_fire_report_follows from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.resident_fire_report_follows from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.resident_fire_report_follows from authenticated;
  end if;
end $$;
