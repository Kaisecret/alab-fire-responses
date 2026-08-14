import { NextRequest, NextResponse } from "next/server";

import { updateSupabaseSession } from "./utils/supabase/middleware";

const SESSION_COOKIE = "alab_resident_session";
const PROVINCIAL_BFP_SESSION_COOKIE = "alab_provincial_bfp_session";
const MUNICIPAL_BFP_SESSION_COOKIE = "alab_municipal_bfp_session";

function bfpSessionCookieName(role: "MUNICIPAL_BFP" | "PROVINCIAL_BFP") {
  return role === "PROVINCIAL_BFP"
    ? PROVINCIAL_BFP_SESSION_COOKIE
    : MUNICIPAL_BFP_SESSION_COOKIE;
}

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

async function verifyBfpSession(token: string | undefined, requiredRole: "MUNICIPAL_BFP" | "PROVINCIAL_BFP") {
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
    const session = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as { role?: string; expiresAt?: number; mustChangePassword?: boolean };
    if (session.role !== requiredRole || typeof session.expiresAt !== "number" || session.expiresAt <= Date.now()) return null;
    return session.mustChangePassword ? "PASSWORD_CHANGE_REQUIRED" : "AUTHORIZED";
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const supabaseResponse = await updateSupabaseSession(request);
  const path = request.nextUrl.pathname;
  if (path.startsWith("/resident/")) {
    if (path === "/resident/login" || path === "/resident/signup") return supabaseResponse;
    if (await verifyResidentSession(request.cookies.get(SESSION_COOKIE)?.value)) return supabaseResponse;

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/resident/login";
    loginUrl.searchParams.set("next", path);
    const redirectResponse = NextResponse.redirect(loginUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  const isMunicipal = path.startsWith("/municipal-bfp/") || path === "/municipal-bfp";
  const publicBfpPage = path.endsWith("/login") || path.endsWith("/change-password");
  if (publicBfpPage) return supabaseResponse;
  const requiredRole = isMunicipal ? "MUNICIPAL_BFP" : "PROVINCIAL_BFP";
  const bfpAccess = await verifyBfpSession(request.cookies.get(bfpSessionCookieName(requiredRole))?.value, requiredRole);
  if (bfpAccess === "AUTHORIZED") return supabaseResponse;
  if (bfpAccess === "PASSWORD_CHANGE_REQUIRED") {
    const changePasswordUrl = request.nextUrl.clone();
    changePasswordUrl.pathname = isMunicipal ? "/municipal-bfp/change-password" : "/provincial-bfp/change-password";
    return NextResponse.redirect(changePasswordUrl);
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = isMunicipal ? "/municipal-bfp/login" : "/provincial-bfp/login";
  loginUrl.searchParams.set("next", path);
  const redirectResponse = NextResponse.redirect(loginUrl);
  supabaseResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
  return redirectResponse;
}

export const config = { matcher: ["/resident/:path*", "/municipal-bfp/:path*", "/provincial-bfp/:path*"] };
