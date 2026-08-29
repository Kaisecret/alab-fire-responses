import { NextResponse } from "next/server";

import { isMobileBfpAuthorization, requireMobileMunicipalBfp } from "../../../../lib/auth/mobile-bfp";
import { registerMobileDevice } from "../../../../lib/notifications/fcm";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = requireMobileMunicipalBfp(request);
  if (isMobileBfpAuthorization(session)) return session;
  let body: { installationId?: unknown; fcmToken?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid device registration." }, { status: 400 }); }
  if (typeof body.installationId !== "string" || typeof body.fcmToken !== "string") {
    return NextResponse.json({ error: "A device token is required." }, { status: 400 });
  }
  try {
    await registerMobileDevice(session.userId, body.installationId, body.fcmToken);
    return NextResponse.json({ registered: true });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_DEVICE_REGISTRATION") {
      return NextResponse.json({ error: "Invalid device registration." }, { status: 400 });
    }
    console.error("Mobile device registration failed", error);
    return NextResponse.json({ error: "Unable to register this device." }, { status: 500 });
  }
}
