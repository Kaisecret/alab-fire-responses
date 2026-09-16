-- Photographs attached to a backup request.
--
-- A responder calling for help can show what the scene looks like, so the
-- municipality deciding whether to forward, and the province deciding an alarm
-- level, are looking at the fire rather than reading about it.

create table if not exists public.incident_backup_request_photos (
  id uuid primary key default gen_random_uuid(),
  backup_request_id uuid not null
    references public.incident_backup_requests(id) on delete cascade,
  storage_key text not null,
  original_file_name text,
  mime_type text,
  file_size_bytes integer,
  uploaded_at timestamptz not null default now()
);

create index if not exists incident_backup_request_photos_request_idx
  on public.incident_backup_request_photos (backup_request_id, uploaded_at);

alter table public.incident_backup_request_photos enable row level security;
revoke all on table public.incident_backup_request_photos
  from public, anon, authenticated;
