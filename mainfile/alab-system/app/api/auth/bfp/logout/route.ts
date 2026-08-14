import { NextResponse } from "next/server";

import { BFP_SESSION_COOKIE, bfpSessionCookie } from "../../../../../lib/auth/session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/municipal-bfp/login", request.url), 303);
  response.cookies.set(BFP_SESSION_COOKIE, "", { ...bfpSessionCookie, expires: new Date(0), maxAge: 0 });
  return response;
}
