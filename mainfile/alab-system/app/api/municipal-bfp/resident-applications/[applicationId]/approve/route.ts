import { NextRequest, NextResponse } from "next/server";

import { approveResidentApplication, getMunicipalReviewer } from "../../../../../../lib/resident-applications/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ applicationId: string }> }) {
  try {
    const reviewer = await getMunicipalReviewer(request);
    if (!reviewer?.municipalityId) return NextResponse.json({ error: "Municipal BFP sign-in is required." }, { status: 401 });
    const { applicationId } = await context.params;
    const result = await approveResidentApplication(reviewer.municipalityId, applicationId, reviewer.userId);
    return NextResponse.json({ application: result, message: "Resident application approved." });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "APPLICATION_NOT_FOUND") return NextResponse.json({ error: "Application not found in your municipality." }, { status: 404 });
    if (code === "APPLICATION_NOT_PENDING") return NextResponse.json({ error: "This application has already been reviewed." }, { status: 409 });
    console.error("Resident application approval failed", error);
    return NextResponse.json({ error: "Unable to approve this application." }, { status: 500 });
  }
}
