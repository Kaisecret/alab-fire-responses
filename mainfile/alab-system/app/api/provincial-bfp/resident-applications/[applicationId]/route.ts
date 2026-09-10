import { NextRequest, NextResponse } from "next/server";
import { getManagementActor, isProvincialAuthorizationResponse } from "../../../../../lib/provincial-bfp/auth";
import { getManagedApplication } from "../../../../../lib/provincial-bfp/management/applications";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ applicationId: string }> },
) {
  const actor = await getManagementActor(request);
  if (isProvincialAuthorizationResponse(actor)) {
    return actor;
  }

  try {
    const { applicationId } = await context.params;
    const application = await getManagedApplication(actor, applicationId);
    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    return NextResponse.json({ application });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch resident application";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
