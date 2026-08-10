import { NextResponse } from "next/server";

import { getDatabase } from "../../../../lib/db";
import { clearLoginFailures, checkLoginRateLimit, recordLoginFailure } from "../../../../lib/auth/login-rate-limit";
import { verifyPassword } from "../../../../lib/auth/password";
import { createResidentSession, residentSessionCookie, RESIDENT_SESSION_COOKIE } from "../../../../lib/auth/session";

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
    await database.query("UPDATE users SET last_login_at = $1, updated_at = $1 WHERE id = $2", [new Date(), user.id]);
    const response = NextResponse.json({ user: { id: user.id, username: user.username } });
    response.cookies.set(RESIDENT_SESSION_COOKIE, createResidentSession(user.id, user.username), residentSessionCookie);
    return response;
  } catch (error) {
    console.error("Resident login failed", error);
    return NextResponse.json({ error: "Unable to log in right now." }, { status: 500 });
  }
}
