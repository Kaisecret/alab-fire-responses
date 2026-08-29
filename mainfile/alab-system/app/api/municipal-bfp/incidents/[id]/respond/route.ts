import { NextRequest, NextResponse } from "next/server";

import { isAuthorizationResponse, requireMunicipalAdmin } from "../../../../../../lib/municipal-bfp/auth";
import { dispatchIncidentToStations, listDispatchableStations } from "../../../../../../lib/municipal-bfp/dispatch";

export const runtime = "nodejs";

function validIncidentId(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value);
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const identity = await requireMunicipalAdmin(request);
  if (isAuthorizationResponse(identity)) return identity;
  const { id } = await context.params;
  if (!validIncidentId(id)) return NextResponse.json({ error: "Invalid incident." }, { status: 400 });

  try {
    const stations = await listDispatchableStations(identity.municipalityId);
    return NextResponse.json({ stations });
  } catch (error) {
    console.error("Municipal dispatch station list failed", error);
    return NextResponse.json({ error: "Unable to load station dispatch choices." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const identity = await requireMunicipalAdmin(request);
  if (isAuthorizationResponse(identity)) return identity;
  const { id } = await context.params;
  if (!validIncidentId(id)) return NextResponse.json({ error: "Invalid incident." }, { status: 400 });

  let body: { stationIds?: unknown; selectAllStations?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A station selection is required." }, { status: 400 });
  }
  const stationIds = Array.isArray(body.stationIds) ? body.stationIds.filter((value): value is string => typeof value === "string") : [];
  const selectAllStations = body.selectAllStations === true;

  try {
    const dispatch = await dispatchIncidentToStations({
      fireReportId: id,
      municipalityId: identity.municipalityId,
      municipalityName: identity.municipalityName ?? "Municipal BFP",
      actorUserId: identity.userId,
      stationIds,
      selectAllStations,
    });
    return NextResponse.json({ dispatch }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "NOT_FOUND") return NextResponse.json({ error: "Incident not found in your municipality." }, { status: 404 });
    if (code === "INVALID_STATUS") return NextResponse.json({ error: "This incident cannot be dispatched in its current status." }, { status: 409 });
    if (code === "STATION_SELECTION_REQUIRED") return NextResponse.json({ error: "Select at least one staffed, active station." }, { status: 400 });
    if (code === "INVALID_STATION_SELECTION") return NextResponse.json({ error: "One or more selected stations are no longer available." }, { status: 409 });
    if (code === "STATION_HAS_NO_ACTIVE_PERSONNEL") return NextResponse.json({ error: "Every selected station must have active BFP personnel." }, { status: 409 });
    if (code === "INVALID_DISPATCH_INPUT") return NextResponse.json({ error: "Invalid dispatch selection." }, { status: 400 });
    if ((error as { code?: string } | null)?.code === "23505") return NextResponse.json({ error: "This incident already has an active station dispatch." }, { status: 409 });
    console.error("Municipal station dispatch failed", error);
    return NextResponse.json({ error: "Unable to dispatch this incident." }, { status: 500 });
  }
}
