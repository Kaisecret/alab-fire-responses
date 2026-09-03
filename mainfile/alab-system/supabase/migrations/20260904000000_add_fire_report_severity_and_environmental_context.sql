-- Add environmental, density, structural, route, and calculated severity columns to fire_reports
alter table public.fire_reports
  add column if not exists structure_material text check (structure_material in ('LIGHT_MATERIALS', 'MIXED_SEMI_CONCRETE', 'CONCRETE', 'COMMERCIAL_STORAGE', 'OTHER')),
  add column if not exists house_density text check (house_density in ('PACKED_MAGKAKADIKIT', 'MODERATE_SPACING', 'ISOLATED_FAR')),
  add column if not exists route_accessibility text check (route_accessibility in ('WIDE_ROAD', 'NARROW_STREET', 'INTERIOR_ALLEY_ESKINITA', 'DEAD_END_OR_BLOCKED')),
  add column if not exists weather_temperature numeric(4, 1),
  add column if not exists weather_humidity numeric(4, 1),
  add column if not exists weather_wind_speed numeric(5, 1),
  add column if not exists weather_wind_direction numeric(5, 1),
  add column if not exists weather_wind_condition text check (weather_wind_condition in ('CALM', 'MODERATE', 'STRONG_WIND', 'GALE')),
  add column if not exists calculated_severity text check (calculated_severity in ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
  add column if not exists severity_score integer check (severity_score between 0 and 100),
  add column if not exists severity_factors jsonb default '[]'::jsonb;

create index if not exists fire_reports_calculated_severity_idx
  on public.fire_reports (calculated_severity, submitted_at desc);

create index if not exists fire_reports_house_density_idx
  on public.fire_reports (house_density);
