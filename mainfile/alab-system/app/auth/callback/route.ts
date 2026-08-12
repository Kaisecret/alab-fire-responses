import { NextRequest, NextResponse } from "next/server";
import { withTransaction } from "../../../lib/db";
import { createGoogleSignupPrefill, googleSignupPrefillCookie, GOOGLE_SIGNUP_PREFILL_COOKIE } from "../../../lib/auth/google-signup-prefill";
import { createResidentSession, residentSessionCookie, RESIDENT_SESSION_COOKIE } from "../../../lib/auth/session";
import { createClient } from "../../../utils/supabase/server";

export const runtime = "nodejs";

type GoogleIdentity = { id?: string; provider?: string; identity_data?: { sub?: string; email_verified?: boolean; given_name?: string; family_name?: string; name?: string } };

function loginError(request: NextRequest, message: string) {
  const url = new URL("/resident/login", request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return loginError(request, "Google sign-in was cancelled or incomplete.");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  const user = data.user;
  const google = user?.identities?.find((identity) => identity.provider === "google") as GoogleIdentity | undefined;
  const subject = google?.identity_data?.sub ?? google?.id;
  const email = user?.email?.trim().toLowerCase();
  if (error || !user || !subject || !email || !user.email_confirmed_at || google?.identity_data?.email_verified === false) {
    return loginError(request, "Google could not verify your email address.");
  }
  const existing = await withTransaction(async (client) => {
    const found = await client.query<{ id: string; username: string; google_subject: string | null }>(
      "select id, username, google_subject from users where google_subject = $1 or (email = $2 and google_subject is null) limit 1 for update",
      [subject, email],
    );
    const resident = found.rows[0];
    if (resident && !resident.google_subject) await client.query("update users set google_subject = $1, updated_at = now() where id = $2", [subject, resident.id]);
    return resident;
  });
  if (existing) {
    const response = NextResponse.redirect(new URL("/resident", request.url));
    response.cookies.set(RESIDENT_SESSION_COOKIE, createResidentSession(existing.id, existing.username), residentSessionCookie);
    return response;
  }
  const fallbackName = google?.identity_data?.name?.trim().split(/\s+/, 2) ?? [];
  const token = createGoogleSignupPrefill({ subject, email, firstName: google?.identity_data?.given_name?.trim() || fallbackName[0] || "", lastName: google?.identity_data?.family_name?.trim() || fallbackName[1] || "" });
  const response = NextResponse.redirect(new URL("/resident/signup", request.url));
  response.cookies.set(GOOGLE_SIGNUP_PREFILL_COOKIE, token, googleSignupPrefillCookie);
  return response;
}
