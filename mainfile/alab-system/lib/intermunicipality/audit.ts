import "server-only";

import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

type Queryable = Pick<PoolClient, "query">;

export type CoordinationAuditInput = {
  fireReportId: string;
  dispatchId: string;
  assistanceRequestId?: string | null;
  actorUserId?: string | null;
  originMunicipalityId: string;
  recipientMunicipalityId?: string | null;
  eventType:
    | "OBSERVERS_SELECTED"
    | "OBSERVER_ALERT_ACKNOWLEDGED"
    | "SELECTION_DEGRADED"
    | "ASSISTANCE_REQUESTED"
    | "ASSISTANCE_ACCEPTED"
    | "ASSISTANCE_PARTIALLY_ACCEPTED"
    | "ASSISTANCE_REJECTED"
    | "ASSISTANCE_CANCELLED"
    | "ASSISTANCE_COMPLETED"
    | "OBSERVER_ACCESS_ENDED";
  oldStatus?: string | null;
  newStatus?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
};

export async function recordCoordinationEvent(
  client: Queryable,
  input: CoordinationAuditInput,
) {
  await client.query(
    `insert into intermunicipal_coordination_events (
       id, fire_report_id, dispatch_id, assistance_request_id, actor_user_id,
       origin_municipality_id, recipient_municipality_id, event_type,
       old_status, new_status, metadata, created_at
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)`,
    [
      randomUUID(),
      input.fireReportId,
      input.dispatchId,
      input.assistanceRequestId ?? null,
      input.actorUserId ?? null,
      input.originMunicipalityId,
      input.recipientMunicipalityId ?? null,
      input.eventType,
      input.oldStatus ?? null,
      input.newStatus ?? null,
      JSON.stringify(input.metadata ?? {}),
      input.createdAt,
    ],
  );
}
