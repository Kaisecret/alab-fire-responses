import { NextResponse } from "next/server";

import { bfpSessionCookieName, bfpSessionCookie, type BfpRole } from "../../../../../lib/auth/session";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let portal: "MUNICIPAL" | "PROVINCIAL" | undefined;
  try {
    if (contentType.includes("application/json")) {
      const body = await request.json() as { portal?: "MUNICIPAL" | "PROVINCIAL" };
      portal = body.portal;
    } else {
      const form = await request.formData();
      const value = form.get("portal");
      portal = value === "PROVINCIAL" ? "PROVINCIAL" : value === "MUNICIPAL" ? "MUNICIPAL" : undefined;
    }
  } catch {
    return NextResponse.json({ error: "Invalid logout request." }, { status: 400 });
  }
  if (!portal) return NextResponse.json({ error: "Select a BFP portal to sign out." }, { status: 400 });

  const role: BfpRole = portal === "PROVINCIAL" ? "PROVINCIAL_BFP" : "MUNICIPAL_BFP";
  const loginPath = portal === "PROVINCIAL" ? "/provincial-bfp/login" : "/municipal-bfp/login";
  const response = NextResponse.redirect(new URL(loginPath, request.url), 303);
  response.cookies.set(bfpSessionCookieName(role), "", { ...bfpSessionCookie, expires: new Date(0), maxAge: 0 });
  return response;
}
