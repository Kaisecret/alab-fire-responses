-- A Provincial alarm is a command, not an optional municipal request.
-- Store that fact on the request itself so it exists atomically when the
-- request becomes visible, even before its historical summons row is written.

alter table public.intermunicipal_assistance_requests
  add column if not exists is_provincial_command boolean not null default false;

update public.intermunicipal_assistance_requests request
   set is_provincial_command = true
 where exists (
   select 1
     from public.incident_alarm_summons summons
    where summons.assistance_request_id = request.id
 );

-- Install the kind-aware uniqueness rule before reopening legacy commands.
-- A terminal old command and a newer open ordinary request can legitimately
-- coexist for the same recipient; the old untyped index would reject the
-- normalization below.
drop index if exists public.intermunicipal_assistance_one_open_recipient_idx;
create unique index intermunicipal_assistance_one_open_recipient_idx
  on public.intermunicipal_assistance_requests
  (dispatch_id, recipient_municipality_id, is_provincial_command)
  where status in ('REQUESTED','ACCEPTED','PARTIALLY_ACCEPTED');

-- Older releases allowed a summoned municipality to decline or offer only a
-- portion. Reopen those commands instead of preserving a cancellation that is
-- no longer legal. The append-only coordination events retain the original
-- response and actor for audit; the current request truth is again pending.
update public.intermunicipal_assistance_requests
   set status = 'REQUESTED',
       offered_firetrucks = null,
       offered_personnel = null,
       response_note = null,
       responded_by_user_id = null,
       responded_at = null,
       completed_at = null,
       updated_at = now()
 where is_provincial_command
   and not (
     status = 'REQUESTED'
     or (
       status in ('ACCEPTED', 'COMPLETED')
       and offered_firetrucks = requested_firetrucks
       and offered_personnel = requested_personnel
     )
   );

alter table public.intermunicipal_assistance_requests
  drop constraint if exists provincial_command_full_acceptance;

alter table public.intermunicipal_assistance_requests
  add constraint provincial_command_full_acceptance check (
    not is_provincial_command
    or status = 'REQUESTED'
    or (
      status in ('ACCEPTED', 'COMPLETED')
      and offered_firetrucks = requested_firetrucks
      and offered_personnel = requested_personnel
    )
  ) not valid;

alter table public.intermunicipal_assistance_requests
  validate constraint provincial_command_full_acceptance;

create or replace function public.preserve_provincial_assistance_command()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.is_provincial_command is distinct from new.is_provincial_command then
    raise exception 'Provincial assistance command classification is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists preserve_provincial_assistance_command
  on public.intermunicipal_assistance_requests;
create trigger preserve_provincial_assistance_command
before update on public.intermunicipal_assistance_requests
for each row execute function public.preserve_provincial_assistance_command();

create index if not exists intermunicipal_assistance_provincial_record_idx
  on public.intermunicipal_assistance_requests
  (recipient_municipality_id, requested_at desc)
  where is_provincial_command;
