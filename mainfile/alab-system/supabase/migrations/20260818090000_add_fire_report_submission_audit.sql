-- Server-observed incident submission metadata. Application access stays server-side.
-- Values are only selected after Municipal BFP assignment authorization in the app API.

alter table public.fire_reports
  add column if not exists reporter_ip_address inet,
  add column if not exists reporter_device_summary text;

alter table public.fire_reports
  drop constraint if exists fire_reports_reporter_device_summary_length_check;

alter table public.fire_reports
  add constraint fire_reports_reporter_device_summary_length_check
  check (reporter_device_summary is null or char_length(reporter_device_summary) <= 160);
