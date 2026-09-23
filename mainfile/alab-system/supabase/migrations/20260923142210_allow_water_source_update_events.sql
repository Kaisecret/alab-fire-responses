alter table public.water_source_events
  drop constraint if exists water_source_events_action_check;

alter table public.water_source_events
  add constraint water_source_events_action_check
  check (action in (
    'CREATED',
    'MUNICIPAL_UPDATED',
    'PROVINCIAL_COORDINATES_UPDATED'
  ));
