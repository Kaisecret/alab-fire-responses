import { NextResponse } from "next/server";

import {
  checkLoginRateLimit,
  recordLoginFailure,
  checkLoginRateLimits,
  recordLoginFailures,
  clearAllLoginFailures,
} from "../../../../../lib/auth/login-rate-limit";
import { bfpSessionCookieName, createBfpSession, bfpSessionCookie, type BfpRole } from "../../../../../lib/auth/session";
import { verifyBfpCredentials } from "../../../../../lib/auth/bfp-accounts";

export const runtime = "nodejs";

function getClientIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return cfIp || realIp || forwarded || "local";
}

export async function POST(request: Request) {
  let body: { email?: string; password?: string; portal?: "MUNICIPAL" | "PROVINCIAL" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid login data." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().slice(0, 100) : "";
  const password = typeof body.password === "string" ? body.password : "";
  const expectedRole: BfpRole = body.portal === "PROVINCIAL" ? "PROVINCIAL_BFP" : "MUNICIPAL_BFP";
  if (!email || !password) return NextResponse.json({ error: "Enter your official BFP email and password." }, { status: 400 });

  const clientIp = getClientIp(request);
  const ipKey = `bfp:ip:${clientIp}`;
  const accountKey = `bfp:acc:${email.toLowerCase()}`;
  const comboKey = `bfp:${clientIp}:${email.toLowerCase()}`;
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
    const identity = await verifyBfpCredentials(email, password, expectedRole);
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
        { status: failure.locked ? 429 : 401 }
      );
    }

    if (expectedRole === "MUNICIPAL_BFP" && identity.assignmentRole !== "MUNICIPAL_ADMIN") {
      return NextResponse.json(
        {
          error: "This account is provisioned for the ALAB BFP Mobile App only. Field responder accounts cannot log in to the Municipal Web Command Portal.",
        },
        { status: 403 },
      );
    }

    clearAllLoginFailures(rateLimitKeys);
    const session = createBfpSession({
      userId: identity.userId,
      displayName: identity.displayName,
      role: identity.role,
      municipalityId: identity.municipalityId,
      assignmentRole: identity.assignmentRole,
      mustChangePassword: identity.mustChangePassword,
    });
    const response = NextResponse.json({
      mustChangePassword: identity.mustChangePassword,
      redirectTo: identity.mustChangePassword
        ? `/${body.portal === "PROVINCIAL" ? "provincial-bfp" : "municipal-bfp"}/change-password`
        : `/${body.portal === "PROVINCIAL" ? "provincial-bfp" : "municipal-bfp"}`,
    });
    response.cookies.set(bfpSessionCookieName(identity.role), session, bfpSessionCookie);
    return response;
  } catch (error) {
    console.error("BFP login failed", error);
    return NextResponse.json({ error: "Unable to log in right now." }, { status: 500 });
  }
}
