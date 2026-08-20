import { NextResponse } from "next/server";

import { getDatabase } from "../../../../lib/db";
import { clearLoginFailures, checkLoginRateLimit, recordLoginFailure } from "../../../../lib/auth/login-rate-limit";
import { verifyPassword } from "../../../../lib/auth/password";
import {
  createResidentApplicantSession,
  createResidentSession,
  residentApplicantCookie,
  residentSessionCookie,
  RESIDENT_APPLICANT_COOKIE,
  RESIDENT_SESSION_COOKIE,
} from "../../../../lib/auth/session";

export const runtime = "nodejs";

function clientKey(request: Request, identifier: string) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return `${forwardedFor}:${identifier.toLowerCase()}`;
}

export async function POST(request: Request) {
  let body: { identifier?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid login data." }, { status: 400 });
  }

  const identifier = typeof body.identifier === "string" ? body.identifier.trim().slice(0, 100) : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!identifier || !password) return NextResponse.json({ error: "Enter your username/email and password." }, { status: 400 });

  const key = clientKey(request, identifier);
  const limit = checkLoginRateLimit(key);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  }

  try {
    const database = getDatabase();
    const result = await database.query<{ id: string; username: string; password_hash: string; account_status: string; role: string }>(
      `SELECT id, username, password_hash, account_status, role
       FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1) LIMIT 1`,
      [identifier],
    );
    const user = result.rows[0];
    if (!user || user.role !== "RESIDENT" || user.account_status === "SUSPENDED" || !(await verifyPassword(password, user.password_hash))) {
      const failure = recordLoginFailure(key);
      const message = failure.locked ? "Too many login attempts. Try again in 15 minutes." : "Invalid username/email or password.";
      return NextResponse.json({ error: message }, { status: failure.locked ? 429 : 401 });
    }

    clearLoginFailures(key);
    if (user.account_status !== "ACTIVE") {
      const application = await database.query<{ status: string; rejection_reason: string | null }>(
        `select rv.status, rv.rejection_reason
           from resident_profiles rp join resident_verifications rv on rv.resident_profile_id = rp.id
          where rp.user_id = $1 order by rv.submitted_at desc, rv.created_at desc limit 1`,
        [user.id],
      );
      const latest = application.rows[0];
      const code = latest?.status === "CHANGES_REQUESTED" ? "APPLICATION_CHANGES_REQUESTED" : "ACCOUNT_UNDER_REVIEW";
      const response = NextResponse.json({
        code,
        redirectTo: "/resident/application",
        message: code === "APPLICATION_CHANGES_REQUESTED"
          ? "Your Municipal BFP requested corrections before approval."
          : "Your resident application is under Municipal BFP review.",
        correctionReason: latest?.rejection_reason ?? null,
      }, { status: 403 });
      response.cookies.set(RESIDENT_APPLICANT_COOKIE, createResidentApplicantSession(user.id, user.username), residentApplicantCookie);
      response.cookies.set(RESIDENT_SESSION_COOKIE, "", { ...residentSessionCookie, maxAge: 0, expires: new Date(0) });
      return response;
    }

    await database.query("UPDATE users SET last_login_at = $1, updated_at = $1 WHERE id = $2", [new Date(), user.id]);
    const response = NextResponse.json({ user: { id: user.id, username: user.username } });
    response.cookies.set(RESIDENT_SESSION_COOKIE, createResidentSession(user.id, user.username), residentSessionCookie);
    response.cookies.set(RESIDENT_APPLICANT_COOKIE, "", { ...residentApplicantCookie, maxAge: 0, expires: new Date(0) });
    return response;
  } catch (error) {
    console.error("Resident login failed", error);
    return NextResponse.json({ error: "Unable to log in right now." }, { status: 500 });
  }
}
