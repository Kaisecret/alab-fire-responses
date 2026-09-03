-- Update house_density comments and documentation for >15m isolated / spaced dwellings
-- Valid values remain: 'PACKED_MAGKAKADIKIT' (<2m), 'ISOLATED_FAR' (>15m), 'MODERATE_SPACING' (legacy)
comment on column public.fire_reports.house_density is 'House density: PACKED_MAGKAKADIKIT (<2m conflagration hazard) or ISOLATED_FAR (>15m magkakalayo na bahay)';
