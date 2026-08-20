import "server-only";

import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { getDatabase } from "../db";
import type { AccountNotification, NotificationCategory, NotificationEvent, NotificationFeed } from "./types";

type Queryable = Pick<PoolClient, "query">;

type CreateNotificationInput = {
  recipientUserIds: string[];
  actorUserId?: string | null;
  eventType: NotificationEvent;
  category: NotificationCategory;
  title: string;
  summary: string;
  actionHref?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  context?: Record<string, unknown>;
  dedupeKey: string;
  createdAt?: Date;
};

function compact(value: string, limit: number) {
  return value.trim().replace(/\s+/g, " ").slice(0, limit);
}

function safeActionHref(value?: string | null) {
  if (!value) return null;
  const path = compact(value, 300);
  if (!path.startsWith("/") || path.startsWith("//") || /[\r\n]/.test(path)) {
    throw new Error("INVALID_NOTIFICATION_ACTION");
  }
  return path;
}

async function notificationTableExists(queryable: Queryable) {
  const result = await queryable.query<{ relation: string | null }>(
    "select to_regclass('public.account_notifications')::text as relation",
  );
  return Boolean(result.rows[0]?.relation);
}

export async function createAccountNotifications(client: Queryable, input: CreateNotificationInput) {
  const recipients = [...new Set(input.recipientUserIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id)))];
  if (!recipients.length) return 0;
  if (!(await notificationTableExists(client))) return 0;
  const title = compact(input.title, 120);
  const summary = compact(input.summary, 240);
  const dedupeKey = compact(input.dedupeKey, 180);
  if (!title || !summary || !dedupeKey) throw new Error("INVALID_NOTIFICATION_CONTENT");
  const actionHref = safeActionHref(input.actionHref);
  let created = 0;

  for (const recipientUserId of recipients) {
    const result = await client.query(
      `insert into account_notifications (
        id, recipient_user_id, actor_user_id, event_type, category, title, summary,
        action_href, entity_type, entity_id, context, dedupe_key, created_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13)
      on conflict (recipient_user_id, dedupe_key) where dedupe_key is not null do nothing`,
      [randomUUID(), recipientUserId, input.actorUserId ?? null, input.eventType, input.category, title, summary,
        actionHref, input.entityType ?? null, input.entityId ?? null, JSON.stringify(input.context ?? {}), dedupeKey,
        input.createdAt ?? new Date()],
    );
    created += result.rowCount ?? 0;
  }
  return created;
}

export async function listMunicipalNotificationRecipients(client: Queryable, municipalityId: string) {
  const result = await client.query<{ user_id: string }>(
    `select u.id as user_id
       from users u
       join bfp_personnel_profiles profile on profile.user_id = u.id
       join bfp_municipality_assignments assignment on assignment.personnel_profile_id = profile.id
      where assignment.municipality_id = $1 and assignment.status = 'ACTIVE'
        and u.role = 'MUNICIPAL_BFP' and u.account_status = 'ACTIVE'`,
    [municipalityId],
  );
  return result.rows.map((row) => row.user_id);
}

export async function listProvincialNotificationRecipients(client: Queryable) {
  const result = await client.query<{ user_id: string }>(
    `select u.id as user_id from users u
      where u.role = 'PROVINCIAL_BFP' and u.account_status = 'ACTIVE'`,
  );
  return result.rows.map((row) => row.user_id);
}

export async function listAccountNotifications(recipientUserId: string, limit = 25): Promise<NotificationFeed> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 25, 1), 50);
  const database = getDatabase();
  if (!(await notificationTableExists(database))) return { notifications: [], unreadCount: 0 };
  const [feed, unread] = await Promise.all([
    database.query<AccountNotification>(
      `select id, event_type as "eventType", category, title, summary, action_href as "actionHref",
              entity_type as "entityType", entity_id as "entityId", context, read_at as "readAt", created_at as "createdAt"
         from account_notifications where recipient_user_id = $1
        order by created_at desc limit $2`,
      [recipientUserId, safeLimit],
    ),
    database.query<{ count: string }>(
      `select count(*)::text as count from account_notifications
        where recipient_user_id = $1 and read_at is null`,
      [recipientUserId],
    ),
  ]);
  return { notifications: feed.rows, unreadCount: Number(unread.rows[0]?.count ?? 0) };
}

export async function markAccountNotificationRead(recipientUserId: string, notificationId: string) {
  const database = getDatabase();
  if (!(await notificationTableExists(database))) return false;
  const result = await database.query(
    `update account_notifications set read_at = coalesce(read_at, now())
      where id = $1 and recipient_user_id = $2 returning id`,
    [notificationId, recipientUserId],
  );
  return Boolean(result.rowCount);
}

export async function markAllAccountNotificationsRead(recipientUserId: string) {
  const database = getDatabase();
  if (!(await notificationTableExists(database))) return 0;
  const result = await database.query(
    `update account_notifications set read_at = now()
      where recipient_user_id = $1 and read_at is null`,
    [recipientUserId],
  );
  return result.rowCount ?? 0;
}
