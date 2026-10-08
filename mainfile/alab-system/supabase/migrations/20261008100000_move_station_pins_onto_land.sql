-- Several station and municipal seat pins sat in the sea or in another town:
--   * Laua-an, Patnongon, Sebaste and Tobias Fornier stations were offshore.
--   * The Anini-y station kept the Stations page's old default point, which is
--     in San Jose de Buenavista.
--   * The Anini-y, Laua-an, Patnongon, Sebaste and Tobias Fornier seats were
--     offshore, the Tibiao and Valderrama seats were in the neighbouring town,
--     and San Remigio had no seat.
-- New positions come from OpenStreetMap: the mapped fire station where one
-- exists (Caluya, Laua-an), otherwise the town centre. Each point was checked
-- against the PSA 2023 barangay boundaries to fall inside its own town.
-- Only rows still at the wrong point move, so a corrected position is kept.

with moves(municipality_name, station_key, from_latitude, from_longitude, to_latitude, to_longitude) as (
  values
    ('Caluya', 'caluya', 11.934000, 121.548000, 11.931066, 121.548008),
    ('Laua-an', 'laua-an', 10.986100, 122.025000, 11.143026, 122.041484),
    ('Patnongon', 'patnongon', 10.910600, 121.978100, 10.914371, 121.995340),
    ('Sebaste', 'sebaste', 11.567800, 122.071900, 11.589690, 122.095859),
    ('Tobias Fornier', 'tobias fornier', 10.517800, 121.933100, 10.516262, 121.945127),
    ('Anini-y', 'anini-y', 10.744200, 121.942200, 10.431129, 121.926053)
)
update public.municipal_bfp_stations station
   set latitude = moves.to_latitude,
       longitude = moves.to_longitude,
       updated_at = now()
  from moves
  join public.municipalities municipality
    on municipality.name = moves.municipality_name
   and municipality.province = 'Antique'
 where station.municipality_id = municipality.id
   and lower(station.station_name) like moves.station_key || '%'
   and station.latitude = moves.from_latitude
   and station.longitude = moves.from_longitude;

with seats(municipality_name, from_latitude, from_longitude, to_latitude, to_longitude) as (
  values
    ('Anini-y', 10.433100, 121.912800, 10.431129, 121.926053),
    ('Laua-an', 10.986100, 122.025000, 11.142951, 122.041603),
    ('Patnongon', 10.910600, 121.978100, 10.914371, 121.995340),
    ('Sebaste', 11.567800, 122.071900, 11.589690, 122.095859),
    ('Tobias Fornier', 10.517800, 121.933100, 10.516262, 121.945127),
    ('Tibiao', 11.116700, 122.083300, 11.288628, 122.034262),
    ('Valderrama', 11.316700, 122.083300, 11.001852, 122.129408)
)
update public.municipalities municipality
   set latitude = seats.to_latitude,
       longitude = seats.to_longitude,
       updated_at = now()
  from seats
 where municipality.name = seats.municipality_name
   and municipality.province = 'Antique'
   and municipality.latitude = seats.from_latitude
   and municipality.longitude = seats.from_longitude;

update public.municipalities
   set latitude = 10.831508,
       longitude = 122.088704,
       updated_at = now()
 where name = 'San Remigio'
   and province = 'Antique'
   and latitude is null
   and longitude is null;

comment on column public.municipal_bfp_stations.longitude is
  'Station position (WGS84). Release 20261008100000 moved offshore and misplaced station pins onto land in their own towns.';
