-- Fire truck inventory for the eighteen municipalities of Antique.
--
-- The provincial office keeps one sheet of every fire truck in the province:
-- the station that uses it, its make, water capacity, year model, when it was
-- acquired, and remarks such as "UNSERVICEABLE" or "BER (due to accident)".
-- This migration records that sheet, makes sure every municipality on it has
-- the stations it names, and gives the province an audit trail for trucks it
-- adds later. Municipal accounts can read their own trucks but cannot add them.

-- The sheet's CLASS column is the municipal income class.
alter table public.municipalities
  add column if not exists income_class text;

alter table public.municipalities
  drop constraint if exists municipalities_income_class_check;
alter table public.municipalities
  add constraint municipalities_income_class_check
  check (income_class is null or income_class in ('1st', '2nd', '3rd', '4th', '5th', '6th'));

comment on column public.municipalities.income_class is
  'Municipal income class, as listed on the provincial fire truck inventory.';

-- A truck belongs to one station, and that station must be in the truck's
-- municipality. The composite key lets the foreign key below enforce that.
alter table public.municipal_bfp_stations
  drop constraint if exists municipal_bfp_stations_id_municipality_key;
alter table public.municipal_bfp_stations
  add constraint municipal_bfp_stations_id_municipality_key unique (id, municipality_id);

create table public.fire_trucks (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  station_id uuid not null,
  make text not null constraint fire_trucks_make_check
    check (char_length(btrim(make)) between 2 and 120),
  capacity_gallons integer not null constraint fire_trucks_capacity_check
    check (capacity_gallons between 1 and 20000),
  manufactured_year smallint constraint fire_trucks_manufactured_year_check
    check (manufactured_year is null or manufactured_year between 1950 and 2100),
  -- The sheet records some dates to the day, some only to the month, and some
  -- with no year at all. acquired_on holds what is known (the first of the
  -- month when only the month is known); acquired_label keeps the sheet's text.
  acquired_on date,
  acquired_precision text constraint fire_trucks_acquired_precision_check
    check (acquired_precision is null or acquired_precision in ('DAY', 'MONTH')),
  acquired_label text constraint fire_trucks_acquired_label_check
    check (acquired_label is null or char_length(btrim(acquired_label)) between 1 and 40),
  operational_status text not null default 'SERVICEABLE' constraint fire_trucks_status_check
    check (operational_status in ('SERVICEABLE', 'UNSERVICEABLE', 'FOR_BER', 'BER')),
  ownership text not null default 'BFP' constraint fire_trucks_ownership_check
    check (ownership in ('BFP', 'LGU')),
  remarks text constraint fire_trucks_remarks_check
    check (remarks is null or char_length(remarks) <= 500),
  record_origin text not null constraint fire_trucks_record_origin_check
    check (record_origin in ('BFP_FIRETRUCK_INVENTORY', 'PROVINCIAL_ENTRY')),
  import_sequence smallint constraint fire_trucks_import_sequence_check
    check (
      (record_origin = 'BFP_FIRETRUCK_INVENTORY' and import_sequence is not null)
      or (record_origin = 'PROVINCIAL_ENTRY' and import_sequence is null)
    ),
  created_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fire_trucks_acquired_date_check
    check ((acquired_on is null) = (acquired_precision is null)),
  constraint fire_trucks_station_municipality_fkey
    foreign key (station_id, municipality_id)
    references public.municipal_bfp_stations (id, municipality_id)
    on delete restrict
);

create index fire_trucks_municipality_station_idx
  on public.fire_trucks (municipality_id, station_id, created_at);

create unique index fire_trucks_unique_import_sequence_idx
  on public.fire_trucks (record_origin, import_sequence)
  where record_origin = 'BFP_FIRETRUCK_INVENTORY';

alter table public.fire_trucks enable row level security;
revoke all on table public.fire_trucks from public, anon, authenticated;

create table public.fire_truck_events (
  id uuid primary key default gen_random_uuid(),
  fire_truck_id uuid not null references public.fire_trucks(id) on delete restrict,
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  actor_user_id uuid not null references public.users(id) on delete restrict,
  action text not null constraint fire_truck_events_action_check check (action in ('CREATED')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index fire_truck_events_truck_created_idx
  on public.fire_truck_events (fire_truck_id, created_at desc);

create or replace function public.prevent_fire_truck_event_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'fire truck audit events are immutable';
end;
$$;

create trigger prevent_fire_truck_event_mutation
before update or delete on public.fire_truck_events
for each row execute function public.prevent_fire_truck_event_mutation();

alter table public.fire_truck_events enable row level security;
revoke all on table public.fire_truck_events from public, anon, authenticated;

-- Each municipality's income class from the sheet, and its station's name.
create temporary table fire_truck_municipality_import (
  municipality_name text primary key,
  income_class text not null,
  station_name text not null,
  -- A known station position overrides the municipal seat.
  station_latitude numeric(9, 6),
  station_longitude numeric(9, 6),
  -- Used only when the municipality has no seat coordinates on file.
  seat_latitude numeric(9, 6) not null,
  seat_longitude numeric(9, 6) not null
);

insert into fire_truck_municipality_import values
  ('Anini-y', '4th', 'Anini-y Fire Station', null, null, 10.433100, 121.912800),
  ('Barbaza', '4th', 'Barbaza Fire Station', null, null, 11.191400, 122.044400),
  ('Belison', '5th', 'Belison Fire Station', null, null, 10.830600, 121.963100),
  ('Bugasong', '3rd', 'Bugasong Fire Station', null, null, 11.045300, 122.065800),
  ('Caluya', '1st', 'Caluya Fire Station', null, null, 11.943100, 121.472200),
  -- The BFP locator chart has a hydrant "in front of Culasi Fire Station".
  ('Culasi', '1st', 'Culasi Fire Station', 11.426361, 122.055141, 11.426100, 122.055600),
  ('Hamtic', '3rd', 'Hamtic Fire Station', null, null, 10.696900, 121.980300),
  ('Laua-an', '4th', 'Laua-an Fire Station', null, null, 10.986100, 122.025000),
  ('Libertad', '5th', 'Libertad Fire Station', null, null, 11.777800, 121.911100),
  ('Pandan', '2nd', 'Pandan Fire Station', null, null, 11.716700, 122.096900),
  ('Patnongon', '2nd', 'Patnongon Fire Station', null, null, 10.910600, 121.978100),
  ('San Jose de Buenavista', '1st', 'San Jose Fire Station', null, null, 10.743100, 121.939400),
  ('San Remigio', '1st', 'San Remigio Fire Station', null, null, 10.830300, 122.088750),
  ('Sebaste', '4th', 'Sebaste Fire Station', null, null, 11.567800, 122.071900),
  ('Sibalom', '1st', 'Sibalom Fire Station', null, null, 10.792200, 122.010300),
  -- These two positions are town-area proxies from the BFP hydrant chart,
  -- not surveyed fire-station coordinates; verify the buildings in the field.
  ('Tibiao', '4th', 'Tibiao Fire Station', 11.288560, 122.034570, 11.288560, 122.034570),
  ('Tobias Fornier', '4th', 'Tobias Fornier Fire Station', null, null, 10.517800, 121.933100),
  ('Valderrama', '4th', 'Valderrama Fire Station', 11.003720, 122.129710, 11.003720, 122.129710);

do $$
declare
  missing_names text;
begin
  select string_agg(imported.municipality_name, ', ' order by imported.municipality_name)
    into missing_names
    from fire_truck_municipality_import imported
   where not exists (
     select 1 from public.municipalities municipality
      where lower(municipality.name) = lower(imported.municipality_name)
        and municipality.province = 'Antique'
   );
  if missing_names is not null then
    raise exception 'Missing Antique municipalities for fire truck import: %', missing_names;
  end if;
end;
$$;

update public.municipalities municipality
   set income_class = imported.income_class,
       updated_at = now()
  from fire_truck_municipality_import imported
 where lower(municipality.name) = lower(imported.municipality_name)
   and municipality.province = 'Antique'
   and municipality.income_class is distinct from imported.income_class;

-- Add the named main station unless that municipality already has a matching
-- active station. An unrelated station in the same municipality is preserved.
insert into public.municipal_bfp_stations (municipality_id, station_name, latitude, longitude)
select municipality.id,
       imported.station_name,
       coalesce(imported.station_latitude, municipality.latitude, imported.seat_latitude),
       coalesce(imported.station_longitude, municipality.longitude, imported.seat_longitude)
  from fire_truck_municipality_import imported
  join public.municipalities municipality
    on lower(municipality.name) = lower(imported.municipality_name)
   and municipality.province = 'Antique'
 where not exists (
   select 1 from public.municipal_bfp_stations station
    where station.municipality_id = municipality.id
      and station.status = 'ACTIVE'
      and lower(station.station_name) like '%' || lower(split_part(imported.station_name, ' Fire Station', 1)) || '%'
      and lower(station.station_name) not like '%san angel%'
      and lower(station.station_name) not like '%dalipe%'
 );

-- San Jose de Buenavista also runs two fire sub-stations (FSS). Their positions
-- are the centre of the BFP-charted hydrants in each barangay, not a survey of
-- the building; correct them from the station directory once verified.
insert into public.municipal_bfp_stations (municipality_id, station_name, latitude, longitude)
select municipality.id, sub_station.station_name, sub_station.latitude, sub_station.longitude
  from (values
    ('San Angel Fire Sub-Station', 'san angel', 10.738800::numeric(9, 6), 121.950300::numeric(9, 6)),
    ('Dalipe Fire Sub-Station', 'dalipe', 10.756000::numeric(9, 6), 121.935500::numeric(9, 6))
  ) as sub_station(station_name, name_key, latitude, longitude)
  join public.municipalities municipality
    on lower(municipality.name) = 'san jose de buenavista'
   and municipality.province = 'Antique'
 where not exists (
   select 1 from public.municipal_bfp_stations station
    where station.municipality_id = municipality.id
      and station.status = 'ACTIVE'
      and lower(station.station_name) like '%' || sub_station.name_key || '%'
 );

-- The 29 trucks, row for row. make and acquired_label are copied from the
-- sheet as printed. Rows without remarks are recorded as serviceable.
create temporary table fire_truck_import (
  import_sequence smallint primary key,
  municipality_name text not null,
  station_key text not null check (station_key in ('MAIN', 'SAN_ANGEL', 'DALIPE')),
  make text not null,
  capacity_gallons integer not null,
  manufactured_year smallint,
  acquired_on date,
  acquired_precision text,
  acquired_label text,
  operational_status text not null,
  ownership text not null,
  remarks text
);

insert into fire_truck_import values
  (1, 'Anini-y', 'MAIN', 'Hino FT', 500, 2023, null, null, '23-Feb', 'SERVICEABLE', 'BFP', null),
  (2, 'Barbaza', 'MAIN', 'Mitsubishi Fire Truck', 500, 1990, '2019-04-01', 'DAY', '01-Apl-19', 'SERVICEABLE', 'BFP', null),
  (3, 'Barbaza', 'MAIN', 'Isuzu Fire Truck', 1000, 2023, '2023-12-18', 'DAY', '18-Dec-23', 'SERVICEABLE', 'BFP', null),
  (4, 'Belison', 'MAIN', 'Fuso Fighter Fire Truck', 500, null, '2000-02-01', 'MONTH', 'Feb-00', 'SERVICEABLE', 'BFP', null),
  (5, 'Bugasong', 'MAIN', 'Isuzu NQR 1,000 gals Pumper', 1000, null, null, null, '9-Dec', 'SERVICEABLE', 'BFP', null),
  (6, 'Caluya', 'MAIN', 'Isuzu NMR FT', 500, null, '2022-07-07', 'DAY', '7-Jul-22', 'SERVICEABLE', 'BFP', null),
  (7, 'Culasi', 'MAIN', 'Isuzu Morita Pumper', 1000, 1984, '1984-04-01', 'MONTH', 'Apr-84', 'SERVICEABLE', 'BFP', null),
  (8, 'Hamtic', 'MAIN', 'Jiangte/BFP Model 500', 500, 2015, '2016-02-01', 'DAY', '1-Feb-16', 'SERVICEABLE', 'BFP', null),
  (9, 'Hamtic', 'MAIN', 'Isuzu', 500, null, '2026-06-03', 'DAY', '3-Jun-26', 'SERVICEABLE', 'BFP', null),
  (10, 'Laua-an', 'MAIN', 'Isuzu Double Cab', 900, null, '1976-01-08', 'DAY', '8-Jan-76', 'SERVICEABLE', 'BFP', null),
  (11, 'Libertad', 'MAIN', 'ISUZU FVR34', 1000, null, '2020-06-03', 'DAY', '3-Jun-20', 'SERVICEABLE', 'BFP', null),
  (12, 'Pandan', 'MAIN', 'ISUZU FVR34', 1000, null, '2020-06-03', 'DAY', '3-Jun-20', 'SERVICEABLE', 'BFP', null),
  (13, 'Patnongon', 'MAIN', 'Jiangte/BFP Model 1000', 1000, null, '2015-10-01', 'MONTH', 'Oct-15', 'SERVICEABLE', 'BFP', null),
  (14, 'Patnongon', 'MAIN', 'Mitsubishi Tanker FT', 2500, null, '2022-11-01', 'MONTH', 'Nov-22', 'UNSERVICEABLE', 'BFP', 'UNSERVICEABLE (for general repair)'),
  (15, 'San Jose de Buenavista', 'MAIN', 'Mitsubishi Mini F/T', 900, null, null, null, '5-Jun', 'SERVICEABLE', 'LGU', 'LGU (not BFP)'),
  (16, 'San Jose de Buenavista', 'MAIN', 'Isuzu NQR 1,000 gals Pumper (Anos)', 1000, null, null, null, '8-Apr', 'SERVICEABLE', 'BFP', null),
  (17, 'San Jose de Buenavista', 'MAIN', 'Isuzu Morita Pumper', 1000, null, null, null, '16-Feb', 'FOR_BER', 'BFP', 'FOR BER (due to accident)'),
  (18, 'San Jose de Buenavista', 'SAN_ANGEL', 'Jiangte/BFP Model 500', 500, null, null, null, '16-Feb', 'SERVICEABLE', 'BFP', null),
  (19, 'San Jose de Buenavista', 'MAIN', 'Isuzu FVR34', 1000, null, '2020-07-29', 'DAY', '29-Jul-20', 'SERVICEABLE', 'BFP', null),
  (20, 'San Jose de Buenavista', 'DALIPE', 'Rosenbauer Fire Truck', 1000, null, null, null, '18-Jun', 'SERVICEABLE', 'BFP', null),
  (21, 'San Jose de Buenavista', 'DALIPE', 'Mitsubishi Tanker FT', 3700, null, null, null, '18-Feb', 'SERVICEABLE', 'BFP', null),
  (22, 'San Remigio', 'MAIN', 'Jiangte/BFP Model 1000', 1000, null, '2015-07-01', 'MONTH', 'Jul-15', 'SERVICEABLE', 'BFP', null),
  (23, 'Sebaste', 'MAIN', 'Jiangte/BFP Model 500', 500, null, '2016-02-01', 'MONTH', 'Feb-16', 'SERVICEABLE', 'BFP', null),
  (24, 'Sibalom', 'MAIN', 'FAW Fire Truck', 500, null, '2023-09-25', 'DAY', 'Sep 25 2023', 'SERVICEABLE', 'BFP', null),
  (25, 'Sibalom', 'MAIN', 'Isuzu Morita Pumper', 1000, null, '1985-04-01', 'MONTH', 'Apr-85', 'SERVICEABLE', 'BFP', null),
  (26, 'Sibalom', 'MAIN', 'Hyundai HMC Pumper', 1000, null, '2004-02-01', 'DAY', '1-Feb-04', 'BER', 'BFP', 'BER (due to accident)'),
  (27, 'Tibiao', 'MAIN', 'Hyundai D6BJ Pumper', 1000, null, '2003-10-23', 'DAY', '10/23/2003', 'SERVICEABLE', 'BFP', null),
  (28, 'Tobias Fornier', 'MAIN', 'Jiangte/BFP Model 500', 500, null, '2016-01-01', 'MONTH', 'Jan-16', 'SERVICEABLE', 'BFP', null),
  (29, 'Valderrama', 'MAIN', 'Isuzu NQR 1,000 gals Pumper', 1000, null, '2009-12-01', 'MONTH', 'Dec-09', 'SERVICEABLE', 'BFP', null);

insert into public.fire_trucks (
  municipality_id, station_id, make, capacity_gallons, manufactured_year,
  acquired_on, acquired_precision, acquired_label, operational_status,
  ownership, remarks, record_origin, import_sequence
)
select municipality.id,
       station.id,
       imported.make,
       imported.capacity_gallons,
       imported.manufactured_year,
       imported.acquired_on,
       imported.acquired_precision,
       imported.acquired_label,
       imported.operational_status,
       imported.ownership,
       imported.remarks,
       'BFP_FIRETRUCK_INVENTORY',
       imported.import_sequence
  from fire_truck_import imported
  join public.municipalities municipality
    on lower(municipality.name) = lower(imported.municipality_name)
   and municipality.province = 'Antique'
  cross join lateral (
    select candidate.id
      from public.municipal_bfp_stations candidate
     where candidate.municipality_id = municipality.id
       and candidate.status = 'ACTIVE'
       and case imported.station_key
             when 'SAN_ANGEL' then lower(candidate.station_name) like '%san angel%'
             when 'DALIPE' then lower(candidate.station_name) like '%dalipe%'
             else lower(candidate.station_name) like '%' ||
                    lower(case when imported.municipality_name = 'San Jose de Buenavista'
                      then 'San Jose' else imported.municipality_name end) || '%'
                  and lower(candidate.station_name) not like '%san angel%'
                  and lower(candidate.station_name) not like '%dalipe%'
           end
     order by (lower(candidate.station_name) like '%sub-station%'
               or lower(candidate.station_name) like '%substation%') asc,
              candidate.created_at asc,
              candidate.id asc
     limit 1
  ) station
on conflict do nothing;

do $$
declare
  imported_count integer;
begin
  select count(*) into imported_count
    from public.fire_trucks
   where record_origin = 'BFP_FIRETRUCK_INVENTORY';
  if imported_count <> 29 then
    raise exception 'Expected 29 inventory fire trucks, found %', imported_count;
  end if;
end;
$$;

drop table fire_truck_import;
drop table fire_truck_municipality_import;
