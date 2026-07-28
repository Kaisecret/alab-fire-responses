import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import test from "node:test";

const APP_DIRECTORY = "mainfile/alab-system";

test("the Next.js application is committed as regular files, not a gitlink", () => {
  const stagedEntry = execFileSync(
    "git",
    ["ls-files", "--stage", `${APP_DIRECTORY}/package.json`],
    { encoding: "utf8" },
  ).trim();

  assert.match(stagedEntry, /^100644 /);
});

test("the repository root exposes Railway build and start commands", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));

  assert.deepEqual(packageJson.workspaces, ["mainfile/alab-system"]);
  assert.equal(packageJson.scripts.build, "npm run build --workspace=alab-system");
  assert.equal(packageJson.scripts.start, "node scripts/start.mjs");
  assert.equal(packageJson.engines.node, ">=20.9.0");
  assert.equal(packageJson.overrides.postcss, "8.5.24");
  assert.equal(packageJson.overrides.sharp, "0.35.3");
});

test("the production launcher forwards Railway's host and port", async () => {
  const launcher = await readFile("scripts/start.mjs", "utf8");

  assert.match(launcher, /process\.env\.PORT/);
  assert.match(launcher, /0\.0\.0\.0/);
  assert.match(launcher, /--port/);
  assert.match(launcher, /process\.execPath/);
  assert.match(launcher, /next\/dist\/bin\/next/);
  assert.doesNotMatch(launcher, /npm\.cmd/);
});

test("Railway configuration uses the root commands and health check", async () => {
  const railway = JSON.parse(await readFile("railway.json", "utf8"));

  assert.equal(railway.build.builder, "RAILPACK");
  assert.equal(railway.build.buildCommand, "npm run build");
  assert.equal(railway.deploy.startCommand, "npm start");
  assert.equal(railway.deploy.healthcheckPath, "/");
});
