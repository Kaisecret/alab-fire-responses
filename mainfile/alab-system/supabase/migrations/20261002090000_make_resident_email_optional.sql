-- Residents may register without an email address; the phone number stays
-- required and verified. The unique index still prevents two accounts with
-- the same email, and allows any number of accounts without one.

alter table public.users
  alter column email drop not null;
