-- A resident may report more than one kind of fire at the same place (for
-- example a house and the grass around it). fire_type keeps the type that set
-- the Level of Danger; fire_types lists every type the resident selected.
alter table public.fire_reports add column if not exists fire_types text[];

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fire_reports_fire_types_check') then
    alter table public.fire_reports
      add constraint fire_reports_fire_types_check check (
        fire_types is null
        or (cardinality(fire_types) between 1 and 3
            and fire_types <@ array['HOUSE_BUILDING', 'GRASS', 'FOREST', 'VEHICLE', 'OTHER']::text[])
      );
  end if;
end $$;
