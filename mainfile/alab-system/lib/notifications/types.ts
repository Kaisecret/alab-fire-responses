export const NOTIFICATION_CATEGORIES = ["INCIDENT", "APPLICATION", "RESPONSE", "ACCOUNT", "SYSTEM"] as const;
export type NotificationCategory = typeof NOTIFICATION_CATEGORIES[number];

export const NOTIFICATION_EVENTS = [
  "FIRE_REPORT_CREATED",
  "FIRE_RESPONSE_STARTED",
  "INCIDENT_DISPATCH_ASSIGNED",
  "INCIDENT_DISPATCH_STATUS_CHANGED",
  "RESIDENT_APPLICATION_SUBMITTED",
  "RESIDENT_APPLICATION_RESUBMITTED",
  "RESIDENT_APPLICATION_APPROVED",
  "RESIDENT_APPLICATION_CHANGES_REQUESTED",
  "MUNICIPAL_ACCOUNT_CREATED",
  "NEARBY_INCIDENT_ASSIGNED",
  "NEARBY_MONITORING_STARTED",
  "ASSISTANCE_REQUESTED",
  "ASSISTANCE_ACCEPTED",
  "ASSISTANCE_PARTIALLY_ACCEPTED",
  "ASSISTANCE_REJECTED",
  "ASSISTANCE_CANCELLED",
  "ASSISTANCE_COMPLETED",
  "NEARBY_SELECTION_DEGRADED",
] as const;
export type NotificationEvent = typeof NOTIFICATION_EVENTS[number];

export type AccountNotification = {
  id: string;
  eventType: NotificationEvent;
  category: NotificationCategory;
  title: string;
  summary: string;
  actionHref: string | null;
  entityType: string | null;
  entityId: string | null;
  context: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type NotificationFeed = {
  notifications: AccountNotification[];
  unreadCount: number;
};
