-- Municipal exports now generate PDF documents, including a single-incident
-- dossier. The audit table was created when exports were CSV and browser print
-- only, so its check constraints rejected both values and every PDF export
-- failed at the audit insert.

alter table public.municipal_export_events
  drop constraint if exists municipal_export_events_dataset_check;

alter table public.municipal_export_events
  add constraint municipal_export_events_dataset_check
  check (dataset in ('INCIDENT_REGISTER', 'MUNICIPAL_SUMMARY', 'BARANGAY_BREAKDOWN', 'INCIDENT_DOSSIER'));

alter table public.municipal_export_events
  drop constraint if exists municipal_export_events_format_check;

-- PRINT_SUMMARY and PRINT_INCIDENT are retained so existing audit rows stay valid.
alter table public.municipal_export_events
  add constraint municipal_export_events_format_check
  check (format in ('CSV', 'PDF', 'PRINT_SUMMARY', 'PRINT_INCIDENT'));
