import { NextResponse } from "next/server";
import { getGoogleSignupPrefill } from "../../../../../lib/auth/google-signup-prefill";

export async function GET() {
  const prefill = await getGoogleSignupPrefill();
  if (!prefill) return NextResponse.json({ prefill: null });
  return NextResponse.json({ prefill: { firstName: prefill.firstName, lastName: prefill.lastName, email: prefill.email } });
}
