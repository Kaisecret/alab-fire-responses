-- Private profile photos for Municipal BFP personnel. The server also creates
-- this bucket on first use, so a signed-in user can update a photo without
-- waiting for a manual administrator setup step.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bfp-profile-photos',
  'bfp-profile-photos',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
