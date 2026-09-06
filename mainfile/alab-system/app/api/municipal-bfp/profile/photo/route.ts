import { NextRequest, NextResponse } from "next/server";

import { createBfpProfilePhotoUrl, deleteBfpProfilePhoto, uploadBfpProfilePhoto } from "../../../../../lib/auth/bfp-profile-photos";
import { bfpSessionCookieName, verifyBfpSession } from "../../../../../lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = verifyBfpSession(request.cookies.get(bfpSessionCookieName("MUNICIPAL_BFP"))?.value);
  if (!session || session.role !== "MUNICIPAL_BFP") {
    return NextResponse.json({ error: "Municipal BFP sign-in is required." }, { status: 401 });
  }

  let photo: File;
  try {
    const formData = await request.formData();
    const candidate = formData.get("photo");
    if (!(candidate instanceof File)) {
      return NextResponse.json({ error: "Choose a JPG, PNG, or WebP profile photo." }, { status: 400 });
    }
    photo = candidate;
  } catch {
    return NextResponse.json({ error: "Unable to read the selected photo." }, { status: 400 });
  }

  try {
    await uploadBfpProfilePhoto(session.userId, photo);
    const photoUrl = await createBfpProfilePhotoUrl(session.userId);
    return NextResponse.json({ ok: true, photoUrl });
  } catch (error) {
    console.error("Municipal BFP photo upload failed", error);
    const message = error instanceof Error && error.message === "INVALID_PROFILE_PHOTO"
      ? "Please choose a JPG, PNG, or WebP image that is smaller than 5 MB."
      : "Unable to update your profile photo right now.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = verifyBfpSession(request.cookies.get(bfpSessionCookieName("MUNICIPAL_BFP"))?.value);
  if (!session || session.role !== "MUNICIPAL_BFP") {
    return NextResponse.json({ error: "Municipal BFP sign-in is required." }, { status: 401 });
  }

  try {
    await deleteBfpProfilePhoto(session.userId);
    return NextResponse.json({ ok: true, photoUrl: null });
  } catch (error) {
    console.error("Municipal BFP photo removal failed", error);
    return NextResponse.json({ error: "Unable to reset profile photo right now." }, { status: 500 });
  }
}
