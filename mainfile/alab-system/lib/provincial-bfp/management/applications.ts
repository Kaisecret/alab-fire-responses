import "server-only";

import { createHash } from "node:crypto";
import { getDatabase, withTransaction } from "../../db";
import { createAccountNotifications } from "../../notifications/service";
import { enqueueResidentCorrectionDeliveries } from "../../resident-applications/delivery-queue";
import { assertManagementActor } from "./scope";
import type {
  ManagementActor,
  ManagementFilters,
  ManagementPage,
  ManagedApplication,
  MutationContext,
} from "./types";

export async function listManagedApplications(
  actor: ManagementActor,
  filters: ManagementFilters,
): Promise<ManagementPage<ManagedApplication>> {
  assertManagementActor(actor);

  const db = getDatabase();
  const whereClauses: string[] = ["m.province = 'Antique'", "u.role = 'RESIDENT'"];
  const values: unknown[] = [];

  if (filters.municipalityId) {
    values.push(filters.municipalityId);
    whereClauses.push(`ra.municipality_id = $${values.length}`);
  }

  if (filters.status) {
    values.push(filters.status);
    whereClauses.push(`rv.status = $${values.length}`);
  }

  if (filters.from) {
    values.push(filters.from);
    whereClauses.push(`rv.submitted_at >= ${filters.from.length === 10 ? `($${values.length}::date::timestamp at time zone 'Asia/Manila')` : `$${values.length}::timestamptz`}`);
  }

  if (filters.to) {
    values.push(filters.to);
    whereClauses.push(`rv.submitted_at ${filters.to.length === 10 ? '<' : '<='} ${filters.to.length === 10 ? `(($${values.length}::date + 1)::timestamp at time zone 'Asia/Manila')` : `$${values.length}::timestamptz`}`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    const searchIdx = values.length;
    whereClauses.push(`(
      rp.first_name ilike $${searchIdx} or
      rp.last_name ilike $${searchIdx} or
      u.email ilike $${searchIdx} or
      u.phone ilike $${searchIdx} or
      rv.application_reference ilike $${searchIdx}
    )`);
  }

  const whereSql = whereClauses.length > 0 ? `where ${whereClauses.join(" and ")}` : "";

  const countResult = await db.query<{ count: string }>(
    `select count(*)::text as count
       from resident_verifications rv
       join resident_profiles rp on rp.id = rv.resident_profile_id
       join users u on u.id = rp.user_id
       join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary
       join municipalities m on m.id = ra.municipality_id
     ${whereSql}`,
    values,
  );
  const total = Number.parseInt(countResult.rows[0]?.count ?? "0", 10);

  const offset = (filters.page - 1) * filters.pageSize;
  values.push(filters.pageSize);
  const limitIdx = values.length;
  values.push(offset);
  const offsetIdx = values.length;

  const listResult = await db.query<{
    id: string;
    reference: string;
    residentProfileId: string;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    username: string;
    municipalityId: string;
    municipalityName: string;
    barangayId: string;
    barangayName: string;
    address: string;
    status: "PENDING" | "VERIFIED" | "CHANGES_REQUESTED";
    submissionNumber: number;
    correctionReason: string | null;
    submittedAt: Date;
    reviewedAt: Date | null;
    reviewedByUserId: string | null;
  }>(
    `select rv.id,
            rv.application_reference as "reference",
            rv.resident_profile_id as "residentProfileId",
            rp.user_id as "userId",
            rp.first_name as "firstName",
            rp.last_name as "lastName",
            u.email,
            u.phone,
            u.username,
            ra.municipality_id as "municipalityId",
            m.name as "municipalityName",
            ra.barangay_id as "barangayId",
            b.name as "barangayName",
            ra.complete_address as "address",
            rv.status,
            rv.submission_number as "submissionNumber",
            rv.rejection_reason as "correctionReason",
            rv.submitted_at as "submittedAt",
            rv.reviewed_at as "reviewedAt",
            rv.reviewed_by_user_id as "reviewedByUserId"
       from resident_verifications rv
       join resident_profiles rp on rp.id = rv.resident_profile_id
       join users u on u.id = rp.user_id
       join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary
       join municipalities m on m.id = ra.municipality_id
       join barangays b on b.id = ra.barangay_id
     ${whereSql}
      order by rv.submitted_at desc, rv.created_at desc
      limit $${limitIdx} offset $${offsetIdx}`,
    values,
  );

  const items: ManagedApplication[] = listResult.rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    residentProfileId: row.residentProfileId,
    userId: row.userId,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    username: row.username,
    municipalityId: row.municipalityId,
    municipalityName: row.municipalityName,
    barangayId: row.barangayId,
    barangayName: row.barangayName,
    address: row.address,
    status: row.status,
    submissionNumber: row.submissionNumber,
    correctionReason: row.correctionReason,
    submittedAt: row.submittedAt ? new Date(row.submittedAt).toISOString() : new Date().toISOString(),
    reviewedAt: row.reviewedAt ? new Date(row.reviewedAt).toISOString() : null,
    reviewedByUserId: row.reviewedByUserId,
  }));

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  return {
    items,
    page: filters.page,
    pageSize: filters.pageSize,
    total,
    totalPages,
    updatedAt: new Date().toISOString(),
  };
}

export async function getManagedApplication(
  actor: ManagementActor,
  applicationId: string,
): Promise<ManagedApplication | null> {
  assertManagementActor(actor);

  type AppQueryRow = {
    id: string;
    reference: string;
    residentProfileId: string;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    username: string;
    municipalityId: string;
    municipalityName: string;
    barangayId: string;
    barangayName: string;
    address: string;
    status: "PENDING" | "VERIFIED" | "CHANGES_REQUESTED";
    submissionNumber: number;
    correctionReason: string | null;
    submittedAt: Date;
    reviewedAt: Date | null;
    reviewedByUserId: string | null;
    frontReviewKey: string | null;
    legacyFrontKey: string | null;
    backReviewKey: string | null;
    legacyBackKey: string | null;
    selfieReviewKey: string | null;
    legacySelfieKey: string | null;
  };

  const queryApp = (evidenceCols: string) =>
    getDatabase().query<AppQueryRow>(
      `select rv.id,
              rv.application_reference as "reference",
              rv.resident_profile_id as "residentProfileId",
              rp.user_id as "userId",
              rp.first_name as "firstName",
              rp.last_name as "lastName",
              u.email,
              u.phone,
              u.username,
              ra.municipality_id as "municipalityId",
              m.name as "municipalityName",
              ra.barangay_id as "barangayId",
              b.name as "barangayName",
              ra.complete_address as "address",
              rv.status,
              rv.submission_number as "submissionNumber",
              rv.rejection_reason as "correctionReason",
              rv.submitted_at as "submittedAt",
              rv.reviewed_at as "reviewedAt",
              rv.reviewed_by_user_id as "reviewedByUserId",
              ${evidenceCols}
         from resident_verifications rv
         join resident_profiles rp on rp.id = rv.resident_profile_id
         join users u on u.id = rp.user_id
         join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary
         join municipalities m on m.id = ra.municipality_id
         join barangays b on b.id = ra.barangay_id
        where (rv.id::text = $1 or rv.application_reference = $1)
          and m.province = 'Antique'
          and u.role = 'RESIDENT'
        limit 1`,
      [applicationId],
    );

  let result;
  try {
    result = await queryApp(`
      rv.front_review_document_key as "frontReviewKey",
      rv.front_document_key as "legacyFrontKey",
      rv.back_review_document_key as "backReviewKey",
      rv.back_document_key as "legacyBackKey",
      rv.selfie_review_document_key as "selfieReviewKey",
      rv.selfie_key as "legacySelfieKey"`);
  } catch (error) {
    const dbErr = error as { code?: string };
    if (dbErr.code !== "42703") throw error;
    result = await queryApp(`
      rv.front_document_key as "frontReviewKey",
      rv.front_document_key as "legacyFrontKey",
      rv.back_document_key as "backReviewKey",
      rv.back_document_key as "legacyBackKey",
      rv.selfie_key as "selfieReviewKey",
      rv.selfie_key as "legacySelfieKey"`);
  }

  const app = result.rows[0];
  if (!app) return null;

  let eventsRows: Array<{ id: string; eventType: string; notes: string | null; createdAt: string }> = [];
  try {
    const events = await getDatabase().query<{
      id: string;
      eventType: string;
      notes: string | null;
      createdAt: Date;
    }>(
      `select id, event_type as "eventType", notes, created_at as "createdAt"
         from resident_verification_events
        where verification_id = $1 or resident_profile_id = $2
        order by created_at asc`,
      [app.id, app.residentProfileId],
    );
    eventsRows = events.rows.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      notes: e.notes,
      createdAt: new Date(e.createdAt).toISOString(),
    }));
  } catch (err) {
    console.warn("Unable to load resident verification events:", err);
  }

  const frontKey = app.frontReviewKey || app.legacyFrontKey || null;
  const backKey = app.backReviewKey || app.legacyBackKey || null;
  const selfieKey = app.selfieReviewKey || app.legacySelfieKey || null;

  let frontUrl: string | null = null;
  let backUrl: string | null = null;
  let selfieUrl: string | null = null;

  try {
    const { createIdentityEvidenceSignedUrl } = await import("../../resident-applications/evidence");
    [frontUrl, backUrl, selfieUrl] = await Promise.all([
      createIdentityEvidenceSignedUrl(frontKey),
      createIdentityEvidenceSignedUrl(backKey),
      createIdentityEvidenceSignedUrl(selfieKey),
    ]);
  } catch (err) {
    console.warn("Unable to load evidence signed URLs:", err);
  }

  return {
    id: app.id,
    reference: app.reference,
    residentProfileId: app.residentProfileId,
    userId: app.userId,
    firstName: app.firstName,
    lastName: app.lastName,
    email: app.email,
    phone: app.phone,
    username: app.username,
    municipalityId: app.municipalityId,
    municipalityName: app.municipalityName,
    barangayId: app.barangayId,
    barangayName: app.barangayName,
    address: app.address,
    status: app.status,
    submissionNumber: app.submissionNumber,
    correctionReason: app.correctionReason,
    submittedAt: app.submittedAt ? new Date(app.submittedAt).toISOString() : new Date().toISOString(),
    reviewedAt: app.reviewedAt ? new Date(app.reviewedAt).toISOString() : null,
    reviewedByUserId: app.reviewedByUserId,
    evidence: { frontUrl, backUrl, selfieUrl },
    events: eventsRows,
  };
}

export async function approveManagedApplication(
  context: MutationContext,
  applicationId: string,
  expectedSubmissionNumber?: number,
): Promise<{ status: "VERIFIED"; applicationReference: string }> {
  assertManagementActor(context.actor);

  const payloadDigest = createHash("sha256")
    .update(JSON.stringify({ applicationId, expectedSubmissionNumber, reason: context.reason }))
    .digest("hex");

  return withTransaction(async (client) => {
    // Serialize retries before reading the saved operation. Released on commit/rollback.
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [`${context.actor.userId}:${context.requestId}`]);
    // Check idempotency
    const existingOp = await client.query<{
      result_status: number;
      saved_result: { status: "VERIFIED"; applicationReference: string };
      payload_digest: string;
    }>(
      `select result_status, saved_result, payload_digest
         from provincial_management_operations
        where actor_user_id = $1 and request_id = $2
        limit 1`,
      [context.actor.userId, context.requestId],
    );

    if (existingOp.rowCount && existingOp.rowCount > 0) {
      const op = existingOp.rows[0];
      if (op.payload_digest === payloadDigest) {
        return op.saved_result;
      }
      throw new Error("OPERATION_IDEMPOTENCY_CONFLICT");
    }

    // Lock application row
    const appRes = await client.query<{
      id: string;
      resident_profile_id: string;
      user_id: string;
      status: string;
      submission_number: number;
      application_reference: string;
      first_name: string;
      email: string;
      phone: string;
      municipality_id: string;
      municipality_name: string;
    }>(
      `select rv.id,
              rv.resident_profile_id,
              rp.user_id,
              rv.status,
              rv.submission_number,
              rv.application_reference,
              rp.first_name,
              u.email,
              u.phone,
              ra.municipality_id,
              m.name as municipality_name
         from resident_verifications rv
         join resident_profiles rp on rp.id = rv.resident_profile_id
         join users u on u.id = rp.user_id
         join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary
         join municipalities m on m.id = ra.municipality_id
        where (rv.id::text = $1 or rv.application_reference = $1)
          and m.province = 'Antique' and u.role = 'RESIDENT'
        for update of rv, u`,
      [applicationId],
    );

    if (appRes.rowCount === 0) throw new Error("APPLICATION_NOT_FOUND");
    const app = appRes.rows[0];

    if (expectedSubmissionNumber !== undefined && app.submission_number !== expectedSubmissionNumber) {
      throw new Error("APPLICATION_SUBMISSION_MISMATCH");
    }
    if (app.status !== "PENDING") {
      throw new Error("APPLICATION_NOT_PENDING");
    }

    const now = new Date();

    await client.query(
      `update resident_verifications
          set status = 'VERIFIED',
              reviewed_by_user_id = $1,
              reviewed_at = $2,
              rejection_reason = null,
              updated_at = $2
        where id = $3`,
      [context.actor.userId, now, app.id],
    );

    await client.query(
      `update users set account_status = case when account_status = 'SUSPENDED' then 'SUSPENDED' else 'ACTIVE' end, updated_at = $1 where id = $2`,
      [now, app.user_id],
    );

    await client.query(
      `insert into resident_verification_events
        (verification_id, resident_profile_id, actor_user_id, event_type, metadata, created_at)
       values ($1, $2, $3, 'APPROVED', $4::jsonb, $5)`,
      [
        app.id,
        app.resident_profile_id,
        context.actor.userId,
        JSON.stringify({ reviewerRole: "PROVINCIAL_BFP", municipalityId: app.municipality_id }),
        now,
      ],
    );

    await createAccountNotifications(client, {
      recipientUserIds: [app.user_id],
      actorUserId: context.actor.userId,
      eventType: "RESIDENT_APPLICATION_APPROVED",
      category: "APPLICATION",
      title: "Application approved",
      summary: "Your resident account has been verified by Provincial BFP.",
      actionHref: "/resident/login",
      entityType: "resident_verification",
      entityId: app.id,
      dedupeKey: `resident-application:${app.id}:approved`,
      createdAt: now,
    });

    // Audit event in provincial_management_events
    await client.query(
      `insert into provincial_management_events
        (actor_user_id, action, target_type, target_id, municipality_id, reason, metadata)
       values ($1, 'APPROVE_RESIDENT_APPLICATION', 'APPLICATION', $2, $3, $4, $5::jsonb)`,
      [
        context.actor.userId,
        app.id,
        app.municipality_id,
        context.reason || "Provincial verification approval",
        JSON.stringify({
          applicationReference: app.application_reference,
          submissionNumber: app.submission_number,
        }),
      ],
    );

    const result = {
      status: "VERIFIED" as const,
      applicationReference: app.application_reference,
    };

    // Save idempotency operation
    await client.query(
      `insert into provincial_management_operations
        (actor_user_id, request_id, action, target_type, target_id, payload_digest, result_status, saved_result)
       values ($1, $2, 'APPROVE_RESIDENT_APPLICATION', 'APPLICATION', $3, $4, 'SUCCESS', $5::jsonb)`,
      [context.actor.userId, context.requestId, app.id, payloadDigest, JSON.stringify(result)],
    );

    return result;
  });
}

export async function requestManagedApplicationCorrections(
  context: MutationContext,
  applicationId: string,
  expectedSubmissionNumber: number | undefined,
  message: string,
): Promise<{
  status: "CHANGES_REQUESTED";
  deliveryIds: string[];
  directDelivery: unknown | null;
  replayed?: boolean;
}> {
  assertManagementActor(context.actor);

  const notes = message.trim().slice(0, 1000);
  if (notes.length < 10) throw new Error("CORRECTION_REASON_REQUIRED");

  const payloadDigest = createHash("sha256")
    .update(JSON.stringify({ applicationId, expectedSubmissionNumber, message: notes }))
    .digest("hex");

  return withTransaction(async (client) => {
    // Serialize retries before reading the saved operation. Released on commit/rollback.
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [`${context.actor.userId}:${context.requestId}`]);
    // Check idempotency
    const existingOp = await client.query<{
      result_status: number;
      saved_result: {
        status: "CHANGES_REQUESTED";
        deliveryIds: string[];
        directDelivery: unknown | null;
      };
      payload_digest: string;
    }>(
      `select result_status, saved_result, payload_digest
         from provincial_management_operations
        where actor_user_id = $1 and request_id = $2
        limit 1`,
      [context.actor.userId, context.requestId],
    );

    if (existingOp.rowCount && existingOp.rowCount > 0) {
      const op = existingOp.rows[0];
      if (op.payload_digest === payloadDigest) {
        return { ...op.saved_result, directDelivery: null, replayed: true };
      }
      throw new Error("OPERATION_IDEMPOTENCY_CONFLICT");
    }

    // Lock application row
    const appRes = await client.query<{
      id: string;
      resident_profile_id: string;
      user_id: string;
      status: string;
      submission_number: number;
      application_reference: string;
      first_name: string;
      email: string;
      phone: string;
      municipality_id: string;
      municipality_name: string;
    }>(
      `select rv.id,
              rv.resident_profile_id,
              rp.user_id,
              rv.status,
              rv.submission_number,
              rv.application_reference,
              rp.first_name,
              u.email,
              u.phone,
              ra.municipality_id,
              m.name as municipality_name
         from resident_verifications rv
         join resident_profiles rp on rp.id = rv.resident_profile_id
         join users u on u.id = rp.user_id
         join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary
         join municipalities m on m.id = ra.municipality_id
        where (rv.id::text = $1 or rv.application_reference = $1)
          and m.province = 'Antique' and u.role = 'RESIDENT'
        for update of rv, u`,
      [applicationId],
    );

    if (appRes.rowCount === 0) throw new Error("APPLICATION_NOT_FOUND");
    const app = appRes.rows[0];

    if (expectedSubmissionNumber !== undefined && app.submission_number !== expectedSubmissionNumber) {
      throw new Error("APPLICATION_SUBMISSION_MISMATCH");
    }
    if (app.status !== "PENDING") {
      throw new Error("APPLICATION_NOT_PENDING");
    }

    const now = new Date();

    await client.query(
      `update resident_verifications
          set status = 'CHANGES_REQUESTED',
              reviewed_by_user_id = $1,
              reviewed_at = $2,
              rejection_reason = $3,
              updated_at = $2
        where id = $4`,
      [context.actor.userId, now, notes, app.id],
    );

    await client.query(
      `update users set account_status = case when account_status = 'SUSPENDED' then 'SUSPENDED' else 'PENDING_REVIEW' end, updated_at = $1 where id = $2`,
      [now, app.user_id],
    );

    await client.query(
      `insert into resident_verification_events
        (verification_id, resident_profile_id, actor_user_id, event_type, notes, metadata, created_at)
       values ($1, $2, $3, 'CHANGES_REQUESTED', $4, $5::jsonb, $6)`,
      [
        app.id,
        app.resident_profile_id,
        context.actor.userId,
        notes,
        JSON.stringify({ reviewerRole: "PROVINCIAL_BFP", municipalityId: app.municipality_id }),
        now,
      ],
    );

    await createAccountNotifications(client, {
      recipientUserIds: [app.user_id],
      actorUserId: context.actor.userId,
      eventType: "RESIDENT_APPLICATION_CHANGES_REQUESTED",
      category: "APPLICATION",
      title: "Changes requested",
      summary: "Update your resident application based on Provincial review.",
      actionHref: "/resident/application",
      entityType: "resident_verification",
      entityId: app.id,
      context: { reason: notes },
      dedupeKey: `resident-application:${app.id}:${app.submission_number}:changes`,
      createdAt: now,
    });

    const deliveryInput = {
      verificationId: app.id,
      recipientUserId: app.user_id,
      submissionNumber: app.submission_number,
      phone: app.phone,
      email: app.email,
      payload: {
        firstName: app.first_name,
        reference: app.application_reference,
        municipality: app.municipality_name,
        reason: notes,
      },
    };

    const deliveryQueue = await enqueueResidentCorrectionDeliveries(client, deliveryInput);

    await client.query(
      `insert into provincial_management_events
        (actor_user_id, action, target_type, target_id, municipality_id, reason, metadata)
       values ($1, 'REQUEST_APPLICATION_CORRECTIONS', 'APPLICATION', $2, $3, $4, $5::jsonb)`,
      [
        context.actor.userId,
        app.id,
        app.municipality_id,
        notes,
        JSON.stringify({
          applicationReference: app.application_reference,
          submissionNumber: app.submission_number,
        }),
      ],
    );

    const result = {
      status: "CHANGES_REQUESTED" as const,
      deliveryIds: deliveryQueue.ids,
      directDelivery: deliveryQueue.queueAvailable ? null : deliveryInput,
    };

    await client.query(
      `insert into provincial_management_operations
        (actor_user_id, request_id, action, target_type, target_id, payload_digest, result_status, saved_result)
       values ($1, $2, 'REQUEST_APPLICATION_CORRECTIONS', 'APPLICATION', $3, $4, 'SUCCESS', $5::jsonb)`,
      [context.actor.userId, context.requestId, app.id, payloadDigest, JSON.stringify(result)],
    );

    return result;
  });
}
