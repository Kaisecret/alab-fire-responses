import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("Backend accounts library exports updateBfpProfile for municipal officers", () => {
  const accounts = source("lib/auth/bfp-accounts.ts");
  assert.match(accounts, /export async function updateBfpProfile\s*\(/);
  assert.match(accounts, /update bfp_personnel_profiles/i);
  assert.match(accounts, /display_name/);
  assert.match(accounts, /rank_or_position/);
});

test("Photo storage module exports deleteBfpProfilePhoto for resetting avatars", () => {
  const photos = source("lib/auth/bfp-profile-photos.ts");
  assert.match(photos, /export async function deleteBfpProfilePhoto\s*\(/);
  assert.match(photos, /signedUrlCache\.delete\(userId\)/);
});

test("Municipal /api/municipal-bfp/me supports GET with photoUrl and PATCH with session update", () => {
  const route = source("app/api/municipal-bfp/me/route.ts");
  assert.match(route, /export async function GET/);
  assert.match(route, /createBfpProfilePhotoUrl/);
  assert.match(route, /photoUrl/);
  assert.match(route, /export async function PATCH/);
  assert.match(route, /updateBfpProfile/);
  assert.match(route, /bfpSessionCookieName/);
  assert.match(route, /createBfpSession/);
});

test("Municipal profile photo route handles upload and reset", () => {
  const photoRoutePath = "app/api/municipal-bfp/profile/photo/route.ts";
  assert.ok(existsSync(join(root, photoRoutePath)), "Photo route should exist");
  const photoRoute = source(photoRoutePath);
  assert.match(photoRoute, /export async function POST/);
  assert.match(photoRoute, /uploadBfpProfilePhoto/);
  assert.match(photoRoute, /export async function DELETE/);
  assert.match(photoRoute, /deleteBfpProfilePhoto/);
});

test("Municipal profile UI allows editing profile, changing photo/default, and updating password", () => {
  const page = source("app/municipal-bfp/profile/page.tsx");

  // Avatar upload and default reset
  assert.match(page, /type="file"/);
  assert.match(page, /accept="image\//);
  assert.match(page, /api\/municipal-bfp\/profile\/photo/);
  assert.match(page, /resetToDefaultAvatar|Reset to default|Default Insignia/i);

  // Profile update capability
  assert.match(page, /isEditing|setIsEditing/);
  assert.match(page, /method:\s*["']PATCH["']/);
  assert.match(page, /Save changes|Save profile/i);

  // Password update modal/trigger
  assert.match(page, /change-password|Change password|Update password/i);
  assert.match(page, /api\/auth\/bfp\/change-password/);
});
