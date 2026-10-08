-- Caluya's seat coordinate (11.9431, 121.4722) lies in open sea west of Caluya
-- Island, so the Caluya Fire Station pin sat in the water. Move the municipality
-- and its station to the town proper in Barangay Poblacion, the same point the
-- GIS maps use as Caluya's seat. Only rows still at the sea point move, so a
-- position corrected on the Stations page is kept.

update public.municipal_bfp_stations station
   set latitude = 11.934000,
       longitude = 121.548000,
       updated_at = now()
  from public.municipalities municipality
 where municipality.id = station.municipality_id
   and municipality.name = 'Caluya'
   and municipality.province = 'Antique'
   and station.latitude = 11.943100
   and station.longitude = 121.472200;

update public.municipalities
   set latitude = 11.934000,
       longitude = 121.548000,
       updated_at = now()
 where name = 'Caluya'
   and province = 'Antique'
   and latitude = 11.943100
   and longitude = 121.472200;

comment on column public.municipal_bfp_stations.latitude is
  'Station position (WGS84). Release 20261008090000 moved Caluya Fire Station from the sea onto Caluya Island.';
