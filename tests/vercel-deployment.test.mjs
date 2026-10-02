import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

const VERCEL_CONFIG = "mainfile/alab-system/vercel.json";
const MIGRATION_SCRIPT = resolve("mainfile/alab-system/scripts/apply-command-migration.mjs");

async function runReleaseMigrations(t, vercelEnvironment, databaseUrl) {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "alab-migration-build-test-"));
  assert.equal(dirname(resolve(temporaryDirectory)), resolve(tmpdir()));
  t.after(() => rm(temporaryDirectory, { recursive: true, force: true }));

  const environment = { ...process.env, NODE_ENV: "test" };
  delete environment.DATABASE_URL;
  delete environment.VERCEL_ENV;
  if (vercelEnvironment !== undefined) environment.VERCEL_ENV = vercelEnvironment;
  if (databaseUrl !== undefined) environment.DATABASE_URL = databaseUrl;

  return spawnSync(process.execPath, [MIGRATION_SCRIPT], {
    cwd: temporaryDirectory,
    env: environment,
    encoding: "utf8",
    timeout: 5000,
  });
}

test("Vercel Hobby cron jobs run no more than once per day", async () => {
  const config = JSON.parse(await readFile(VERCEL_CONFIG, "utf8"));

  for (const cron of config.crons ?? []) {
    const fields = cron.schedule.trim().split(/\s+/);
    assert.equal(fields.length, 5, `${cron.path} must use a five-field cron schedule`);

    const [minute, hour] = fields;
    assert.match(
      minute,
      /^\d+$/,
      `${cron.path} must choose one minute per day for Vercel Hobby`,
    );
    assert.match(
      hour,
      /^\d+$/,
      `${cron.path} must choose one hour per day for Vercel Hobby`,
    );
  }
});

test("Vercel previews build without database migration credentials", async (t) => {
  const result = await runReleaseMigrations(t, "preview");
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Skipping release migrations for Vercel preview/);
});

test("Vercel previews never connect to a configured migration database", async (t) => {
  const result = await runReleaseMigrations(t, "preview", "invalid-database-url");
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Skipping release migrations for Vercel preview/);
});

for (const environment of ["production", undefined]) {
  test(`${environment ?? "local"} release migrations still require DATABASE_URL`, async (t) => {
    const result = await runReleaseMigrations(t, environment);
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /DATABASE_URL missing/);
    assert.doesNotMatch(result.stdout, /Skipping release migrations/);
  });
}
