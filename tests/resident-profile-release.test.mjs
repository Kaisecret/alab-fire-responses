import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Git deployments include the resident photo editor, endpoint and storage dependencies", () => {
  const required = [
    "app/_components/resident-profile-photo-editor.tsx",
    "app/_lib/resident-profile-photo.ts",
    "app/_lib/body-scroll-lock.ts",
    "app/api/resident/profile/photo/route.ts",
    "lib/resident-profile/photos.ts",
    "public/images/resident-avatar.webp",
    "scripts/apply-resident-profile-migrations.mjs",
  ].map(path => `mainfile/alab-system/${path}`);
  const tracked = spawnSync("git", ["ls-files", "--error-unmatch", "--", ...required], { encoding: "utf8", windowsHide: true });
  assert.equal(tracked.status, 0, "Profile functionality must be tracked in Git so the next deployment keeps it.");
  const page = readFileSync("mainfile/alab-system/app/resident/profile/page.tsx", "utf8");
  assert.match(page, /data-profile-photo-edit/);
  assert.match(page, /setPhotoEditorOpen\(true\)/);
  assert.match(page, /<ResidentProfilePhotoEditor/);
});
