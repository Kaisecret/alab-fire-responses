-- The initial schema escaped the optional leading plus twice, which rejected
-- normal Philippine phone numbers such as 09109975737.
alter table public.users
  drop constraint if exists users_phone_check;

alter table public.users
  add constraint users_phone_check
  check (phone ~ '^\+?[0-9]{10,15}$') not valid;

alter table public.users
  validate constraint users_phone_check;
