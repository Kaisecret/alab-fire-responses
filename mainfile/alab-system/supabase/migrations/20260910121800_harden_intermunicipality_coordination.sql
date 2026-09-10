-- PostgreSQL CHECK permits NULL results: explicitly require both offered counts
-- for response states so the original shape constraint cannot be bypassed.
alter table public.intermunicipal_assistance_requests
  drop constraint if exists intermunicipal_assistance_response_offers_required;
alter table public.intermunicipal_assistance_requests
  add constraint intermunicipal_assistance_response_offers_required check (
    status not in ('ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED', 'COMPLETED')
    or (offered_firetrucks is not null and offered_personnel is not null)
  );

create unique index if not exists incident_dispatches_coordination_scope_key
  on public.incident_dispatches (id, fire_report_id, municipality_id);
alter table public.incident_municipal_observers
  drop constraint if exists incident_observers_dispatch_scope_fk;
alter table public.incident_municipal_observers
  add constraint incident_observers_dispatch_scope_fk
  foreign key (dispatch_id, fire_report_id, origin_municipality_id)
  references public.incident_dispatches (id, fire_report_id, municipality_id);

create unique index if not exists incident_observers_request_scope_key
  on public.incident_municipal_observers
  (id, fire_report_id, dispatch_id, origin_municipality_id, observer_municipality_id);
alter table public.intermunicipal_assistance_requests
  drop constraint if exists intermunicipal_assistance_observer_scope_fk;
alter table public.intermunicipal_assistance_requests
  add constraint intermunicipal_assistance_observer_scope_fk
  foreign key (observer_id, fire_report_id, dispatch_id, requester_municipality_id, recipient_municipality_id)
  references public.incident_municipal_observers
  (id, fire_report_id, dispatch_id, origin_municipality_id, observer_municipality_id);

create or replace function public.preserve_incident_observer_snapshot()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if row(new.id, new.fire_report_id, new.dispatch_id, new.origin_municipality_id,
         new.observer_municipality_id, new.nearest_station_id,
         new.station_latitude_snapshot, new.station_longitude_snapshot,
         new.distance_meters, new.selected_at)
     is distinct from
     row(old.id, old.fire_report_id, old.dispatch_id, old.origin_municipality_id,
         old.observer_municipality_id, old.nearest_station_id,
         old.station_latitude_snapshot, old.station_longitude_snapshot,
         old.distance_meters, old.selected_at) then
    raise exception 'incident observer selection snapshots are immutable';
  end if;
  if old.acknowledged_at is not null and
     row(new.acknowledged_at, new.acknowledged_by_user_id) is distinct from
     row(old.acknowledged_at, old.acknowledged_by_user_id) then
    raise exception 'incident observer acknowledgment is immutable';
  end if;
  return new;
end;
$$;

revoke all on function public.preserve_incident_observer_snapshot() from public, anon, authenticated;
drop trigger if exists preserve_incident_observer_snapshot on public.incident_municipal_observers;
create trigger preserve_incident_observer_snapshot
before update on public.incident_municipal_observers
for each row execute function public.preserve_incident_observer_snapshot();
