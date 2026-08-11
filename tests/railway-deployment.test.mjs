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
  const appPackageJson = JSON.parse(
    await readFile(`${APP_DIRECTORY}/package.json`, "utf8"),
  );

  assert.equal(packageJson.workspaces, undefined);
  assert.equal(
    packageJson.scripts.postinstall,
    "npm install --prefix mainfile/alab-system",
  );
  assert.equal(packageJson.scripts.dev, "npm run dev --prefix mainfile/alab-system");
  assert.equal(packageJson.scripts.build, "npm run build --prefix mainfile/alab-system");
  assert.equal(packageJson.scripts.start, "node scripts/start.mjs");
  assert.equal(packageJson.engines.node, ">=20.9.0");
  assert.equal(appPackageJson.overrides.postcss, "8.5.24");
  assert.equal(appPackageJson.overrides.sharp, "0.35.3");
});

test("the standalone app lockfile installs Next beside the app", async () => {
  const lockfile = await readFile(
    `${APP_DIRECTORY}/package-lock.json`,
    "utf8",
  ).catch(() => "");

  assert.notEqual(lockfile, "", "the app package-lock.json is missing");
  const packageLock = JSON.parse(lockfile);
  assert.ok(
    packageLock.packages["node_modules/next"],
    "the app lockfile does not include Next",
  );
  assert.ok(
    packageLock.packages["node_modules/@emnapi/core"],
    "the app lockfile is missing the Linux WASM core used during Railway installs",
  );
  assert.ok(
    packageLock.packages["node_modules/@emnapi/runtime"],
    "the app lockfile is missing the Linux WASM runtime used during Railway installs",
  );
  assert.ok(
    packageLock.packages[
      "node_modules/@unrs/resolver-binding-wasm32-wasi/node_modules/@emnapi/runtime"
    ],
    "the app lockfile is missing the nested Linux WASM runtime",
  );
});

test("Railway postinstall avoids strict nested ci for platform optional packages", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));

  assert.equal(packageJson.scripts.postinstall.includes("npm ci"), false);
  assert.equal(
    packageJson.scripts.postinstall,
    `npm install --prefix ${APP_DIRECTORY}`,
  );
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
  assert.equal(
    railway.deploy.healthcheckPath,
    "/api/health/database",
  );
});
