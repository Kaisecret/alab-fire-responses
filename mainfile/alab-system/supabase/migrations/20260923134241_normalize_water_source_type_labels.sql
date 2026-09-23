update public.water_sources
set type_color = btrim(
  regexp_replace(
    type_color,
    '\s*/\s*[0-9]+([.][0-9]+|\s+[0-9]+/[0-9]+)?\s*("|in(ch(es)?)?)?\s*$',
    '',
    'i'
  )
)
where type_color ~* '\s*/\s*[0-9]+([.][0-9]+|\s+[0-9]+/[0-9]+)?\s*("|in(ch(es)?)?)?\s*$';
