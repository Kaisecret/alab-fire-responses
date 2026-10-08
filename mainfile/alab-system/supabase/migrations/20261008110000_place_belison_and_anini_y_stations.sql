-- Belison Fire Station and the Belison seat sat in Barangay Sinaja. Move both
-- to Poblacion: the station to Belison Fire Station as mapped in OpenStreetMap,
-- the seat to Belison Municipal Hall.
-- Anini-y Fire Station moves beside the Parish of Saint John of Nepomucene in
-- Poblacion, about 18 m east of the church.
-- Each point was checked against the PSA 2023 barangay boundaries. Only rows
-- still at the earlier point move, so a corrected position is kept.

with moves(municipality_name, station_key, from_latitude, from_longitude, to_latitude, to_longitude) as (
  values
    ('Belison', 'belison', 10.830600, 121.963100, 10.837663, 121.960073),
    ('Anini-y', 'anini-y', 10.431129, 121.926053, 10.430900, 121.927140)
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

update public.municipalities
   set latitude = 10.838167,
       longitude = 121.959235,
       updated_at = now()
 where name = 'Belison'
   and province = 'Antique'
   and latitude = 10.830600
   and longitude = 121.963100;

comment on column public.municipalities.latitude is
  'Municipal seat (WGS84). Release 20261008110000 moved the Belison seat to the municipal hall in Poblacion.';
