import { NextResponse } from "next/server";

import { RESIDENT_SESSION_COOKIE, residentSessionCookie } from "../../../../lib/auth/session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/resident/login", request.url), 303);
  response.cookies.set(RESIDENT_SESSION_COOKIE, "", {
    ...residentSessionCookie,
    expires: new Date(0),
    maxAge: 0,
  });
  return response;
}
