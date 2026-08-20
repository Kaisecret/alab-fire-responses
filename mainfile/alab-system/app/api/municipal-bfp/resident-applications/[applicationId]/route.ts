import { NextRequest, NextResponse } from "next/server";

import { getMunicipalReviewer, getResidentApplication } from "../../../../../lib/resident-applications/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ applicationId: string }> }) {
  try {
    const reviewer = await getMunicipalReviewer(request);
    if (!reviewer?.municipalityId) return NextResponse.json({ error: "Municipal BFP sign-in is required." }, { status: 401 });
    const { applicationId } = await context.params;
    const application = await getResidentApplication(reviewer.municipalityId, applicationId);
    if (!application) return NextResponse.json({ error: "Application not found in your municipality." }, { status: 404 });
    return NextResponse.json({ application });
  } catch (error) {
    console.error("Resident application detail failed", error);
    return NextResponse.json({ error: "Unable to load this resident application." }, { status: 500 });
  }
}
