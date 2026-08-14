-- Individual Provincial and Municipal BFP identities.  The application accesses
-- these tables only through its server-side PostgreSQL client; no Data API grant
-- is added here.

alter table public.municipalities
  add column if not exists psgc_code text;

create unique index if not exists municipalities_psgc_code_key
  on public.municipalities (psgc_code)
  where psgc_code is not null;

alter table public.users
  alter column username drop not null,
  alter column phone drop not null,
  alter column terms_accepted_at drop not null;

alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check
  check (role in ('RESIDENT', 'PROVINCIAL_BFP', 'MUNICIPAL_BFP'));

alter table public.users drop constraint if exists users_role_required_fields_check;
alter table public.users add constraint users_role_required_fields_check check (
  (role = 'RESIDENT' and username is not null and phone is not null and terms_accepted_at is not null)
  or (role in ('PROVINCIAL_BFP', 'MUNICIPAL_BFP') and username is null and phone is null)
);

create table public.bfp_personnel_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete restrict,
  display_name text not null check (char_length(display_name) between 2 and 100),
  rank_or_position text check (char_length(rank_or_position) <= 100),
  must_change_password boolean not null default true,
  created_by_user_id uuid references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bfp_municipality_assignments (
  id uuid primary key default gen_random_uuid(),
  personnel_profile_id uuid not null unique references public.bfp_personnel_profiles(id) on delete restrict,
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  assignment_role text not null check (assignment_role in ('MUNICIPAL_ADMIN', 'MUNICIPAL_STAFF')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED')),
  issued_by_user_id uuid references public.users(id) on delete restrict,
  issued_at timestamptz not null default now(),
  revoked_by_user_id uuid references public.users(id) on delete restrict,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'ACTIVE' and revoked_at is null) or (status = 'REVOKED' and revoked_at is not null))
);

create unique index bfp_municipality_assignments_one_active_admin_idx
  on public.bfp_municipality_assignments (municipality_id)
  where assignment_role = 'MUNICIPAL_ADMIN' and status = 'ACTIVE';

create index bfp_municipality_assignments_municipality_status_idx
  on public.bfp_municipality_assignments (municipality_id, status);

create table public.bfp_credential_events (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.users(id) on delete restrict,
  actor_user_id uuid references public.users(id) on delete restrict,
  event_type text not null check (event_type in ('ACCOUNT_ISSUED', 'PASSWORD_CHANGED', 'PASSWORD_RESET', 'ROLE_CHANGED', 'SUSPENDED', 'REACTIVATED', 'ASSIGNMENT_REVOKED')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index bfp_credential_events_target_created_idx
  on public.bfp_credential_events (target_user_id, created_at desc);

alter table public.bfp_personnel_profiles enable row level security;
alter table public.bfp_municipality_assignments enable row level security;
alter table public.bfp_credential_events enable row level security;

-- Philippine Standard Geographic Code values for the 18 municipalities of Antique.
insert into public.municipalities (name, province, psgc_code)
values
  ('Anini-y', 'Antique', '0600601000'),
  ('Barbaza', 'Antique', '0600602000'),
  ('Belison', 'Antique', '0600603000'),
  ('Bugasong', 'Antique', '0600604000'),
  ('Caluya', 'Antique', '0600605000'),
  ('Culasi', 'Antique', '0600606000'),
  ('Tobias Fornier', 'Antique', '0600607000'),
  ('Hamtic', 'Antique', '0600608000'),
  ('Laua-an', 'Antique', '0600609000'),
  ('Libertad', 'Antique', '0600610000'),
  ('Pandan', 'Antique', '0600611000'),
  ('Patnongon', 'Antique', '0600612000'),
  ('San Jose de Buenavista', 'Antique', '0600613000'),
  ('San Remigio', 'Antique', '0600614000'),
  ('Sebaste', 'Antique', '0600615000'),
  ('Sibalom', 'Antique', '0600616000'),
  ('Tibiao', 'Antique', '0600617000'),
  ('Valderrama', 'Antique', '0600618000')
on conflict (name) do update
  set province = excluded.province,
      psgc_code = excluded.psgc_code,
      updated_at = now();
