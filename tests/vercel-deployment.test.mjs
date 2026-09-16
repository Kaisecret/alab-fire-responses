import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const VERCEL_CONFIG = "mainfile/alab-system/vercel.json";

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
