import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const script = resolve("mainfile/alab-system/scripts/vercel-ignore-build.mjs");
const liveProject = "prj_4kiDvWv1tQinQzFuuZ4iNHZUhSMA";

function run(environment, cwd = process.cwd()) {
  const env = { ...process.env };
  for (const name of ["VERCEL_PROJECT_ID", "VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_GIT_PREVIOUS_SHA"]) delete env[name];
  return spawnSync(process.execPath, [script], { cwd, env: { ...env, ...environment }, encoding: "utf8", timeout: 5000 });
}

test("obsolete Vercel projects skip builds before checking Git changes", () => {
  const result = run({ VERCEL_PROJECT_ID: "prj_obsolete_bdtd" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Skipping.*project/);
});

test("bdtd deployment URLs skip builds when project ID is unavailable", () => {
  const result = run({ VERCEL_URL: "alab-fire-responses-bdtd-example.vercel.app" });
  assert.equal(result.status, 0, result.stderr);
});

test("the live project builds its first deployment", () => {
  assert.equal(run({ VERCEL_PROJECT_ID: liveProject }).status, 1);
});

test("the live project retains Git change detection", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "alab-vercel-target-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  function git(...args) {
    const result = spawnSync("git", args, { cwd: directory, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  }
  git("init", "--quiet");
  await writeFile(join(directory, "app.txt"), "first\n");
  git("add", "app.txt");
  git("-c", "user.name=Deployment Test", "-c", "user.email=test@example.invalid", "commit", "--quiet", "-m", "Initial");
  const initial = git("rev-parse", "HEAD");
  const environment = { VERCEL_PROJECT_ID: liveProject, VERCEL_GIT_PREVIOUS_SHA: initial };
  assert.equal(run(environment, directory).status, 0, "unchanged application should skip");
  await writeFile(join(directory, "app.txt"), "changed\n");
  git("add", "app.txt");
  git("-c", "user.name=Deployment Test", "-c", "user.email=test@example.invalid", "commit", "--quiet", "-m", "Change");
  assert.equal(run(environment, directory).status, 1, "changed application should build");
});

test("Vercel uses the project guard as its ignored build command", async () => {
  const config = JSON.parse(await readFile("mainfile/alab-system/vercel.json", "utf8"));
  assert.equal(config.ignoreCommand, "node scripts/vercel-ignore-build.mjs");
});
