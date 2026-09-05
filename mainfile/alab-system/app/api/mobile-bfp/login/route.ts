import { NextResponse } from "next/server";

import {
  clearLoginFailures,
  checkLoginRateLimit,
  recordLoginFailure,
  checkLoginRateLimits,
  recordLoginFailures,
  clearAllLoginFailures,
} from "../../../../lib/auth/login-rate-limit";
import { verifyBfpCredentials } from "../../../../lib/auth/bfp-accounts";
import { createBfpSession } from "../../../../lib/auth/session";
import { mobileBfpIdentityWithPhoto } from "../../../../lib/auth/mobile-bfp";

export const runtime = "nodejs";

function getClientIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return cfIp || realIp || forwarded || "local";
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

  const clientIp = getClientIp(request);
  const ipKey = `mobile-bfp:ip:${clientIp}`;
  const accountKey = `mobile-bfp:acc:${email.toLowerCase()}`;
  const comboKey = `mobile-bfp:${clientIp}:${email.toLowerCase()}`;
  const rateLimitKeys = [ipKey, accountKey, comboKey];

  const limit = checkLoginRateLimits(rateLimitKeys);
  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60);
    return NextResponse.json(
      {
        error: `Too many login attempts. Please wait ${minutes} minute${minutes > 1 ? "s" : ""} before trying again.`,
        retryAfterSeconds: limit.retryAfterSeconds,
        locked: true,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const identity = await verifyBfpCredentials(email, password, "MUNICIPAL_BFP");
    if (!identity) {
      const failure = recordLoginFailures(rateLimitKeys);
      const message = failure.locked
        ? "Too many login attempts. Please wait 2 minutes before trying again."
        : failure.attemptsRemaining > 0
          ? `Incorrect BFP email or password. (${failure.attemptsRemaining} attempt${failure.attemptsRemaining > 1 ? "s" : ""} remaining)`
          : "Incorrect BFP email or password.";
      return NextResponse.json(
        {
          error: message,
          attemptsRemaining: failure.attemptsRemaining,
          locked: failure.locked,
          retryAfterSeconds: failure.locked ? 120 : 0,
        },
        { status: failure.locked ? 429 : 401 },
      );
    }

    clearAllLoginFailures(rateLimitKeys);
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
