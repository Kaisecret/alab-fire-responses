-- Allow PROFILE_UPDATED in bfp_credential_events event_type check constraint
alter table public.bfp_credential_events drop constraint if exists bfp_credential_events_event_type_check;
alter table public.bfp_credential_events add constraint bfp_credential_events_event_type_check check (
  event_type in (
    'ACCOUNT_ISSUED', 'PASSWORD_CHANGED', 'PASSWORD_RESET', 'ROLE_CHANGED', 'SUSPENDED', 'REACTIVATED',
    'ASSIGNMENT_REVOKED', 'STATION_CREATED', 'STATION_UPDATED', 'STATION_DEACTIVATED',
    'STATION_ASSIGNED', 'STATION_TRANSFERRED', 'PROFILE_UPDATED'
  )
);
