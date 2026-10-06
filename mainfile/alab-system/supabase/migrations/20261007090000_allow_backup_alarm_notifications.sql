-- Backup requests, forwarded escalations and provincial alarm declarations
-- were added to the application without widening this constraint, so every
-- one of those notifications was rejected. A municipality called by a second
-- alarm received only the provincial assistance notice, which does not sound
-- the alarm, and heard nothing.
alter table public.account_notifications
  drop constraint if exists account_notifications_event_type_check;
alter table public.account_notifications
  add constraint account_notifications_event_type_check check (
    event_type in (
      'FIRE_REPORT_CREATED','FIRE_RESPONSE_STARTED','INCIDENT_DISPATCH_ASSIGNED',
      'INCIDENT_DISPATCH_STATUS_CHANGED','RESIDENT_APPLICATION_SUBMITTED',
      'RESIDENT_APPLICATION_RESUBMITTED','RESIDENT_APPLICATION_APPROVED',
      'RESIDENT_APPLICATION_CHANGES_REQUESTED','MUNICIPAL_ACCOUNT_CREATED',
      'NEARBY_INCIDENT_ASSIGNED','NEARBY_MONITORING_STARTED','ASSISTANCE_REQUESTED',
      'ASSISTANCE_ACCEPTED','ASSISTANCE_PARTIALLY_ACCEPTED','ASSISTANCE_REJECTED',
      'ASSISTANCE_CANCELLED','ASSISTANCE_COMPLETED','NEARBY_SELECTION_DEGRADED',
      'BACKUP_REQUESTED','BACKUP_FORWARDED','ALARM_DECLARED'
    )
  );
