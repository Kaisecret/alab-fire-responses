-- Additive migration for projects where the resident approval migration was
-- already applied before selfie review watermarks were introduced.

alter table public.resident_verifications
  add column if not exists selfie_review_document_key text;
