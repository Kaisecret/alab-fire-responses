import "server-only";

import type { PoolClient } from "pg";

import { withTransaction } from "../db";

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

export async function claimResidentCorrectionDeliveries(ids: string[]) {
  if (!ids.length) return [];
  return withTransaction(async (client) => {
    const result = await client.query<DeliveryJob>(
      `with claimable as (
         select id from resident_notification_deliveries
          where id = any($1::uuid[])
            and status in ('PENDING', 'FAILED')
            and attempt_count < max_attempts
            and next_attempt_at <= now()
          order by created_at
          for update skip locked
       )
       update resident_notification_deliveries delivery
          set status = 'PROCESSING', attempt_count = attempt_count + 1, updated_at = now()
         from claimable
        where delivery.id = claimable.id
       returning delivery.id, delivery.channel, delivery.destination, delivery.payload,
                 delivery.attempt_count as "attemptCount"`,
      [ids],
    );
    return result.rows;
  });
}

export async function completeResidentCorrectionDelivery(
  id: string,
  result: { status: "SENT"; providerMessageId: string | null } | { status: "FAILED"; error: string },
) {
  return withTransaction(async (client) => {
    if (result.status === "SENT") {
      await client.query(
        `update resident_notification_deliveries
            set status = 'SENT', provider_message_id = $2, last_error = null,
                sent_at = now(), updated_at = now()
          where id = $1`,
        [id, result.providerMessageId],
      );
      return;
    }
    await client.query(
      `update resident_notification_deliveries
          set status = 'FAILED', last_error = $2,
              next_attempt_at = now() + interval '5 minutes', updated_at = now()
        where id = $1`,
      [id, result.error.replace(/\s+/g, " ").slice(0, 300)],
    );
  });
}
