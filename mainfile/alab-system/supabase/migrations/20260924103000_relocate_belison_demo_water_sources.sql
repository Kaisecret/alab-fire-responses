-- Thesis-demo positions for the 19 Belison entries in the 2018 BFP chart.
-- These are not field-verified hydrant locations. Retain the chart coordinates
-- so the provincial office can replace the demo positions after verification.
alter table public.water_sources
  add column if not exists original_latitude numeric(10,7),
  add column if not exists original_longitude numeric(10,7),
  add column if not exists coordinate_basis text not null default 'RECORDED';

alter table public.water_sources
  drop constraint if exists water_sources_coordinate_basis_check;
alter table public.water_sources
  add constraint water_sources_coordinate_basis_check
  check (coordinate_basis in ('RECORDED', 'THESIS_DEMO_APPROXIMATION', 'FIELD_VERIFIED'));

comment on column public.water_sources.coordinate_basis is
  'Coordinate provenance. THESIS_DEMO_APPROXIMATION is a synthetic thesis-demo map point, not a verified hydrant position.';

do $$
declare
  expected_count integer;
  updated_count integer;
begin
  select count(*) into expected_count
  from public.water_sources source
  join public.municipalities municipality on municipality.id = source.municipality_id
  where municipality.name = 'Belison'
    and municipality.province = 'Antique'
    and source.record_origin = 'BFP_LOCATOR_CHART_2018'
    and source.import_sequence between 7 and 25;

  if expected_count <> 19 then
    raise exception 'Expected 19 Belison chart sources, found %', expected_count;
  end if;

  update public.water_sources source
  set original_latitude = coalesce(source.original_latitude, source.latitude),
      original_longitude = coalesce(source.original_longitude, source.longitude),
      latitude = positions.latitude,
      longitude = positions.longitude,
      coordinate_basis = 'THESIS_DEMO_APPROXIMATION',
      updated_at = now()
  from (values
    (7, 10.8332500, 121.9620000),
    (8, 10.8332500, 121.9640000),
    (9, 10.8332500, 121.9660000),
    (10, 10.8332500, 121.9680000),
    (11, 10.8332500, 121.9700000),
    (12, 10.8357500, 121.9620000),
    (13, 10.8357500, 121.9640000),
    (14, 10.8357500, 121.9660000),
    (15, 10.8357500, 121.9680000),
    (16, 10.8357500, 121.9700000),
    (17, 10.8382500, 121.9620000),
    (18, 10.8382500, 121.9640000),
    (19, 10.8382500, 121.9660000),
    (20, 10.8382500, 121.9680000),
    (21, 10.8382500, 121.9700000),
    (22, 10.8407500, 121.9620000),
    (23, 10.8407500, 121.9640000),
    (24, 10.8407500, 121.9660000),
    (25, 10.8407500, 121.9680000)
  ) as positions(import_sequence, latitude, longitude)
  where source.record_origin = 'BFP_LOCATOR_CHART_2018'
    and source.import_sequence = positions.import_sequence
    and exists (
      select 1 from public.municipalities municipality
      where municipality.id = source.municipality_id
        and municipality.name = 'Belison'
        and municipality.province = 'Antique'
    );

  get diagnostics updated_count = row_count;
  if updated_count <> 19 then
    raise exception 'Expected to update 19 Belison chart sources, updated %', updated_count;
  end if;
end;
$$;
