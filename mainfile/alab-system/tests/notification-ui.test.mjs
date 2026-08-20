import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("shared notification hook polls every five seconds only while visible", () => {
  const path = "app/_components/notifications/use-notifications.ts";
  assert.equal(existsSync(join(root, path)), true, `${path} is missing`);
  const hook = source(path);
  assert.match(hook, /5_000|5000/);
  assert.match(hook, /document\.visibilityState/);
  assert.match(hook, /visibilitychange/);
  assert.match(hook, /markAllRead/);
  assert.match(hook, /markRead/);
});

test("shared notification cards use compact report-style UI", () => {
  const card = source("app/_components/notifications/notification-card.tsx");
  const center = source("app/_components/notifications/notification-center.tsx");
  const styles = source("app/_components/notifications/notification-ui.module.css");
  assert.match(card, /notification\.title/);
  assert.match(card, /notification\.summary/);
  assert.match(card, /aria-label/);
  assert.match(center, /Unread/);
  assert.match(center, /Incidents/);
  assert.match(center, /Applications/);
  assert.match(styles, /gap:\s*8px/);
  assert.match(styles, /min-height:\s*44px/);
});

test("all three portal layouts use real shared notification bells", () => {
  const layouts = [
    source("app/resident/layout.tsx"),
    source("app/_components/municipal-bfp-layout.tsx"),
    source("app/_components/provincial-bfp-layout.tsx"),
  ];
  for (const layout of layouts) assert.match(layout, /NotificationBell/);
  assert.doesNotMatch(layouts[0], /rl-(?:m-)?notif-badge">1</);
  assert.doesNotMatch(layouts[1], /mbfp-header-notif-badge">2</);
  assert.doesNotMatch(layouts[2], /pbfp-topbar-badge">3</);

  for (const path of [
    "app/resident/notifications/page.tsx",
    "app/municipal-bfp/notifications/page.tsx",
    "app/provincial-bfp/notifications/page.tsx",
  ]) {
    assert.match(source(path), /NotificationCenter/);
  }
  assert.doesNotMatch(source("app/municipal-bfp/notifications/page.tsx"), /New fire incident reported/);
});
