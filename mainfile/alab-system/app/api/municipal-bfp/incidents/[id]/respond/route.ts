import { NextRequest, NextResponse } from "next/server";

import { getBfpIdentity } from "../../../../../../lib/auth/bfp-accounts";
import { bfpSessionCookieName, verifyBfpSession } from "../../../../../../lib/auth/session";
import { withTransaction } from "../../../../../../lib/db";
import { canTransitionReportStatus } from "../../../../../../lib/fire-reports/validation";
import type { FireReportStatus } from "../../../../../../lib/fire-reports/types";
import {
  createAccountNotifications,
  listProvincialNotificationRecipients,
} from "../../../../../../lib/notifications/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = verifyBfpSession(request.cookies.get(bfpSessionCookieName("MUNICIPAL_BFP"))?.value);
  if (!session || session.role !== "MUNICIPAL_BFP") return NextResponse.json({ error: "Municipal BFP sign-in is required." }, { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid incident." }, { status: 400 });
  try {
    const identity = await getBfpIdentity(session.userId);
    if (!identity?.municipalityId) return NextResponse.json({ error: "Your Municipal BFP assignment is not active." }, { status: 403 });
    const incident = await withTransaction(async (client) => {
      const current = await client.query<{ status: FireReportStatus; reference_number: string; resident_user_id: string }>(
        `select fr.status, fr.reference_number, rp.user_id as resident_user_id
           from fire_reports fr join resident_profiles rp on rp.id = fr.resident_profile_id
          where fr.id = $1 and fr.municipality_id = $2 for update of fr`,
        [id, identity.municipalityId],
      );
      if (!current.rowCount) throw new Error("NOT_FOUND");
      if (!canTransitionReportStatus(current.rows[0].status, "RESPONDING")) throw new Error("INVALID_STATUS");
      const now = new Date();
      const stationName = `${identity.municipalityName ?? "Municipal"} BFP Station`;
      await client.query(
        `update fire_reports set status = 'RESPONDING', responding_bfp_user_id = $1, responding_station_name = $2,
         response_started_at = $3, updated_at = $3 where id = $4`, [identity.userId, stationName, now, id],
      );
      await client.query(
        `insert into fire_report_status_history (fire_report_id, previous_status, next_status, actor_user_id, resident_message, created_at)
         values ($1,$2,'RESPONDING',$3,'BFP is responding to your fire report.',$4)`, [id, current.rows[0].status, identity.userId, now],
      );
      const report = current.rows[0];
      await createAccountNotifications(client, {
        recipientUserIds: [report.resident_user_id],
        actorUserId: identity.userId,
        eventType: "FIRE_RESPONSE_STARTED",
        category: "RESPONSE",
        title: "BFP is responding",
        summary: `${report.reference_number} · ${identity.municipalityName ?? "Municipal BFP"}`,
        actionHref: `/resident/reports/${id}`,
        entityType: "fire_report",
        entityId: id,
        context: { reference: report.reference_number, stationName },
        dedupeKey: `fire-report:${id}:responding`,
        createdAt: now,
      });
      await createAccountNotifications(client, {
        recipientUserIds: await listProvincialNotificationRecipients(client),
        actorUserId: identity.userId,
        eventType: "FIRE_RESPONSE_STARTED",
        category: "RESPONSE",
        title: "Municipal response started",
        summary: `${report.reference_number} · ${identity.municipalityName ?? "Municipal BFP"}`,
        actionHref: "/provincial-bfp/incidents",
        entityType: "fire_report",
        entityId: id,
        context: { reference: report.reference_number, stationName },
        dedupeKey: `fire-report:${id}:responding`,
        createdAt: now,
      });
      return { status: "RESPONDING", responseStartedAt: now, stationName };
    });
    return NextResponse.json({ incident });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "NOT_FOUND") return NextResponse.json({ error: "Incident not found in your municipality." }, { status: 404 });
    if (code === "INVALID_STATUS") return NextResponse.json({ error: "This incident cannot be moved to responding." }, { status: 409 });
    console.error("Municipal respond action failed", error);
    return NextResponse.json({ error: "Unable to start the response." }, { status: 500 });
  }
}
