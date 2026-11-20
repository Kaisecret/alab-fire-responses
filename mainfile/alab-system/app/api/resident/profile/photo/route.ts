import { NextRequest, NextResponse } from "next/server";

import { RESIDENT_SESSION_COOKIE, verifyResidentSession } from "../../../../../lib/auth/session";
import { createResidentProfilePhotoUrl, deleteResidentProfilePhoto, uploadResidentProfilePhoto } from "../../../../../lib/resident-profile/photos";

export const runtime = "nodejs";

const privateHeaders = { "Cache-Control": "private, no-store" };
const signInRequired = () => NextResponse.json({ error: "Sign in to manage your profile photo." }, { status: 401, headers: privateHeaders });

export async function GET(request: NextRequest) {
  const session = verifyResidentSession(request.cookies.get(RESIDENT_SESSION_COOKIE)?.value);
  if (!session) return signInRequired();
  try {
    const photoUrl = await createResidentProfilePhotoUrl(session.userId);
    if (request.nextUrl.searchParams.get("image") === "1") {
      return new Response(null, { status: photoUrl ? 307 : 404, headers: photoUrl ? { ...privateHeaders, Location: photoUrl } : privateHeaders });
    }
    return NextResponse.json({ photoUrl }, { headers: privateHeaders });
  } catch {
    return NextResponse.json({ error: "Unable to load your profile photo. Please try again." }, { status: 503, headers: privateHeaders });
  }
}

export async function POST(request: NextRequest) {
  const session = verifyResidentSession(request.cookies.get(RESIDENT_SESSION_COOKIE)?.value);
  if (!session) return signInRequired();
  let photo: File;
  try {
    const form = await request.formData();
    const candidate = form.get("photo");
    if (!(candidate instanceof File)) throw new Error("Missing photo");
    photo = candidate;
  } catch {
    return NextResponse.json({ error: "Choose a JPG, PNG, or WebP photo." }, { status: 400, headers: privateHeaders });
  }
  try {
    await uploadResidentProfilePhoto(session.userId, photo);
    // Saving and preview signing are separate operations. A later preview
    // outage must not report an already committed upload as a failed save.
    const photoUrl = `/api/resident/profile/photo?image=1&v=${Date.now()}`;
    console.info("Resident profile photo saved");
    return NextResponse.json({ photoUrl }, { headers: privateHeaders });
  } catch (error) {
    const invalid = error instanceof Error && error.message === "INVALID_PROFILE_PHOTO";
    return NextResponse.json({ error: invalid
      ? "Choose a readable JPG, PNG, or WebP photo smaller than 3 MB."
      : "Unable to save your profile photo. Please try again." }, { status: invalid ? 400 : 503, headers: privateHeaders });
  }
}

export async function DELETE(request: NextRequest) {
  const session = verifyResidentSession(request.cookies.get(RESIDENT_SESSION_COOKIE)?.value);
  if (!session) return signInRequired();
  try {
    await deleteResidentProfilePhoto(session.userId);
    return NextResponse.json({ photoUrl: null }, { headers: privateHeaders });
  } catch {
    return NextResponse.json({ error: "Unable to remove your profile photo. Please try again." }, { status: 503, headers: privateHeaders });
  }
}
