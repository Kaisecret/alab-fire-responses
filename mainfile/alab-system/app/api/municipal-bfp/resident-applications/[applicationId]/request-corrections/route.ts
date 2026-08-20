import { NextRequest, NextResponse } from "next/server";

import { getMunicipalReviewer, requestResidentApplicationCorrections } from "../../../../../../lib/resident-applications/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ applicationId: string }> }) {
  let body: { reason?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter a correction reason." }, { status: 400 }); }
  try {
    const reviewer = await getMunicipalReviewer(request);
    if (!reviewer?.municipalityId) return NextResponse.json({ error: "Municipal BFP sign-in is required." }, { status: 401 });
    const { applicationId } = await context.params;
    const result = await requestResidentApplicationCorrections(reviewer.municipalityId, applicationId, reviewer.userId, body.reason ?? "");
    return NextResponse.json({ application: result, message: "Correction request sent to the resident." });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "CORRECTION_REASON_REQUIRED") return NextResponse.json({ error: "Explain what the resident must correct (at least 10 characters)." }, { status: 400 });
    if (code === "APPLICATION_NOT_FOUND") return NextResponse.json({ error: "Application not found in your municipality." }, { status: 404 });
    if (code === "APPLICATION_NOT_PENDING") return NextResponse.json({ error: "This application has already been reviewed." }, { status: 409 });
    console.error("Resident correction request failed", error);
    return NextResponse.json({ error: "Unable to request corrections." }, { status: 500 });
  }
}
