import { NextRequest, NextResponse } from "next/server";

import { getMunicipalReviewer, listResidentApplications } from "../../../../lib/resident-applications/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const reviewer = await getMunicipalReviewer(request);
    if (!reviewer?.municipalityId) return NextResponse.json({ error: "Municipal BFP sign-in is required." }, { status: 401 });
    const applications = await listResidentApplications(reviewer.municipalityId);
    return NextResponse.json({ applications, municipality: reviewer.municipalityName });
  } catch (error) {
    console.error("Resident application queue failed", error);
    return NextResponse.json({ error: "Unable to load resident applications." }, { status: 500 });
  }
}
