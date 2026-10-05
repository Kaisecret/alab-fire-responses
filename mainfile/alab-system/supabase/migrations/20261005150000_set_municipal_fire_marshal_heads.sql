-- The BFP Antique roster of municipal fire marshals becomes the head of each
-- municipality's main fire station. A head is stored in the station name as
-- "<station> · Head: <rank name>", the form the Stations page writes and reads.
-- Sub-stations (for example May Bato, San Angel, Dalipe) keep their own heads.
--
-- The main station is the active station whose name carries the municipality's
-- station key, as the fire-truck inventory import matched it. When more than
-- one matches, "<key> Fire Station" wins, then the oldest.

with roster(municipality_name, station_key, head) as (
  values
    ('Anini-y', 'anini-y', 'SFO2 Constantine E Puno'),
    ('Barbaza', 'barbaza', 'SFO2 Zandro R Navarette'),
    ('Belison', 'belison', 'SFO3 Ramil B Escander'),
    ('Bugasong', 'bugasong', 'SFO3 Helger A Francisco'),
    ('Caluya', 'caluya', 'SFO3 Romel E Cagbay Jr.'),
    ('Culasi', 'culasi', 'FINSP Fatima B Hepertor'),
    ('Hamtic', 'hamtic', 'SFO4 Jose L Talidong Jr'),
    ('Laua-an', 'laua-an', 'SFO2 Felemar A Arricaya'),
    ('Libertad', 'libertad', 'SFO3 Michael O Crespo Jr'),
    ('Pandan', 'pandan', 'SFO3 John Randolph B Baria'),
    ('Patnongon', 'patnongon', 'SFO3 Ryan Vic V Jabile'),
    ('San Jose de Buenavista', 'san jose', 'FSINSP Macario I Montaña Jr'),
    ('San Remigio', 'san remigio', 'SFO3 Edwin F Cadiao'),
    ('Sebaste', 'sebaste', 'SFO2 Nelbert E Piogao Jr.'),
    ('Sibalom', 'sibalom', 'SFO3 Alfredo N Ortiaga Jr'),
    ('Tibiao', 'tibiao', 'SFO2 Ma. Rosario L Osal'),
    ('Tobias Fornier', 'tobias fornier', 'SFO3 Ardin Cyren T Tuante'),
    ('Valderrama', 'valderrama', 'SFO4 Gerardo R Clarito')
),
candidate as (
  select station.id,
         station.municipality_id,
         station.created_at,
         roster.station_key,
         roster.head,
         regexp_replace(station.station_name, '\s*(·\s*Head:|\(Head:|-\s*Head:).*$', '', 'i') as base_name
    from roster
    join public.municipalities municipality
      on lower(municipality.name) = lower(roster.municipality_name)
     and municipality.province = 'Antique'
    join public.municipal_bfp_stations station
      on station.municipality_id = municipality.id
   where station.status = 'ACTIVE'
),
main_station as (
  select distinct on (municipality_id) id, base_name, head
    from candidate
   where lower(base_name) like '%' || station_key || '%'
     and lower(base_name) not like '%sub-station%'
   order by municipality_id, (lower(base_name) = station_key || ' fire station') desc, created_at
)
update public.municipal_bfp_stations station
   set station_name = main_station.base_name || ' · Head: ' || main_station.head,
       updated_at = now()
  from main_station
 where station.id = main_station.id;

-- Also the deploy's record that this ran, so a head changed later on the
-- Stations page is never overwritten by a redeploy.
comment on table public.municipal_bfp_stations is
  'BFP stations per municipality. A station head is stored in station_name as "<station> · Head: <rank name>". Release 20261005150000 set the municipal fire marshals as heads of the main stations.';
