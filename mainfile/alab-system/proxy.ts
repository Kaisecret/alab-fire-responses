import { NextRequest, NextResponse } from "next/server";

import { updateSupabaseSession } from "./utils/supabase/middleware";

const SESSION_COOKIE = "alab_resident_session";

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function bytesToBase64Url(bytes: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function verifyResidentSession(token: string | undefined) {
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret || secret.length < 32) return false;
  const [payload, receivedSignature] = token.split(".");
  if (!payload || !receivedSignature) return false;

  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expectedSignature = bytesToBase64Url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  if (expectedSignature.length !== receivedSignature.length) return false;
  let difference = 0;
  for (let index = 0; index < expectedSignature.length; index += 1) difference |= expectedSignature.charCodeAt(index) ^ receivedSignature.charCodeAt(index);
  if (difference !== 0) return false;

  try {
    const session = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as { role?: string; expiresAt?: number };
    return session.role === "RESIDENT" && typeof session.expiresAt === "number" && session.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const supabaseResponse = await updateSupabaseSession(request);
  const path = request.nextUrl.pathname;
  if (path === "/resident/login" || path === "/resident/signup") return supabaseResponse;
  if (await verifyResidentSession(request.cookies.get(SESSION_COOKIE)?.value)) return supabaseResponse;

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/resident/login";
  loginUrl.searchParams.set("next", path);
  const redirectResponse = NextResponse.redirect(loginUrl);
  supabaseResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
  return redirectResponse;
}

export const config = { matcher: ["/resident/:path*"] };
