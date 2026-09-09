import "server-only";

import type { PoolClient } from "pg";

import { withDeliveryTransaction as withTransaction } from "./delivery-db";
import type { DeliveryRecord } from "./delivery-engine";

type Queryable = Pick<PoolClient, "query">;

export type CorrectionDeliveryPayload = {
  firstName: string;
  reference: string;
  municipality: string;
  reason: string;
};

export type DeliveryJob = {
  id: string;
  channel: "SMS" | "EMAIL";
  destination: string;
  payload: CorrectionDeliveryPayload;
  attemptCount: number;
  maxAttempts?: number;
};

export type DirectCorrectionDelivery = {
  verificationId: string;
  submissionNumber: number;
  phone: string;
  email: string;
  payload: CorrectionDeliveryPayload;
};

export async function enqueueResidentCorrectionDeliveries(client: Queryable, input: {
  verificationId: string;
  recipientUserId: string;
  submissionNumber: number;
  phone: string;
  email: string;
  payload: CorrectionDeliveryPayload;
}) {
  const table = await client.query<{ relation: string | null }>(
    "select to_regclass('public.resident_notification_deliveries')::text as relation",
  );
  if (!table.rows[0]?.relation) return { ids: [], queueAvailable: false };

  const jobs = [
    { channel: "SMS", destination: input.phone },
    { channel: "EMAIL", destination: input.email },
  ] as const;
  const ids: string[] = [];

  for (const job of jobs) {
    if (!job.destination.trim()) continue;
    const dedupeKey = `resident-correction:${input.verificationId}:${input.submissionNumber}:${job.channel.toLowerCase()}`;
    const result = await client.query<{ id: string }>(
      `insert into resident_notification_deliveries (
         verification_id, recipient_user_id, channel, destination, template_key, payload, dedupe_key
       ) values ($1,$2,$3,$4,'RESIDENT_APPLICATION_CHANGES_REQUESTED',$5::jsonb,$6)
       on conflict (dedupe_key) do nothing
       returning id`,
      [input.verificationId, input.recipientUserId, job.channel, job.destination.trim(), JSON.stringify(input.payload), dedupeKey],
    );
    if (result.rows[0]?.id) ids.push(result.rows[0].id);
  }
  return { ids, queueAvailable: true };
}

export async function claimResidentCorrectionDeliveries(ids: string[] | null, channels: ("SMS" | "EMAIL")[] = ["SMS", "EMAIL"]) {
  if (ids?.length === 0 || !channels.length) return [];
  return withTransaction(async (client) => {
    const table = await client.query<{ relation: string | null }>("select to_regclass('public.resident_notification_deliveries')::text as relation");
    if (!table.rows[0]?.relation) return [];
    const result = await client.query<DeliveryJob>(
      `with claimable as (
         select id from resident_notification_deliveries
          where ($1::uuid[] is null or id = any($1::uuid[]))
            and channel = any($2::text[])
            and (status = 'PENDING' or (status = 'FAILED' and (
              last_error in ('PHILSMS_DELIVERY_FAILED', 'RESEND_DELIVERY_FAILED',
                             'PHILSMS_NOT_CONFIGURED', 'RESEND_NOT_CONFIGURED')
            )))
            and attempt_count < max_attempts
            and next_attempt_at <= now()
          order by created_at
          limit 5
          for update skip locked
       )
       update resident_notification_deliveries delivery
          set status = 'PROCESSING', attempt_count = attempt_count + 1, updated_at = now()
         from claimable
        where delivery.id = claimable.id
       returning delivery.id, delivery.channel, delivery.destination, delivery.payload,
                 delivery.attempt_count as "attemptCount", delivery.max_attempts as "maxAttempts"`,
      [ids, channels],
    );
    return result.rows;
  });
}

export async function completeResidentCorrectionDelivery(
  id: string,
  result: DeliveryRecord,
) {
  return withTransaction(async (client) => {
    if (result.status === "SENT") {
      const update = await client.query(
        `update resident_notification_deliveries
            set status = 'SENT', provider_message_id = $2, last_error = null,
                sent_at = now(), updated_at = now()
          where id = $1 and status = 'PROCESSING'`,
        [id, result.providerMessageId],
      );
      if (update.rowCount !== 1) throw new Error("DELIVERY_RECORD_NOT_UPDATED");
      return;
    }
    const update = await client.query(
      `update resident_notification_deliveries
          set status = $3, last_error = $2,
              next_attempt_at = now() + interval '5 minutes', updated_at = now()
        where id = $1 and status = 'PROCESSING'`,
      [id, result.error.replace(/\s+/g, " ").slice(0, 300), result.status],
    );
    if (update.rowCount !== 1) throw new Error("DELIVERY_RECORD_NOT_UPDATED");
  });
}
