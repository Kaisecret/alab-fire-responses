import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const appRoot = process.cwd();

test("resident offline emergency component exposes animated slide-up dialog with direct 911 and Municipal BFP dialing", () => {
  const componentPath = join(appRoot, "app", "_components", "resident-offline-emergency.tsx");
  const layoutPath = join(appRoot, "app", "resident", "layout.tsx");

  assert.ok(existsSync(componentPath), "resident-offline-emergency component must exist");
  assert.ok(existsSync(layoutPath), "resident layout must exist");

  const componentSource = readFileSync(componentPath, "utf8");
  const layoutSource = readFileSync(layoutPath, "utf8");

  // 1. Check layout integration
  assert.match(layoutSource, /ResidentOfflineEmergency/);

  // 2. Check offline event listeners
  assert.match(componentSource, /window\.addEventListener\("offline"/);
  assert.match(componentSource, /window\.addEventListener\("online"/);

  // 3. Check direct phone dial links
  assert.match(componentSource, /href="tel:911"/);
  assert.match(componentSource, /09109975737/);
  assert.match(componentSource, /0910-997-5737/);

  // 4. Check slide animation and emergency styles
  assert.match(componentSource, /offlineSlideUp/);
  assert.match(componentSource, /offline-emergency-sheet/);
  assert.match(componentSource, /offline-call-911/);
  assert.match(componentSource, /offline-call-bfp/);
});
