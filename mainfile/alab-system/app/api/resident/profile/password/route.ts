import { NextRequest, NextResponse } from "next/server";

import { hashPassword, verifyPassword } from "../../../../../lib/auth/password";
import { RESIDENT_SESSION_COOKIE, verifyResidentSession } from "../../../../../lib/auth/session";
import { getDatabase } from "../../../../../lib/db";

export const runtime = "nodejs";

export async function PUT(request: NextRequest) {
  try {
    const session = verifyResidentSession(request.cookies.get(RESIDENT_SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "Sign in to change your password." }, { status: 401 });
    const { currentPassword, newPassword, confirmPassword } = await request.json() as Record<string, string>;
    if (!currentPassword || !newPassword || !confirmPassword) return NextResponse.json({ error: "Complete every password field." }, { status: 400 });
    if (newPassword !== confirmPassword) return NextResponse.json({ error: "New passwords do not match." }, { status: 400 });
    if (newPassword.length < 8) return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
    const result = await getDatabase().query<{ password_hash: string }>("select password_hash from users where id = $1 and role = 'RESIDENT' limit 1", [session.userId]);
    const user = result.rows[0];
    if (!user || !(await verifyPassword(currentPassword, user.password_hash))) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    const passwordHash = await hashPassword(newPassword);
    await getDatabase().query("update users set password_hash = $1, updated_at = now() where id = $2 and role = 'RESIDENT'", [passwordHash, session.userId]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Resident password update failed", error);
    return NextResponse.json({ error: "Unable to change your password right now." }, { status: 500 });
  }
}
