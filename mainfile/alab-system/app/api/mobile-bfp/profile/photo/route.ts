import { NextResponse } from "next/server";

import { getBfpIdentity } from "../../../../../lib/auth/bfp-accounts";
import { isMobileBfpAuthorization, mobileBfpIdentityWithPhoto, requireMobileMunicipalBfp } from "../../../../../lib/auth/mobile-bfp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = requireMobileMunicipalBfp(request);
  if (isMobileBfpAuthorization(session)) return session;

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
    const { uploadBfpProfilePhoto } = await import("../../../../../lib/auth/bfp-profile-photos");
    await uploadBfpProfilePhoto(session.userId, photo);
    const identity = await getBfpIdentity(session.userId);
    if (!identity || identity.role !== "MUNICIPAL_BFP") {
      throw new Error("PROFILE_NOT_FOUND");
    }
    return NextResponse.json({ identity: await mobileBfpIdentityWithPhoto(identity) });
  } catch (error) {
    const message = error instanceof Error && error.message === "INVALID_PROFILE_PHOTO"
      ? "Please choose a JPG, PNG, or WebP image that is smaller than 5 MB."
      : "Unable to update your profile photo right now.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
