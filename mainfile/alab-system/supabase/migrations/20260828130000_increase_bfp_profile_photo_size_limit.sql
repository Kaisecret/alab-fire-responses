-- Existing production buckets keep their configuration after creation.
-- Raise the private BFP personnel profile-photo limit from 2 MB to 5 MB.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'bfp-profile-photos';
