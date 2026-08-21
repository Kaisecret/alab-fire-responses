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
  assert.match(center, /Live updates/);
  assert.match(center, /centerHeaderIcon/);
  assert.match(card, /categoryLabel/);
  assert.match(styles, /gap:\s*8px/);
  assert.match(styles, /min-height:\s*44px/);
  assert.match(styles, /#eef5fd/i);
  assert.match(styles, /backdrop-filter:\s*blur/i);
  assert.doesNotMatch(center, /ALAB-20260820|Mapatag Elementary|Just now/);
});

test("notification center stays contained and the resident sheet fits mobile screens", () => {
  const center = source("app/_components/notifications/notification-center.tsx");
  const styles = source("app/_components/notifications/notification-ui.module.css");

  assert.doesNotMatch(center, /Incident, response, and account updates in one place\./);
  assert.match(styles, /\.center,\s*\.center \*\s*\{[^}]*box-sizing:\s*border-box/s);
  assert.match(styles, /\.bellRoot,\s*\.bellRoot \*\s*\{[^}]*box-sizing:\s*border-box/s);
  assert.match(styles, /\.toolbar\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/s);
  assert.match(styles, /\.centerHeader h1\s*\{[^}]*font-size:\s*clamp\(24px,\s*3vw,\s*32px\)/s);
  assert.match(styles, /padding-bottom:\s*calc\(8px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(styles, /@media \(max-width:\s*640px\)[\s\S]*\.popoverHeader\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/s);
});

test("municipal notification center has an isolated compact desktop treatment", () => {
  const page = source("app/municipal-bfp/notifications/page.tsx");
  const center = source("app/_components/notifications/notification-center.tsx");
  const styles = source("app/_components/notifications/notification-ui.module.css");

  assert.match(page, /desktopVariant="municipal"/);
  assert.match(center, /desktopVariant\?:\s*"municipal"/);
  assert.match(center, /styles\.municipalDesktop/);
  assert.match(styles, /@media \(min-width:\s*761px\)[\s\S]*\.center\.municipalDesktop\s*\{[^}]*max-width:\s*1440px[^}]*width:\s*calc\(100% - 64px\)[^}]*margin:\s*0 auto[^}]*padding:\s*24px 0 48px/s);
  assert.match(styles, /\.municipalDesktop::before\s*\{[^}]*display:\s*none/s);
  assert.match(styles, /\.municipalDesktop \.centerHeader\s*\{[^}]*padding:\s*18px 20px[^}]*background:\s*#fff/s);
  assert.match(styles, /\.municipalDesktop \.centerHeader h1\s*\{[^}]*font-size:\s*32px/s);
  assert.match(styles, /\.municipalDesktop \.toolbar\s*\{[^}]*margin-bottom:\s*19px/s);
  assert.match(styles, /\.municipalDesktop \.centerList\s*\{[^}]*gap:\s*12px/s);
  assert.match(styles, /\.municipalDesktop \.centerList \.card\s*\{[^}]*min-height:\s*84px[^}]*padding:\s*16px 18px/s);
});

test("desktop notification popovers retain comfortable side insets", () => {
  const styles = source("app/_components/notifications/notification-ui.module.css");

  assert.match(styles, /@media \(min-width:\s*641px\)[\s\S]*\.popover\s*\{[^}]*top:\s*calc\(100% \+ 14px\)[^}]*right:\s*16px[^}]*width:\s*min\(420px,\s*calc\(100vw - 48px\)\)[^}]*max-height:\s*min\(600px/s);
  assert.match(styles, /\.popoverList \.card\s*\{[^}]*min-height:\s*88px[^}]*padding:\s*14px/s);
  assert.match(styles, /\.popoverList \.iconTile\s*\{[^}]*width:\s*48px[^}]*height:\s*48px/s);
  assert.match(styles, /\.popoverClose\s*\{[^}]*width:\s*40px[^}]*height:\s*40px/s);
  assert.match(source("app/_components/notifications/notification-bell.tsx"), /aria-label="Close notifications"/);
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
