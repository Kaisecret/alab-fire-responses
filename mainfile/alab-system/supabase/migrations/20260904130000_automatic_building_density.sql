create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create schema if not exists gis;

create table if not exists gis.building_footprints (
  source_feature_id text primary key,
  geometry extensions.geometry(MultiPolygon, 4326) not null,
  source_confidence numeric(4,3) not null check (source_confidence between 0 and 1),
  source_dataset text not null check (source_dataset = 'GOOGLE_OPEN_BUILDINGS_V3_2023_05'),
  imported_at timestamptz not null default now()
);

create index if not exists building_footprints_geometry_gist
  on gis.building_footprints using gist (geometry);

alter table public.fire_reports
  add column if not exists reported_house_density text,
  add column if not exists detected_building_density text,
  add column if not exists building_density_confidence text,
  add column if not exists building_density_building_count integer,
  add column if not exists building_density_minimum_gap_meters numeric(7,2),
  add column if not exists building_density_source text,
  add column if not exists building_density_assessed_at timestamptz;

update public.fire_reports
set reported_house_density = house_density
where reported_house_density is null and house_density is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'fire_reports_reported_house_density_check'
      and conrelid = 'public.fire_reports'::regclass
  ) then
    alter table public.fire_reports add constraint fire_reports_reported_house_density_check
      check (reported_house_density is null or reported_house_density in (
        'PACKED_MAGKAKADIKIT', 'MODERATE_SPACING', 'ISOLATED_FAR'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'fire_reports_detected_building_density_check'
      and conrelid = 'public.fire_reports'::regclass
  ) then
    alter table public.fire_reports add constraint fire_reports_detected_building_density_check
      check (detected_building_density is null or detected_building_density in (
        'DENSE_CLUSTER_DETECTED', 'NO_DENSE_CLUSTER_DETECTED', 'INSUFFICIENT_DATA'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'fire_reports_building_density_confidence_check'
      and conrelid = 'public.fire_reports'::regclass
  ) then
    alter table public.fire_reports add constraint fire_reports_building_density_confidence_check
      check (building_density_confidence is null or building_density_confidence in (
        'HIGH', 'MEDIUM', 'UNAVAILABLE'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'fire_reports_building_density_count_check'
      and conrelid = 'public.fire_reports'::regclass
  ) then
    alter table public.fire_reports add constraint fire_reports_building_density_count_check
      check (building_density_building_count is null or building_density_building_count >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'fire_reports_building_density_gap_check'
      and conrelid = 'public.fire_reports'::regclass
  ) then
    alter table public.fire_reports add constraint fire_reports_building_density_gap_check
      check (building_density_minimum_gap_meters is null or building_density_minimum_gap_meters >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'fire_reports_building_density_source_check'
      and conrelid = 'public.fire_reports'::regclass
  ) then
    alter table public.fire_reports add constraint fire_reports_building_density_source_check
      check (building_density_source is null or building_density_source = 'GOOGLE_OPEN_BUILDINGS_V3_2023_05');
  end if;
end
$$;

create table if not exists gis.fire_report_density_evidence (
  fire_report_id uuid not null references public.fire_reports(id) on delete cascade,
  source_feature_id text not null,
  geometry extensions.geometry(MultiPolygon, 4326) not null,
  source_confidence numeric(4,3) not null check (source_confidence between 0 and 1),
  distance_to_incident_meters numeric(7,2) not null check (distance_to_incident_meters >= 0),
  primary key (fire_report_id, source_feature_id)
);

create index if not exists fire_report_density_evidence_report_idx
  on gis.fire_report_density_evidence (fire_report_id);

comment on table gis.building_footprints is
  'Antique extract of Google Research Open Buildings V3 polygons, CC BY 4.0.';
comment on table gis.fire_report_density_evidence is
  'Immutable mapped-structure evidence used for one fire report density assessment.';

revoke all on schema gis from public;
revoke all on schema gis from anon;
revoke all on schema gis from authenticated;
revoke all on all tables in schema gis from public;
revoke all on all tables in schema gis from anon;
revoke all on all tables in schema gis from authenticated;
