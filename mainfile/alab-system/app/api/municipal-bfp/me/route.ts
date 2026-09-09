import { NextRequest, NextResponse } from "next/server";

import { getBfpIdentity, updateBfpProfile } from "../../../../lib/auth/bfp-accounts";
import { isLocalUiPreviewEnabled } from "../../../../lib/auth/local-ui-preview";
import { bfpSessionCookie, bfpSessionCookieName, createBfpSession, verifyBfpSession } from "../../../../lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (isLocalUiPreviewEnabled()) {
    return NextResponse.json({
      user: {
        displayName: "Municipal BFP Preview",
        email: "preview@municipal-bfp.local",
        rankOrPosition: "Municipal Fire Marshal",
        municipalityId: "local-preview-municipality",
        municipalityName: "San Jose de Buenavista",
        assignmentRole: "MUNICIPAL_ADMIN",
        mustChangePassword: false,
        photoUrl: null,
      },
    });
  }
  const session = verifyBfpSession(request.cookies.get(bfpSessionCookieName("MUNICIPAL_BFP", request.headers))?.value);
  if (!session || session.role !== "MUNICIPAL_BFP") return NextResponse.json({ error: "Municipal BFP sign-in is required." }, { status: 401 });
  try {
    const identity = await getBfpIdentity(session.userId);
    if (!identity || identity.role !== "MUNICIPAL_BFP" || !identity.municipalityId) return NextResponse.json({ error: "Your municipal access is no longer active." }, { status: 403 });

    let photoUrl: string | null = null;
    try {
      const { createBfpProfilePhotoUrl } = await import("../../../../lib/auth/bfp-profile-photos");
      photoUrl = await createBfpProfilePhotoUrl(session.userId);
    } catch {
      photoUrl = null;
    }

    return NextResponse.json({
      user: {
        displayName: identity.displayName,
        email: identity.email,
        rankOrPosition: identity.rankOrPosition,
        municipalityId: identity.municipalityId,
        municipalityName: identity.municipalityName,
        assignmentRole: identity.assignmentRole,
        mustChangePassword: identity.mustChangePassword,
        photoUrl,
      },
    });
  } catch (error) {
    console.error("Municipal BFP identity lookup failed", error);
    return NextResponse.json({ error: "Unable to load your municipal profile." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = verifyBfpSession(request.cookies.get(bfpSessionCookieName("MUNICIPAL_BFP", request.headers))?.value);
  if (!session || session.role !== "MUNICIPAL_BFP") return NextResponse.json({ error: "Municipal BFP sign-in is required." }, { status: 401 });

  let body: { displayName?: unknown; rankOrPosition?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid profile update." }, { status: 400 });
  }

  try {
    const identity = await getBfpIdentity(session.userId);
    if (!identity || identity.role !== "MUNICIPAL_BFP" || !identity.municipalityId) {
      return NextResponse.json({ error: "Your municipal access is no longer active." }, { status: 403 });
    }

    await updateBfpProfile(session.userId, {
      displayName: typeof body.displayName === "string" ? body.displayName : identity.displayName,
      rankOrPosition: typeof body.rankOrPosition === "string" ? body.rankOrPosition : identity.rankOrPosition,
    });

    const updatedIdentity = await getBfpIdentity(session.userId);
    if (!updatedIdentity) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

    let photoUrl: string | null = null;
    try {
      const { createBfpProfilePhotoUrl } = await import("../../../../lib/auth/bfp-profile-photos");
      photoUrl = await createBfpProfilePhotoUrl(session.userId);
    } catch {
      photoUrl = null;
    }

    const updatedUser = {
      displayName: updatedIdentity.displayName,
      email: updatedIdentity.email,
      rankOrPosition: updatedIdentity.rankOrPosition,
      municipalityId: updatedIdentity.municipalityId,
      municipalityName: updatedIdentity.municipalityName,
      assignmentRole: updatedIdentity.assignmentRole,
      mustChangePassword: updatedIdentity.mustChangePassword,
      photoUrl,
    };

    const response = NextResponse.json({ ok: true, user: updatedUser });
    response.cookies.set(
      bfpSessionCookieName(session.role, request.headers),
      createBfpSession({
        userId: updatedIdentity.userId,
        displayName: updatedIdentity.displayName,
        role: updatedIdentity.role,
        municipalityId: updatedIdentity.municipalityId,
        mustChangePassword: updatedIdentity.mustChangePassword,
      }),
      bfpSessionCookie,
    );
    return response;
  } catch (error) {
    console.error("Municipal BFP profile update failed", error);
    const message = error instanceof Error && error.message === "INVALID_DISPLAY_NAME"
      ? "Please provide an officer name with at least 2 characters."
      : "Unable to update profile.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
