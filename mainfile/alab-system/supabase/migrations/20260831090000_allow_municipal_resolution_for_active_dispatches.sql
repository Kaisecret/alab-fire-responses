-- Municipal BFP closes an incident for every assigned responder, including
-- responders who are still assigned or en route and have not reached the scene.
do $$
declare
  legacy_constraint text;
begin
  select conname
    into legacy_constraint
    from pg_constraint
   where conrelid = 'public.incident_dispatch_recipients'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ~ 'completed_at.*on_scene_at';

  if legacy_constraint is null then
    raise exception 'Expected the legacy incident dispatch completion constraint to exist.';
  end if;

  execute format(
    'alter table public.incident_dispatch_recipients drop constraint %I',
    legacy_constraint
  );
end;
$$;

alter table public.incident_dispatch_recipients
  add constraint incident_dispatch_recipients_completed_timestamp_check
  check (
    (status = 'COMPLETED' and completed_at is not null)
    or (status <> 'COMPLETED' and completed_at is null)
  );
