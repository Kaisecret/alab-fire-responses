import { NextResponse } from "next/server";

import { clearLoginFailures, checkLoginRateLimit, recordLoginFailure } from "../../../../lib/auth/login-rate-limit";
import { verifyBfpCredentials } from "../../../../lib/auth/bfp-accounts";
import { createBfpSession } from "../../../../lib/auth/session";
import { mobileBfpIdentityWithPhoto } from "../../../../lib/auth/mobile-bfp";

export const runtime = "nodejs";

function clientKey(request: Request, identifier: string) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return `mobile-bfp:${forwardedFor}:${identifier.toLowerCase()}`;
}

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid login data." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().slice(0, 100) : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "Enter your official BFP email and password." }, { status: 400 });
  }

  const key = clientKey(request, email);
  const limit = checkLoginRateLimit(key);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const identity = await verifyBfpCredentials(email, password, "MUNICIPAL_BFP");
    if (!identity) {
      const failure = recordLoginFailure(key);
      return NextResponse.json(
        { error: failure.locked ? "Too many login attempts. Try again in 15 minutes." : "Incorrect BFP email or password." },
        { status: failure.locked ? 429 : 401 },
      );
    }

    clearLoginFailures(key);
    const token = createBfpSession({
      userId: identity.userId,
      displayName: identity.displayName,
      role: "MUNICIPAL_BFP",
      municipalityId: identity.municipalityId,
      mustChangePassword: identity.mustChangePassword,
    });
    return NextResponse.json({
      token,
      identity: await mobileBfpIdentityWithPhoto(identity),
      mustChangePassword: identity.mustChangePassword,
    });
  } catch (error) {
    console.error("Mobile BFP login failed", error);
    return NextResponse.json({ error: "Unable to log in right now." }, { status: 500 });
  }
}
