-- Where each municipality is.
--
-- An alarm reaches municipalities by distance from the fire, and distance was
-- measured from their fire stations. A municipality with no station on file
-- therefore had no position, so it could never be reached: a second alarm in
-- Hamtic passed over San Jose entirely, not because San Jose was far but
-- because the system did not know where it was.
--
-- The seat of each municipality is a fixed fact about the province and does not
-- depend on which stations have been registered yet, so it is recorded here.
-- A station, once registered, is still preferred: it is where the trucks are.

alter table public.municipalities
  add column if not exists latitude numeric(9, 6) check (latitude is null or latitude between 4 and 22),
  add column if not exists longitude numeric(9, 6) check (longitude is null or longitude between 115 and 130);

comment on column public.municipalities.latitude is
  'Municipal seat. Used to reach a municipality by alarm when it has no station registered.';

-- The eighteen municipalities of Antique, by their poblacion.
update public.municipalities set latitude = 10.433100, longitude = 121.912800 where lower(name) like 'anini%'   and latitude is null;
update public.municipalities set latitude = 11.191400, longitude = 122.044400 where lower(name) = 'barbaza'     and latitude is null;
update public.municipalities set latitude = 10.830600, longitude = 121.963100 where lower(name) = 'belison'     and latitude is null;
update public.municipalities set latitude = 11.045300, longitude = 122.065800 where lower(name) = 'bugasong'    and latitude is null;
update public.municipalities set latitude = 11.943100, longitude = 121.472200 where lower(name) = 'caluya'      and latitude is null;
update public.municipalities set latitude = 11.426100, longitude = 122.055600 where lower(name) = 'culasi'      and latitude is null;
update public.municipalities set latitude = 10.846100, longitude = 121.998600 where lower(name) = 'dao'         and latitude is null;
update public.municipalities set latitude = 10.696900, longitude = 121.980300 where lower(name) = 'hamtic'      and latitude is null;
update public.municipalities set latitude = 10.986100, longitude = 122.025000 where lower(name) like 'laua%'    and latitude is null;
update public.municipalities set latitude = 11.777800, longitude = 121.911100 where lower(name) = 'libertad'    and latitude is null;
update public.municipalities set latitude = 11.716700, longitude = 122.096900 where lower(name) = 'pandan'      and latitude is null;
update public.municipalities set latitude = 10.910600, longitude = 121.978100 where lower(name) = 'patnongon'   and latitude is null;
update public.municipalities set latitude = 10.743100, longitude = 121.939400 where lower(name) like 'san jose%' and latitude is null;
update public.municipalities set latitude = 10.792200, longitude = 122.010300 where lower(name) = 'sibalom'     and latitude is null;
update public.municipalities set latitude = 11.567800, longitude = 122.071900 where lower(name) = 'sebaste'     and latitude is null;
update public.municipalities set latitude = 11.116700, longitude = 122.083300 where lower(name) = 'tibiao'      and latitude is null;
update public.municipalities set latitude = 10.517800, longitude = 121.933100 where lower(name) like 'tobias%'  and latitude is null;
update public.municipalities set latitude = 11.316700, longitude = 122.083300 where lower(name) = 'valderrama'  and latitude is null;

-- An observer row is what puts a nearby incident on a municipality's board, and
-- it named the station that would roll. A municipality summoned before it has
-- registered any station has no such station to name, and refusing the row
-- would keep the incident off its board entirely: the alarm would be recorded
-- as sent to a municipality that never saw it.
alter table public.incident_municipal_observers
  alter column nearest_station_id drop not null;
