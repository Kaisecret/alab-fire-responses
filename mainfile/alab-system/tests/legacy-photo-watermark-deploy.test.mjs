import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const script = join(process.cwd(), "scripts", "watermark-legacy-photos.mjs");

test("the production deploy watermarks old photos after the release migrations", () => {
  const { buildCommand } = JSON.parse(readFileSync("vercel.json", "utf8"));
  assert.equal(buildCommand, "node scripts/apply-resident-profile-migrations.mjs && node scripts/apply-command-migration.mjs && node scripts/watermark-legacy-photos.mjs && npm run build");
});

test("a deploy without storage credentials skips the job instead of failing the build", () => {
  // An empty working directory has no .env files to load.
  const empty = mkdtempSync(join(tmpdir(), "alab-watermark-"));
  try {
    const run = spawnSync(process.execPath, [script], { cwd: empty, env: { PATH: process.env.PATH }, encoding: "utf8", timeout: 60_000 });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /Legacy photo watermark skipped: storage credentials are not set/);
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
});

test("preview deploys never touch production photos", () => {
  const run = spawnSync(process.execPath, [script], { env: { PATH: process.env.PATH, VERCEL_ENV: "preview" }, encoding: "utf8", timeout: 60_000 });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Skipping legacy photo watermark for Vercel preview deployment/);
});
