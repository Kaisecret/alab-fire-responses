import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

// The database refuses any notification whose event type is not in its check
// constraint. When the backup and alarm events were added only in code, every
// "your municipality is called" alarm was rejected and the called station
// heard nothing. The newest migration that sets the constraint must allow
// every event the code can write.
test("the database allows every notification event the code writes", () => {
  const types = readFileSync(new URL("../lib/notifications/types.ts", import.meta.url), "utf8");
  const block = types.match(/NOTIFICATION_EVENTS = \[([\s\S]*?)\] as const/)?.[1] ?? "";
  const events = [...block.matchAll(/"([A-Z_]+)"/g)].map((match) => match[1]);
  assert.ok(events.includes("ALARM_DECLARED"), "the event list was read");

  const dir = new URL("../supabase/migrations/", import.meta.url);
  const setters = readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .filter((name) => /add constraint account_notifications_event_type_check/i.test(readFileSync(new URL(name, dir), "utf8")));
  const latestName = setters.at(-1) ?? "";
  const latest = latestName ? readFileSync(new URL(latestName, dir), "utf8") : "";
  const constraint = latest.slice(latest.search(/add constraint account_notifications_event_type_check/i));
  const allowed = new Set([...constraint.slice(0, constraint.indexOf(";")).matchAll(/'([A-Z_]+)'/g)].map((match) => match[1]));

  const missing = events.filter((event) => !allowed.has(event));
  assert.deepEqual(missing, [], `events the database would reject: ${missing.join(", ")}`);

  // Production gets it through the release runner the Vercel build calls.
  const runner = readFileSync(new URL("../scripts/apply-command-migration.mjs", import.meta.url), "utf8");
  assert.match(runner, new RegExp(`version: "${latestName.slice(0, 14)}"`), `${latestName} is applied on deploy`);
});
