import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${request.nextUrl.origin}/auth/callback` },
  });
  if (error || !data.url) {
    const login = new URL("/resident/login", request.url);
    login.searchParams.set("error", "Google sign-in is unavailable. Please try again.");
    return NextResponse.redirect(login);
  }
  return NextResponse.redirect(data.url);
}
