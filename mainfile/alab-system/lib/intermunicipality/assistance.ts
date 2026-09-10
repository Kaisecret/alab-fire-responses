import "server-only";

import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { withTransaction } from "../db";
import {
  createAccountNotifications,
  listMunicipalNotificationRecipients,
  listProvincialNotificationRecipients,
} from "../notifications/service";
import {
  type AssistanceAction,
  validateAssistanceTransition,
  validateRequestedResources,
} from "./assistance-state";
import { recordCoordinationEvent } from "./audit";
import type {
  AssistanceRequestSummary,
  AssistanceStatus,
} from "./types";

type Queryable = Pick<PoolClient, "query">;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

function cleanNote(note?: string | null): string | null {
  if (!note) return null;
  const trimmed = note.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 500) : null;
}

export type CreateAssistanceRequestsInput = {
  fireReportId: string;
  requesterMunicipalityId: string;
  actorUserId: string;
  recipientMunicipalityIds: string[];
  requestedFiretrucks: number;
  requestedPersonnel: number;
  requestNote?: string | null;
};

export type TransitionAssistanceRequestInput = {
  requestId: string;
  actorMunicipalityId: string;
  actorUserId: string;
  action: AssistanceAction;
  offeredFiretrucks: number;
  offeredPersonnel: number;
  responseNote?: string | null;
};

export async function createAssistanceRequests(
  input: CreateAssistanceRequestsInput,
): Promise<AssistanceRequestSummary[]> {
  if (!isValidUuid(input.fireReportId) || !isValidUuid(input.requesterMunicipalityId) || !isValidUuid(input.actorUserId)) {
    throw new Error("INVALID_ASSISTANCE_INPUT");
  }

  const rawRecipients = Array.isArray(input.recipientMunicipalityIds) ? input.recipientMunicipalityIds : [];
  const recipientMunicipalityIds = [...new Set(rawRecipients.filter(isValidUuid))];
  if (recipientMunicipalityIds.length === 0 || recipientMunicipalityIds.length > 2) {
    throw new Error("INVALID_ASSISTANCE_INPUT");
  }

  const { requestedFiretrucks, requestedPersonnel } = validateRequestedResources(
    input.requestedFiretrucks,
    input.requestedPersonnel,
  );
  const note = cleanNote(input.requestNote);

  return withTransaction(async (client) => {
    const reportCheck = await client.query<{
      fire_report_id: string;
      dispatch_id: string;
      municipality_id: string;
      reference_number: string;
      barangay_name: string | null;
      municipality_name: string;
      report_status: string;
    }>(
      `select fr.id as fire_report_id,
              d.id as dispatch_id,
              fr.municipality_id,
              fr.status as report_status,
              fr.reference_number,
              b.name as barangay_name,
              m.name as municipality_name
         from fire_reports fr
         join incident_dispatches d on d.fire_report_id = fr.id and d.status = 'ACTIVE'
         join municipalities m on m.id = fr.municipality_id
         left join barangays b on b.id = fr.barangay_id
        where fr.id = $1
        for update of fr, d`,
      [input.fireReportId],
    );

    const report = reportCheck.rows[0];
    if (!report) {
      throw new Error("INCIDENT_NOT_FOUND");
    }
    if (report.municipality_id !== input.requesterMunicipalityId) {
      throw new Error("FORBIDDEN_ORIGIN_MISMATCH");
    }
    if (["RESOLVED", "CLOSED", "REJECTED", "FALSE_REPORT", "DUPLICATE"].includes(report.report_status)) {
      throw new Error("INCIDENT_NOT_ACTIVE");
    }

    const observerCheck = await client.query<{
      id: string;
      observer_municipality_id: string;
      observer_municipality_name: string;
    }>(
      `select o.id,
              o.observer_municipality_id,
              m.name as observer_municipality_name
         from incident_municipal_observers o
         join municipalities m on m.id = o.observer_municipality_id
        where o.dispatch_id = $1
          and o.status = 'ACTIVE'
          and o.observer_municipality_id = any($2::uuid[])
        for update of o`,
      [report.dispatch_id, recipientMunicipalityIds],
    );

    if (observerCheck.rows.length !== recipientMunicipalityIds.length) {
      throw new Error("UNSELECTED_ASSISTANCE_RECIPIENT");
    }

    const summaries: AssistanceRequestSummary[] = [];
    const now = new Date();
    const provincialRecipients = await listProvincialNotificationRecipients(client);

    for (const observer of observerCheck.rows) {
      const newRequestId = randomUUID();
      const insertResult = await client.query<{ id: string }>(
        `insert into intermunicipal_assistance_requests (
           id, fire_report_id, dispatch_id, observer_id, requester_municipality_id,
           recipient_municipality_id, requested_by_user_id, requested_firetrucks,
           requested_personnel, request_note, status, requested_at, updated_at
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'REQUESTED',$11,$11)
         on conflict (dispatch_id, recipient_municipality_id)
           where status in ('REQUESTED','ACCEPTED','PARTIALLY_ACCEPTED')
           do nothing
         returning id`,
        [
          newRequestId,
          report.fire_report_id,
          report.dispatch_id,
          observer.id,
          input.requesterMunicipalityId,
          observer.observer_municipality_id,
          input.actorUserId,
          requestedFiretrucks,
          requestedPersonnel,
          note,
          now,
        ],
      );

      const actualRequestId = insertResult.rows[0]?.id ?? null;
      if (!actualRequestId) {
        // Load existing open request
        const existingResult = await client.query<{
          id: string;
          recipient_municipality_id: string;
          recipient_municipality_name: string;
          requested_firetrucks: number;
          requested_personnel: number;
          offered_firetrucks: number | null;
          offered_personnel: number | null;
          request_note: string | null;
          response_note: string | null;
          status: AssistanceStatus;
          requested_at: string;
          responded_at: string | null;
          completed_at: string | null;
        }>(
          `select r.id,
                  r.recipient_municipality_id,
                  m.name as recipient_municipality_name,
                  r.requested_firetrucks,
                  r.requested_personnel,
                  r.offered_firetrucks,
                  r.offered_personnel,
                  r.request_note,
                  r.response_note,
                  r.status,
                  r.requested_at,
                  r.responded_at,
                  r.completed_at
             from intermunicipal_assistance_requests r
             join municipalities m on m.id = r.recipient_municipality_id
            where r.dispatch_id = $1
              and r.requester_municipality_id = $2
              and r.recipient_municipality_id = $3
              and r.status in ('REQUESTED','ACCEPTED','PARTIALLY_ACCEPTED')`,
          [report.dispatch_id, input.requesterMunicipalityId, observer.observer_municipality_id],
        );

        const openRow = existingResult.rows[0];
        if (!openRow || openRow.requested_firetrucks !== requestedFiretrucks
          || openRow.requested_personnel !== requestedPersonnel
          || openRow.request_note !== note) {
          throw new Error("ASSISTANCE_ALREADY_OPEN");
        }
        if (openRow) {
          summaries.push({
            id: openRow.id,
            recipientMunicipalityId: openRow.recipient_municipality_id,
            recipientMunicipalityName: openRow.recipient_municipality_name,
            requestedFiretrucks: openRow.requested_firetrucks,
            requestedPersonnel: openRow.requested_personnel,
            offeredFiretrucks: openRow.offered_firetrucks,
            offeredPersonnel: openRow.offered_personnel,
            requestNote: openRow.request_note,
            responseNote: openRow.response_note,
            status: openRow.status,
            requestedAt: openRow.requested_at,
            respondedAt: openRow.responded_at,
            completedAt: openRow.completed_at,
          });
        }
        continue;
      }

      await recordCoordinationEvent(client, {
        fireReportId: report.fire_report_id,
        dispatchId: report.dispatch_id,
        assistanceRequestId: actualRequestId,
        actorUserId: input.actorUserId,
        originMunicipalityId: input.requesterMunicipalityId,
        recipientMunicipalityId: observer.observer_municipality_id,
        eventType: "ASSISTANCE_REQUESTED",
        newStatus: "REQUESTED",
        metadata: {
          requestedFiretrucks,
          requestedPersonnel,
          requestNote: note,
        },
        createdAt: now,
      });

      const recipientUsers = await listMunicipalNotificationRecipients(
        client,
        observer.observer_municipality_id,
      );

      const locationDesc = report.barangay_name
        ? `${report.barangay_name}, ${report.municipality_name}`
        : report.municipality_name;

      await createAccountNotifications(client, {
        recipientUserIds: recipientUsers,
        eventType: "ASSISTANCE_REQUESTED",
        category: "INCIDENT",
        title: "Backup Assistance Requested",
        summary: `${report.municipality_name} requested backup (${requestedFiretrucks} firetruck(s), ${requestedPersonnel} personnel) for incident ${report.reference_number} in ${locationDesc}.`,
        actionHref: `/municipal-bfp/active-incidents?incident=${report.fire_report_id}`,
        entityType: "assistance_request",
        entityId: actualRequestId,
        dedupeKey: `assistance:${actualRequestId}:requested`,
        createdAt: now,
      });

      await createAccountNotifications(client, {
        recipientUserIds: provincialRecipients,
        eventType: "ASSISTANCE_REQUESTED",
        category: "INCIDENT",
        title: "Backup Assistance Requested",
        summary: `${report.municipality_name} requested backup from ${observer.observer_municipality_name} for incident ${report.reference_number}.`,
        actionHref: `/provincial-bfp/assistance-requests?request=${actualRequestId}`,
        entityType: "assistance_request",
        entityId: actualRequestId,
        dedupeKey: `assistance:${actualRequestId}:requested`,
        createdAt: now,
      });

      summaries.push({
        id: actualRequestId,
        recipientMunicipalityId: observer.observer_municipality_id,
        recipientMunicipalityName: observer.observer_municipality_name,
        requestedFiretrucks,
        requestedPersonnel,
        offeredFiretrucks: null,
        offeredPersonnel: null,
        requestNote: note,
        responseNote: null,
        status: "REQUESTED",
        requestedAt: now.toISOString(),
        respondedAt: null,
        completedAt: null,
      });
    }

    return summaries;
  });
}

export async function transitionAssistanceRequest(
  input: TransitionAssistanceRequestInput,
): Promise<AssistanceRequestSummary> {
  if (!isValidUuid(input.requestId) || !isValidUuid(input.actorMunicipalityId) || !isValidUuid(input.actorUserId)) {
    throw new Error("INVALID_ASSISTANCE_INPUT");
  }

  const note = cleanNote(input.responseNote);

  return withTransaction(async (client) => {
    // Serialize with resolution/request creation, which also lock the report first.
    await client.query(
      `select fr.id from fire_reports fr
        where fr.id = (select fire_report_id from intermunicipal_assistance_requests
          where id = $1 and (requester_municipality_id = $2 or recipient_municipality_id = $2))
        for update of fr`,
      [input.requestId, input.actorMunicipalityId],
    );
    const existingResult = await client.query<{
      id: string;
      fire_report_id: string;
      dispatch_id: string;
      observer_id: string;
      requester_municipality_id: string;
      requester_municipality_name: string;
      recipient_municipality_id: string;
      recipient_municipality_name: string;
      requested_by_user_id: string;
      requested_firetrucks: number;
      requested_personnel: number;
      request_note: string | null;
      status: AssistanceStatus;
      offered_firetrucks: number | null;
      offered_personnel: number | null;
      response_note: string | null;
      responded_by_user_id: string | null;
      requested_at: string;
      responded_at: string | null;
      completed_at: string | null;
      reference_number: string;
      report_status: string;
      dispatch_status: string;
      observer_status: string;
    }>(
      `select r.*,
              req_m.name as requester_municipality_name,
              rec_m.name as recipient_municipality_name,
              fr.reference_number,
              fr.status as report_status,
              d.status as dispatch_status,
              o.status as observer_status
         from intermunicipal_assistance_requests r
         join municipalities req_m on req_m.id = r.requester_municipality_id
         join municipalities rec_m on rec_m.id = r.recipient_municipality_id
         join fire_reports fr on fr.id = r.fire_report_id
         join incident_dispatches d on d.id = r.dispatch_id
         join incident_municipal_observers o on o.id = r.observer_id
        where r.id = $1
        for update of r`,
      [input.requestId],
    );

    const row = existingResult.rows[0];
    if (!row) {
      throw new Error("ASSISTANCE_NOT_FOUND");
    }

    // Role-correct authorization
    if (input.action === "CANCEL") {
      if (row.requester_municipality_id !== input.actorMunicipalityId) {
        throw new Error("FORBIDDEN_NOT_REQUESTER");
      }
    } else {
      if (row.recipient_municipality_id !== input.actorMunicipalityId) {
        throw new Error("FORBIDDEN_NOT_RECIPIENT");
      }
    }

    // Idempotent retry check
    if (row.status !== "REQUESTED") {
      let isRetryMatch = false;
      if (input.action === "CANCEL" && row.status === "CANCELLED") {
        isRetryMatch = true;
      } else if (input.action === "REJECT" && row.status === "REJECTED") {
        isRetryMatch = true;
      } else if (
        input.action === "ACCEPT" &&
        row.status === "ACCEPTED" &&
        row.offered_firetrucks === input.offeredFiretrucks &&
        row.offered_personnel === input.offeredPersonnel
      ) {
        isRetryMatch = true;
      } else if (
        input.action === "PARTIAL_ACCEPT" &&
        row.status === "PARTIALLY_ACCEPTED" &&
        row.offered_firetrucks === input.offeredFiretrucks &&
        row.offered_personnel === input.offeredPersonnel
      ) {
        isRetryMatch = true;
      }

      if (isRetryMatch && row.response_note === note
        && (input.action !== "REJECT" && input.action !== "CANCEL"
          || input.offeredFiretrucks === 0 && input.offeredPersonnel === 0)) {
        return {
          id: row.id,
          recipientMunicipalityId: row.recipient_municipality_id,
          recipientMunicipalityName: row.recipient_municipality_name,
          requestedFiretrucks: row.requested_firetrucks,
          requestedPersonnel: row.requested_personnel,
          offeredFiretrucks: row.offered_firetrucks,
          offeredPersonnel: row.offered_personnel,
          requestNote: row.request_note,
          responseNote: row.response_note,
          status: row.status,
          requestedAt: row.requested_at,
          respondedAt: row.responded_at,
          completedAt: row.completed_at,
        };
      }

      throw new Error("ASSISTANCE_STATE_CONFLICT");
    }

    if (row.observer_status !== "ACTIVE" || row.dispatch_status !== "ACTIVE"
      || ["RESOLVED", "CLOSED", "REJECTED", "FALSE_REPORT", "DUPLICATE"].includes(row.report_status)) {
      throw new Error("ASSISTANCE_STATE_CONFLICT");
    }

    const { nextStatus, offeredFiretrucks, offeredPersonnel } = validateAssistanceTransition(
      row.status,
      input.action,
      row.requested_firetrucks,
      row.requested_personnel,
      input.offeredFiretrucks,
      input.offeredPersonnel,
    );

    const now = new Date();
    const respondedBy = input.action === "CANCEL" ? null : input.actorUserId;
    const respondedAt = input.action === "CANCEL" ? null : now;

    await client.query(
      `update intermunicipal_assistance_requests
          set status = $1,
              offered_firetrucks = $2,
              offered_personnel = $3,
              response_note = $4,
              responded_by_user_id = $5,
              responded_at = $6,
              updated_at = $7
        where id = $8`,
      [
        nextStatus,
        offeredFiretrucks,
        offeredPersonnel,
        note,
        respondedBy,
        respondedAt,
        now,
        row.id,
      ],
    );

    let eventType:
      | "ASSISTANCE_ACCEPTED"
      | "ASSISTANCE_PARTIALLY_ACCEPTED"
      | "ASSISTANCE_REJECTED"
      | "ASSISTANCE_CANCELLED";

    let dedupeSuffix: string;
    let title: string;
    let summary: string;

    switch (nextStatus) {
      case "ACCEPTED":
        eventType = "ASSISTANCE_ACCEPTED";
        dedupeSuffix = "accepted";
        title = "Backup Assistance Accepted";
        summary = `${row.recipient_municipality_name} accepted backup request for incident ${row.reference_number} (${offeredFiretrucks} firetruck(s), ${offeredPersonnel} personnel).`;
        break;
      case "PARTIALLY_ACCEPTED":
        eventType = "ASSISTANCE_PARTIALLY_ACCEPTED";
        dedupeSuffix = "partially-accepted";
        title = "Backup Assistance Partially Accepted";
        summary = `${row.recipient_municipality_name} partially accepted backup request for incident ${row.reference_number} (${offeredFiretrucks} firetruck(s), ${offeredPersonnel} personnel).`;
        break;
      case "REJECTED":
        eventType = "ASSISTANCE_REJECTED";
        dedupeSuffix = "rejected";
        title = "Backup Assistance Declined";
        summary = `${row.recipient_municipality_name} declined backup request for incident ${row.reference_number}.`;
        break;
      case "CANCELLED":
        eventType = "ASSISTANCE_CANCELLED";
        dedupeSuffix = "cancelled";
        title = "Backup Assistance Cancelled";
        summary = `${row.requester_municipality_name} cancelled backup request for incident ${row.reference_number}.`;
        break;
      default:
        throw new Error("ASSISTANCE_STATE_CONFLICT");
    }

    await recordCoordinationEvent(client, {
      fireReportId: row.fire_report_id,
      dispatchId: row.dispatch_id,
      assistanceRequestId: row.id,
      actorUserId: input.actorUserId,
      originMunicipalityId: row.requester_municipality_id,
      recipientMunicipalityId: row.recipient_municipality_id,
      eventType,
      oldStatus: "REQUESTED",
      newStatus: nextStatus,
      metadata: {
        offeredFiretrucks,
        offeredPersonnel,
        responseNote: note,
      },
      createdAt: now,
    });

    const originRecipients = await listMunicipalNotificationRecipients(
      client,
      row.requester_municipality_id,
    );
    const cancellationRecipients = input.action === "CANCEL"
      ? await listMunicipalNotificationRecipients(client, row.recipient_municipality_id)
      : [];
    const provincialRecipients = await listProvincialNotificationRecipients(client);

    await createAccountNotifications(client, {
      recipientUserIds: [...new Set([...originRecipients, ...cancellationRecipients])],
      eventType,
      category: "INCIDENT",
      title,
      summary,
      actionHref: `/municipal-bfp/active-incidents?incident=${row.fire_report_id}`,
      entityType: "assistance_request",
      entityId: row.id,
      dedupeKey: `assistance:${row.id}:${dedupeSuffix}`,
      createdAt: now,
    });

    await createAccountNotifications(client, {
      recipientUserIds: provincialRecipients,
      eventType,
      category: "INCIDENT",
      title,
      summary,
      actionHref: `/provincial-bfp/assistance-requests?request=${row.id}`,
      entityType: "assistance_request",
      entityId: row.id,
      dedupeKey: `assistance:${row.id}:${dedupeSuffix}`,
      createdAt: now,
    });

    return {
      id: row.id,
      recipientMunicipalityId: row.recipient_municipality_id,
      recipientMunicipalityName: row.recipient_municipality_name,
      requestedFiretrucks: row.requested_firetrucks,
      requestedPersonnel: row.requested_personnel,
      offeredFiretrucks,
      offeredPersonnel,
      requestNote: row.request_note,
      responseNote: note,
      status: nextStatus,
      requestedAt: row.requested_at,
      respondedAt: respondedAt ? respondedAt.toISOString() : null,
      completedAt: null,
    };
  });
}

export async function closeIncidentAssistance(
  client: Queryable,
  input: {
    fireReportId: string;
    dispatchId: string;
    originMunicipalityId: string;
    actorUserId: string;
    closedAt: Date;
  },
): Promise<void> {
  const openRequests = await client.query<{
    id: string;
    recipient_municipality_id: string;
    status: AssistanceStatus;
    reference_number: string;
    requester_municipality_name: string;
    recipient_municipality_name: string;
  }>(
    `select r.id,
            r.recipient_municipality_id,
            r.status,
            fr.reference_number,
            req_m.name as requester_municipality_name,
            rec_m.name as recipient_municipality_name
       from intermunicipal_assistance_requests r
       join fire_reports fr on fr.id = r.fire_report_id
       join municipalities req_m on req_m.id = r.requester_municipality_id
       join municipalities rec_m on rec_m.id = r.recipient_municipality_id
      where r.dispatch_id = $1
        and r.status in ('REQUESTED','ACCEPTED','PARTIALLY_ACCEPTED')
      for update of r`,
    [input.dispatchId],
  );

  if (openRequests.rows.length === 0) {
    return;
  }

  const originRecipients = await listMunicipalNotificationRecipients(
    client,
    input.originMunicipalityId,
  );
  const provincialRecipients = await listProvincialNotificationRecipients(client);

  for (const row of openRequests.rows) {
    const isAccepted = row.status === "ACCEPTED" || row.status === "PARTIALLY_ACCEPTED";
    const nextStatus: AssistanceStatus = isAccepted ? "COMPLETED" : "CANCELLED";
    const eventType = isAccepted ? "ASSISTANCE_COMPLETED" : "ASSISTANCE_CANCELLED";
    const dedupeSuffix = isAccepted ? "completed" : "cancelled";

    if (isAccepted) {
      await client.query(
        `update intermunicipal_assistance_requests
            set status = 'COMPLETED',
                completed_at = $1,
                updated_at = $1
          where id = $2`,
        [input.closedAt, row.id],
      );
    } else {
      await client.query(
        `update intermunicipal_assistance_requests
            set status = 'CANCELLED',
                updated_at = $1
          where id = $2`,
        [input.closedAt, row.id],
      );
    }

    await recordCoordinationEvent(client, {
      fireReportId: input.fireReportId,
      dispatchId: input.dispatchId,
      assistanceRequestId: row.id,
      actorUserId: input.actorUserId,
      originMunicipalityId: input.originMunicipalityId,
      recipientMunicipalityId: row.recipient_municipality_id,
      eventType,
      oldStatus: row.status,
      newStatus: nextStatus,
      createdAt: input.closedAt,
    });

    const recipientRecipients = await listMunicipalNotificationRecipients(
      client,
      row.recipient_municipality_id,
    );
    const allRecipients = [...new Set([...originRecipients, ...recipientRecipients])];

    const title = isAccepted ? "Backup Assistance Completed" : "Unanswered Backup Cancelled";
    const summary = isAccepted
      ? `Inter-municipality backup for incident ${row.reference_number} concluded upon incident resolution.`
      : `Pending backup request for incident ${row.reference_number} cancelled as incident was resolved.`;

    await createAccountNotifications(client, {
      recipientUserIds: allRecipients,
      eventType,
      category: "INCIDENT",
      title,
      summary,
      actionHref: `/municipal-bfp/active-incidents?incident=${input.fireReportId}`,
      entityType: "assistance_request",
      entityId: row.id,
      dedupeKey: `assistance:${row.id}:${dedupeSuffix}`,
      createdAt: input.closedAt,
    });

    await createAccountNotifications(client, {
      recipientUserIds: provincialRecipients,
      eventType,
      category: "INCIDENT",
      title,
      summary,
      actionHref: `/provincial-bfp/assistance-requests?request=${row.id}`,
      entityType: "assistance_request",
      entityId: row.id,
      dedupeKey: `assistance:${row.id}:${dedupeSuffix}`,
      createdAt: input.closedAt,
    });
  }
}
