-- Municipal exports can now be downloaded as a styled Excel workbook. The audit
-- table's format constraint listed only CSV, PDF and the two retired print
-- modes, so writing 'XLSX' would fail the insert after the workbook had already
-- been generated, exactly as 'PDF' once did.

alter table public.municipal_export_events
  drop constraint if exists municipal_export_events_format_check;

-- PRINT_SUMMARY and PRINT_INCIDENT are retained so existing audit rows stay valid.
alter table public.municipal_export_events
  add constraint municipal_export_events_format_check
  check (format in ('CSV', 'PDF', 'XLSX', 'PRINT_SUMMARY', 'PRINT_INCIDENT'));
