-- A burning house may be wood or mixed / semi-concrete, and may also hold
-- storage or flammable goods. The resident form now lets the flammable goods
-- choice sit beside either one, so the report keeps both as one value.
do $$
declare
  existing record;
begin
  for existing in
    select conname
      from pg_constraint
     where conrelid = 'public.fire_reports'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%structure_material%'
  loop
    execute format('alter table public.fire_reports drop constraint %I', existing.conname);
  end loop;
end $$;

alter table public.fire_reports
  add constraint fire_reports_structure_material_check
  check (structure_material in (
    'LIGHT_MATERIALS', 'MIXED_SEMI_CONCRETE', 'CONCRETE', 'COMMERCIAL_STORAGE', 'OTHER',
    'LIGHT_WITH_FLAMMABLE', 'MIXED_WITH_FLAMMABLE'
  ));
