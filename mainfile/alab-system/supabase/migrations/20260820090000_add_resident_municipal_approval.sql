-- Municipality-scoped resident identity review. Existing ACTIVE residents are
-- intentionally grandfathered; only new applications enter PENDING_REVIEW.

alter table public.users drop constraint if exists users_account_status_check;
alter table public.users add constraint users_account_status_check
  check (account_status in ('PENDING_REVIEW', 'ACTIVE', 'SUSPENDED'));

update public.resident_verifications
set status = 'CHANGES_REQUESTED'
where status = 'REJECTED';

alter table public.resident_verifications drop constraint if exists resident_verifications_status_check;
alter table public.resident_verifications add constraint resident_verifications_status_check
  check (status in ('PENDING', 'VERIFIED', 'CHANGES_REQUESTED'));

alter table public.resident_verifications
  add column if not exists application_reference text,
  add column if not exists submission_number integer not null default 1,
  add column if not exists front_review_document_key text,
  add column if not exists back_review_document_key text,
  add column if not exists front_document_sha256 text,
  add column if not exists back_document_sha256 text,
  add column if not exists selfie_sha256 text,
  add column if not exists front_document_mime_type text,
  add column if not exists back_document_mime_type text,
  add column if not exists selfie_mime_type text,
  add column if not exists front_document_size_bytes integer,
  add column if not exists back_document_size_bytes integer,
  add column if not exists selfie_size_bytes integer,
  add column if not exists submitted_at timestamptz not null default now();

update public.resident_verifications
set application_reference = 'ALAB-APP-' || upper(substr(replace(id::text, '-', ''), 1, 10))
where application_reference is null;

alter table public.resident_verifications
  alter column application_reference set not null;

create unique index if not exists resident_verifications_application_reference_key
  on public.resident_verifications (application_reference);

create index if not exists resident_verifications_review_queue_idx
  on public.resident_verifications (status, submitted_at desc)
  where status in ('PENDING', 'CHANGES_REQUESTED');

create index if not exists resident_verifications_reviewer_idx
  on public.resident_verifications (reviewed_by_user_id)
  where reviewed_by_user_id is not null;

create index if not exists resident_addresses_municipality_primary_idx
  on public.resident_addresses (municipality_id, resident_profile_id)
  where is_primary;

create table public.resident_verification_events (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.resident_verifications(id) on delete restrict,
  resident_profile_id uuid not null references public.resident_profiles(id) on delete restrict,
  actor_user_id uuid references public.users(id) on delete set null,
  event_type text not null check (event_type in ('SUBMITTED', 'APPROVED', 'CHANGES_REQUESTED', 'RESUBMITTED')),
  notes text check (notes is null or char_length(notes) <= 1000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index resident_verification_events_verification_created_idx
  on public.resident_verification_events (verification_id, created_at desc);
create index resident_verification_events_profile_created_idx
  on public.resident_verification_events (resident_profile_id, created_at desc);
create index resident_verification_events_actor_idx
  on public.resident_verification_events (actor_user_id)
  where actor_user_id is not null;

alter table public.resident_verification_events enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resident-identity-evidence',
  'resident-identity-evidence',
  false,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
