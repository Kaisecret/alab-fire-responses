create table public.water_sources (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  source_kind text not null constraint water_sources_source_kind_check
    check (source_kind in ('FIRE_HYDRANT', 'WATER_SOURCE')),
  quantity integer not null default 1 constraint water_sources_quantity_check check (quantity > 0),
  exact_location text not null constraint water_sources_location_check
    check (char_length(btrim(exact_location)) between 2 and 500),
  latitude numeric(10,7) not null constraint water_sources_latitude_check check (latitude between 4 and 22),
  longitude numeric(10,7) not null constraint water_sources_longitude_check check (longitude between 116 and 127),
  type_color text not null constraint water_sources_type_color_check
    check (char_length(btrim(type_color)) between 2 and 120),
  record_origin text not null constraint water_sources_record_origin_check
    check (record_origin in ('BFP_LOCATOR_CHART_2018', 'MUNICIPAL_ENTRY')),
  created_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index water_sources_municipality_location_idx
  on public.water_sources (municipality_id, lower(exact_location), id);

create index water_sources_municipality_coordinates_idx
  on public.water_sources (municipality_id, latitude, longitude);

create unique index water_sources_unique_site_idx
  on public.water_sources (
    municipality_id,
    lower(exact_location),
    latitude,
    longitude,
    source_kind
  );

alter table public.water_sources enable row level security;
revoke all on table public.water_sources from public, anon, authenticated;

create table public.water_source_events (
  id uuid primary key default gen_random_uuid(),
  water_source_id uuid not null references public.water_sources(id) on delete restrict,
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  actor_user_id uuid not null references public.users(id) on delete restrict,
  action text not null constraint water_source_events_action_check check (action in ('CREATED')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index water_source_events_source_created_idx
  on public.water_source_events (water_source_id, created_at desc);

create or replace function public.prevent_water_source_event_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'water source audit events are immutable';
end;
$$;

create trigger prevent_water_source_event_mutation
before update or delete on public.water_source_events
for each row execute function public.prevent_water_source_event_mutation();

alter table public.water_source_events enable row level security;
revoke all on table public.water_source_events from public, anon, authenticated;

create temporary table water_source_import (
  municipality_name text not null,
  source_kind text not null,
  quantity integer not null,
  exact_location text not null,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  type_color text not null
) on commit drop;

insert into water_source_import
  (municipality_name, source_kind, quantity, exact_location, latitude, longitude, type_color)
values
  ('Anini-y', 'FIRE_HYDRANT', 1, 'Poblacion, Anini-y, Antique', 10.430886, 121.928014, 'Black'),
  ('Barbaza', 'FIRE_HYDRANT', 1, 'Brgy. Cubay, Barbaza, Antique (in front of Barbaza Multi Purpose Cooperative)', 11.198455, 122.041328, 'Blue or No Paint'),
  ('Barbaza', 'FIRE_HYDRANT', 1, 'Brgy. Cubay, Barbaza, Antique (in front of Pedro L. Gindap Municipal Hospital)', 11.203966, 122.042235, 'Blue or No Paint'),
  ('Barbaza', 'FIRE_HYDRANT', 1, 'Brgy. Binangbang, Barbaza, Antique (Crossing Binangbang)', 11.205425, 122.044475, 'Blue or No Paint'),
  ('Barbaza', 'FIRE_HYDRANT', 1, 'Condes St., Brgy. Jinalinan, Barbaza, Antique (near Farmer''s Supply)', 11.21876, 122.051102, 'Blue or No Paint'),
  ('Barbaza', 'FIRE_HYDRANT', 1, 'Brgy. Jinalinan, Barbaza, Antique (in front of Water District)', 11.221245, 122.053101, 'Blue or No Paint'),
  ('Belison', 'FIRE_HYDRANT', 1, 'Outside Poblacion Belison on National Road going to San Jose, Antique', 10.4955235, 121.5749154, 'Blue or No Paint'),
  ('Belison', 'FIRE_HYDRANT', 1, 'Left side of front gate of Belison Elementary School', 10.505219, 121.574628, 'Blue or No Paint'),
  ('Belison', 'FIRE_HYDRANT', 1, 'Right side of short bridge going to Brgy. Sinaja, Belison, Antique', 10.50211, 121.573956, 'Blue or No Paint'),
  ('Belison', 'FIRE_HYDRANT', 1, 'Magsaysay St., Belison, Antique', 10.509391, 121.574749, 'Blue or No Paint'),
  ('Belison', 'FIRE_HYDRANT', 1, 'Corner A. Bonifacio–Feliciana St., Belison, Antique', 10.5024209, 121.574807, 'Blue or No Paint'),
  ('Belison', 'FIRE_HYDRANT', 1, 'Corner Hernandez–Aguinaldo St., Belison, Antique', 10.5023571, 121.57417, 'Blue or No Paint'),
  ('Belison', 'FIRE_HYDRANT', 1, 'Corner Hernandez–Bajalan-Lancara St., Belison, Antique', 10.5024201, 121.573999, 'Blue or No Paint'),
  ('Belison', 'FIRE_HYDRANT', 1, 'Corner Regiminto–Hernandez St., Belison, Antique', 10.5024782, 121.573836, 'Blue or No Paint'),
  ('Belison', 'FIRE_HYDRANT', 1, 'Corner Placer–Bajalan-Lancara St., Belison, Antique', 10.5019335, 121.573877, 'Blue or No Paint'),
  ('Belison', 'FIRE_HYDRANT', 1, 'Corner Placer–Aguinaldo St., Belison, Antique', 10.5018834, 121.573979, 'Blue or No Paint'),
  ('Belison', 'FIRE_HYDRANT', 1, 'Corner National Road–Bajalan-Lancara St., Belison, Antique', 10.5010801, 121.573797, 'Blue or No Paint'),
  ('Belison', 'FIRE_HYDRANT', 1, 'National Road, Poblacion, Belison, Antique (in front of Belison Municipal Hall)', 10.5016633, 121.573492, 'Blue or No Paint'),
  ('Belison', 'FIRE_HYDRANT', 1, 'Corner Danao–Candelaria St., Belison, Antique', 10.5011882, 121.573301, 'Blue or No Paint'),
  ('Belison', 'FIRE_HYDRANT', 1, 'Corner Corta–Candelaria St., Belison, Antique', 10.5011979, 121.573266, 'Blue or No Paint'),
  ('Belison', 'FIRE_HYDRANT', 1, 'Corner Fornier–Candelaria St., Belison, Antique', 10.5013427, 121.572959, 'Blue or No Paint'),
  ('Belison', 'FIRE_HYDRANT', 1, 'Corner Montero–Fornier St., Belison, Antique', 10.5011573, 121.572339, 'Blue or No Paint'),
  ('Belison', 'FIRE_HYDRANT', 1, 'Corner Montero–Corta St., Belison, Antique', 10.507891, 121.573535, 'Blue or No Paint'),
  ('Belison', 'FIRE_HYDRANT', 1, 'Sitio Baybay, Candelaria St., Belison, Antique', 10.5018218, 121.571784, 'Blue or No Paint'),
  ('Belison', 'FIRE_HYDRANT', 1, 'Rizal St., Belison, Antique (right side near the ocean)', 10.5027853, 121.571982, 'Blue or No Paint'),
  ('Bugasong', 'FIRE_HYDRANT', 1, 'Brgy. Pojo, Bugasong, Antique (front of Dela Cruz Residence)', 11.0472945, 122.0665098, 'Yellow Paint'),
  ('Bugasong', 'FIRE_HYDRANT', 1, 'Rizal St. Ilaya, Bugasong, Antique (front of SJA)', 11.0435229, 122.0647916, 'Yellow Paint'),
  ('Caluya', 'FIRE_HYDRANT', 1, 'Crossing Cabitin, Brgy. Semirara, Caluya, Antique', 12.05727, 121.3844, 'Yellow'),
  ('Caluya', 'FIRE_HYDRANT', 1, 'In front of Semirara NHS, Brgy. Semirara, Caluya, Antique', 12.06884, 121.39492, 'Yellow'),
  ('Caluya', 'FIRE_HYDRANT', 1, 'In front of SEMCO, Brgy. Semirara, Caluya, Antique', 12.06408, 121.38988, 'Yellow'),
  ('Caluya', 'FIRE_HYDRANT', 1, 'In front of Caluya, Antique', 12.06416, 121.38897, 'Yellow'),
  ('Caluya', 'FIRE_HYDRANT', 1, 'In front of Sub-Office, Brgy. Semirara, Caluya, Antique', 12.06449, 121.38638, 'Yellow'),
  ('Caluya', 'FIRE_HYDRANT', 1, 'In front of DOC, Brgy. Semirara, Caluya, Antique', 12.06449, 121.38638, 'Yellow'),
  ('Culasi', 'FIRE_HYDRANT', 1, 'Poblacion Culasi, Antique (in front of Culasi Fire Station)', 11.426361, 122.055141, 'Wet Barrel'),
  ('Culasi', 'FIRE_HYDRANT', 1, 'Poblacion Culasi, Antique (in front of Culasi District Hospital)', 11.423874, 122.060988, 'Wet Barrel'),
  ('Culasi', 'FIRE_HYDRANT', 1, 'Poblacion Culasi, Antique, Culasi Public Market', 11.42562, 122.054025, 'Wet Barrel'),
  ('Culasi', 'FIRE_HYDRANT', 1, 'Poblacion Culasi, Antique (at the back of VMT Culasi)', 11.428953, 122.0575, 'Wet Barrel'),
  ('Culasi', 'FIRE_HYDRANT', 1, 'Poblacion Culasi, Antique (in front of YL Trading)', 11.4247, 122.055602, 'Wet Barrel'),
  ('Culasi', 'FIRE_HYDRANT', 1, 'Poblacion Culasi, Antique (in front of DES Marketing)', 11.424242, 122.055473, 'Wet Barrel'),
  ('Hamtic', 'FIRE_HYDRANT', 1, 'Poblacion 3, Hamtic, Antique (in back of ARC''s Pizza Hub)', 10.7013427, 121.9817124, 'Wet Barrel / 2\"'),
  ('Hamtic', 'FIRE_HYDRANT', 1, 'Poblacion 2, Hamtic, Antique (in front of Anteaues Bestea)', 10.7011186, 121.9817536, 'Wet Barrel / 2\"'),
  ('Libertad', 'FIRE_HYDRANT', 1, 'Brgy. Centro Weste, Libertad, Antique (Libertad Municipal Hall)', 11.769389, 121.918586, 'Yellow'),
  ('Libertad', 'FIRE_HYDRANT', 1, 'Brgy. Centro Weste, Libertad, Antique (Libertad Municipal Hall)', 11.769389, 121.918586, 'Yellow'),
  ('Pandan', 'FIRE_HYDRANT', 1, 'Pandan Peoples Park, Justice Calixto O. Zaldivar St., Brgy. Centro Norte, Pandan, Antique', 11.720649, 122.09593, 'Wet Barrel/Yellow'),
  ('Pandan', 'FIRE_HYDRANT', 1, 'Oriola St., Brgy. Centro Norte, Pandan, Antique', 11.72239, 122.094549, 'Wet Barrel/Blue'),
  ('Pandan', 'FIRE_HYDRANT', 1, 'Justice Calixto O. Zaldivar St., Brgy. Centro Norte, Pandan, Antique (beside M Lhuillier)', 11.719805, 122.093696, 'Wet Barrel/Yellow'),
  ('Pandan', 'FIRE_HYDRANT', 1, 'M Lhuillier, Justice Calixto O. Zaldivar St., Brgy. Centro Sur, Pandan, Antique', 11.719311, 122.094685, 'Wet Barrel/Yellow'),
  ('Pandan', 'FIRE_HYDRANT', 1, 'Brgy. Tingib, Pandan, Antique', 11.7390777, 122.0378556, 'Wet Barrel/Yellow'),
  ('Pandan', 'FIRE_HYDRANT', 1, 'Brgy. Patria, Pandan, Antique (Patria Elementary School)', 11.73949, 122.01615, 'Wet Barrel/Yellow'),
  ('Pandan', 'FIRE_HYDRANT', 1, 'Brgy. Mag-aba, Pandan, Antique (Mag-aba National Vocational School)', 11.74365, 122.058, 'Wet Barrel/Yellow'),
  ('Patnongon', 'FIRE_HYDRANT', 1, 'Real Street, Poblacion, Patnongon, Antique', 10.91519, 121.99565, 'Wet Barrel / Gray'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Maybato South, San Jose, Antique', 10.726852, 121.95871, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Maybato North (Brgy. Plaza)', 10.728565, 121.95588, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'San Angel, San Jose, Antique', 10.737778, 121.94889, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Malaiba-9, San Jose', 10.738958, 121.94803, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Malaiba-31, San Jose', 10.73938, 121.94629, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, '8-202 College in San Angel', 10.738505, 121.95165, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'SAC (Back of Stage), San Angel', 10.739148, 121.95024, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'SAC (Practicum Canteen)', 10.739053, 121.95051, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'SAC (Plaza), San Angel', 10.739043, 121.95039, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'SAC Gate Front', 10.739138, 121.95073, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Barangay 8 (Petron)', 10.741235, 121.94961, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Barangay 8-21', 10.743301, 121.9454, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Royalty Market, San Jose, Antique', 10.745304, 121.94282, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Allied Bank, Gov. Villavert St.', 10.745931, 121.94287, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Polonias, Brgy. 5, San Jose', 10.746231, 121.94323, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'ACC College, Ricarze St.', 10.746358, 121.94237, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'ATON Marketing, Gov. Villavert St.', 10.748319, 121.94194, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Front Encarnacion Compound, Brgy. 1', 10.749141, 121.94289, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Vergara Fruit Stand, San Jose', 10.745662, 121.94182, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Western Union/RCBC, T.A. Fornier St.', 10.744542, 121.9413, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Tibiao Drug Store, T.A. Fornier St.', 10.745283, 121.94139, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'CPT Market, T.A. Fornier St.', 10.745283, 121.94107, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Caltex, T.A. Fornier St.', 10.746189, 121.94141, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, '4-5 Marina', 10.741383, 121.94184, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'House Azurin, Marina, San Jose', 10.742163, 121.94004, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Gov. Capadocia School', 10.740687, 121.938, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Coast Guard, Brgy. 4', 10.741678, 121.93948, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, '3-2 Mohon End', 10.743617, 121.93722, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, '3-123 Mohon Centro', 10.743744, 121.9339, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'CarmenVille Subd.', 10.74484, 121.93813, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Madrangca-16', 10.747623, 121.93907, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Punta Madrangca', 10.74834, 121.93149, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Front Itik''s House, Madrangca', 10.748108, 121.93521, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Crossing Danilos Beach', 10.758374, 121.92755, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Kamea Beach Resort', 10.759618, 121.92482, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Near Jerry Rubite''s House, Madrangca', 10.745704, 121.93173, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Dalipe-33', 10.75985, 121.92838, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'D-50 Sunrise Subd.', 10.758501, 121.93143, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Sta. Isabel Subd., Dalipe', 10.759449, 121.93746, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Sta. Isabel, Dalipe', 10.765606, 121.93722, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Pinnacle, Dalipe', 10.75557, 121.93836, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, '2-107 (Crossing Nietes Avenue)', 10.754601, 121.93553, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Dalipe (San Fernando Terminal)', 10.755317, 121.93478, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Dalipe (San Remegio Terminal)', 10.755718, 121.93546, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Antique National School (front)', 10.751755, 121.941601, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Villa Erlinda, San Jose', 10.748972, 121.93778, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, '2-23 (Adelaide), Bantayan, San Jose', 10.750005, 121.94064, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, '2-21 (Back of Keds), Brgy. 1', 10.75011, 121.94357, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Kamanggahan, Brgy. 1', 10.750659, 121.9434, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Buenavista Lodge, Ababay', 10.755866, 121.94323, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Badiang (end), San Jose', 10.773699, 121.94629, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Badiang (way to ANTECO)', 10.761262, 121.943377, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Villa Trinidad, Dalipe', 10.768429, 121.94418, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Badiang (Purok 6)', 10.76923, 121.94492, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Ambok''s Resto, San Jose', 10.753031, 121.9417, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'ANS (front Norkis)', 10.751481, 121.94191, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Bureau of Equipment, San Jose', 10.752587, 121.939953, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'San Pedro, San Jose, Antique', 10.80442, 121.94845, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Mojon, San Jose', 10.786789, 121.94718, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Magcalon, San Jose', 10.78289, 121.94459, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'San Fernando, San Jose', 10.777831, 121.94288, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Madrangca, San Jose', 10.749936, 121.93103, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Gen. Fullon St., San Jose', 10.74309, 121.94444, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'Supa, San Jose', 10.767563, 121.96489, 'Wet Barrel'),
  ('San Jose de Buenavista', 'FIRE_HYDRANT', 1, 'DAS, UMS', 10.743696, 121.94262, 'Wet Barrel'),
  ('San Remigio', 'FIRE_HYDRANT', 1, 'Purok Masinulundon, Brgy. Calao-itan, San Remigio, Antique', 10.82524, 122.09188, 'Wet Barrel'),
  ('San Remigio', 'FIRE_HYDRANT', 1, 'Corner Emmanuel and Petinglay St., Brgy. Calao-itan, San Remigio, Antique', 10.82982, 122.09033, 'Wet Barrel'),
  ('San Remigio', 'FIRE_HYDRANT', 1, 'Cabrillos St., Brgy. Calao-itan, San Remigio, Antique', 10.83031, 122.08875, 'Wet Barrel'),
  ('San Remigio', 'FIRE_HYDRANT', 1, 'Brgy. Iguirindon, San Remigio, Antique', 10.83156, 122.09018, 'Wet Barrel'),
  ('San Remigio', 'FIRE_HYDRANT', 1, 'Petinglay St., Brgy. Calao-itan, San Remigio, Antique', 10.83172, 122.08754, 'Wet Barrel'),
  ('San Remigio', 'FIRE_HYDRANT', 1, 'Purok Makawiwili, Brgy. Calao-itan, San Remigio, Antique', 10.83131, 122.08324, 'Wet Barrel'),
  ('San Remigio', 'FIRE_HYDRANT', 1, 'Cabigunda St., Brgy. Calao-itan, San Remigio, Antique', 10.83309, 122.0879, 'Wet Barrel'),
  ('San Remigio', 'FIRE_HYDRANT', 1, 'Sitio Durog, Brgy. Iguirindon, San Remigio, Antique', 10.83675, 122.08625, 'Wet Barrel'),
  ('San Remigio', 'FIRE_HYDRANT', 1, 'Purok Nagahirugyon, Brgy. Calao-itan, San Remigio, Antique', 10.83338, 122.08659, 'Wet Barrel'),
  ('Sebaste', 'FIRE_HYDRANT', 1, 'Sebaste Public Market, Brgy. Poblacion, Sebaste, Antique', 11.59257, 122.09662, 'Wet Barrel/Red'),
  ('Sebaste', 'FIRE_HYDRANT', 1, 'Sebaste Municipal Hall, Brgy. Poblacion, Sebaste, Antique', 11.589483, 122.095717, 'Wet Barrel/Red'),
  ('Sebaste', 'FIRE_HYDRANT', 1, 'Sebaste Covered Gym, Brgy. Poblacion, Sebaste, Antique', 11.590796, 122.094076, 'Wet Barrel/Red'),
  ('Sebaste', 'FIRE_HYDRANT', 1, 'Bacalan Gym, Brgy. Bacalan, Sebaste, Antique', 11.54738, 122.0843, 'Wet Barrel/Red'),
  ('Sebaste', 'FIRE_HYDRANT', 1, 'Idio Gym, Brgy. Idio, Sebaste, Antique', 11.626163, 122.09827, 'Wet Barrel/Red'),
  ('Sibalom', 'FIRE_HYDRANT', 1, 'Corner Tordesillas–Fenete St., District III, Sibalom, Antique', 10.7897, 122.01742, 'Wet Barrel'),
  ('Sibalom', 'FIRE_HYDRANT', 1, 'Corner Tordesillas–Velegas St., District III, Sibalom, Antique', 10.78866, 122.01773, 'Dry Barrel'),
  ('Sibalom', 'FIRE_HYDRANT', 1, 'Corner Furio–Fenete St., District II, Sibalom, Antique', 10.78709, 122.01857, 'Wet Barrel'),
  ('Sibalom', 'FIRE_HYDRANT', 1, 'University of Antique Campus, Lobilla St., District I, Sibalom, Antique', 10.79043, 122.00974, 'Wet Barrel'),
  ('Sibalom', 'FIRE_HYDRANT', 1, 'Luna St., District IV, Sibalom, Antique (near Former Elementary School)', 10.790367, 122.0228842, 'Wet Barrel'),
  ('Sibalom', 'FIRE_HYDRANT', 1, 'National Road, Bongsod, Sibalom, Antique (corner of ABCI Alangan, Bongsod, Cubay Naputan Elementary School)', 10.797399, 121.9902054, 'Wet Barrel'),
  ('Sibalom', 'FIRE_HYDRANT', 1, 'National Road, Cubay Napultan, Sibalom, Antique (adjacent to 7/11 building)', 10.793999, 121.9905725, 'Wet Barrel'),
  ('Tibiao', 'FIRE_HYDRANT', 1, 'Poblacion, Tibiao (in front of Aglipay Church)', 11.2849791, 122.038992, 'Wet Barrel'),
  ('Tibiao', 'FIRE_HYDRANT', 1, 'Poblacion, Tibiao – Highway (in front of Petron Gas Station)', 11.2885603, 122.0345704, 'Wet Barrel'),
  ('Tibiao', 'FIRE_HYDRANT', 1, 'Poblacion, Tibiao (in front of DSWD Bldg.)', 11.2892833, 122.0341178, 'Wet Barrel'),
  ('Tobias Fornier', 'FIRE_HYDRANT', 1, 'Brgy. Poblacion Norte, Tobias Fornier, Antique (beside 7/11)', 10.51707, 121.945381, 'Wet Barrel/Yellow'),
  ('Tobias Fornier', 'FIRE_HYDRANT', 1, 'Brgy. Poblacion Sur, Tobias Fornier, Antique (beside Maria Labandera)', 10.512561, 121.946468, 'Wet Barrel/Yellow'),
  ('Tobias Fornier', 'FIRE_HYDRANT', 1, 'Brgy. Poblacion Sur, Tobias Fornier, Antique (in front of public market)', 10.510538, 121.946789, 'Wet Barrel/Yellow'),
  ('Tobias Fornier', 'FIRE_HYDRANT', 1, 'Brgy. Abaca, Tobias Fornier, Antique (in front of hospital)', 10.500806, 121.94853, 'Wet Barrel/Yellow'),
  ('Valderrama', 'FIRE_HYDRANT', 1, 'Valderrama Public Market, Brgy. Takas, Valderrama, Antique', 11.00121, 122.07466, 'No Paint'),
  ('Valderrama', 'FIRE_HYDRANT', 1, 'Valderrama Municipal Hall, Brgy. Ubos, Valderrama, Antique', 11.00372, 122.12971, 'No Paint'),
  ('Valderrama', 'FIRE_HYDRANT', 1, 'Valderrama Central Elementary School, Brgy. Ubos, Valderrama, Antique', 11.00473, 122.130089, 'No Paint'),
  ('Valderrama', 'FIRE_HYDRANT', 1, 'Cor. Roquero and Legaspi St., Brgy. Ubos, Valderrama, Antique', 11.000974, 122.12417, 'No Paint');

do $$
declare
  missing_names text;
begin
  select string_agg(distinct imported.municipality_name, ', ' order by imported.municipality_name)
  into missing_names
  from water_source_import imported
  where not exists (
    select 1
    from public.municipalities municipality
    where lower(municipality.name) = lower(imported.municipality_name)
      and municipality.province = 'Antique'
  );

  if missing_names is not null then
    raise exception 'Missing Antique municipalities for water-source import: %', missing_names;
  end if;
end;
$$;

insert into public.water_sources (
  municipality_id,
  source_kind,
  quantity,
  exact_location,
  latitude,
  longitude,
  type_color,
  record_origin
)
select
  municipality.id,
  imported.source_kind,
  imported.quantity,
  imported.exact_location,
  imported.latitude,
  imported.longitude,
  imported.type_color,
  'BFP_LOCATOR_CHART_2018'
from water_source_import imported
join public.municipalities municipality
  on lower(municipality.name) = lower(imported.municipality_name)
 and municipality.province = 'Antique'
on conflict do nothing;
