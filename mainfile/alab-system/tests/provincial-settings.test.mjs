import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");
const page = () => source("app/provincial-bfp/settings/page.tsx");

test("provincial settings no longer fake a save that persists nothing", () => {
  const settings = page();
  // The old page flipped a local flag and called it a saved preference.
  assert.doesNotMatch(settings, /setSaved/);
  assert.doesNotMatch(settings, /Settings successfully updated/);
  assert.doesNotMatch(settings, /Save Alert Preferences/);
  assert.doesNotMatch(settings, /Update Information/);
  // Hardcoded headquarters values were never read from or written to anything.
  assert.doesNotMatch(settings, /540-9911/);
  assert.doesNotMatch(settings, /defaultValue="Antique BFP Provincial Headquarters"/);
});

test("provincial settings read the live account, notifications, and province totals", () => {
  const settings = page();
  for (const endpoint of [
    "api/provincial-bfp/me",
    "api/provincial-bfp/notifications",
    "api/provincial-bfp/management-summary",
  ]) {
    assert.ok(settings.includes(endpoint), `settings should read ${endpoint}`);
  }
  assert.match(settings, /mustChangePassword/);
  assert.match(settings, /provincial-bfp\/change-password/);
  assert.match(settings, /provincial-bfp\/notifications/);
});

test("marking notifications read goes to the real endpoint, not local state", () => {
  const settings = page();
  assert.match(settings, /method: 'PATCH'/);
  assert.match(settings, /markAll: true/);
  assert.match(settings, /Mark all read/);
});

test("alarm doctrine renders from the shared constants and stays read-only", () => {
  const settings = page();
  assert.match(settings, /from '\.\.\/\.\.\/\.\.\/lib\/incidents\/alarm-doctrine'/);
  assert.match(settings, /ALARM_DOCTRINE\[level\]/);
  assert.match(settings, /SECOND_ALARM_MUNICIPALITIES/);
  assert.match(settings, /NEARBY_RADIUS_METERS/);
  // Reach is a standing order, so the page must not offer an input for it.
  assert.doesNotMatch(settings, /Mutual Aid Radius Warning/);
  assert.doesNotMatch(settings, /Default Escalation Alarm Trigger/);
  assert.doesNotMatch(settings, /<select/);
  assert.doesNotMatch(settings, /<input/);

  // The doctrine module stays the single source those numbers come from.
  const doctrine = source("lib/incidents/alarm-doctrine.ts");
  assert.match(doctrine, /export const SECOND_ALARM_MUNICIPALITIES = 2/);
  assert.match(doctrine, /export const NEARBY_RADIUS_METERS = 35_000/);
});
