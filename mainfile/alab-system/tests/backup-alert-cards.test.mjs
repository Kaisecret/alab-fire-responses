import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("backup and alarm-call popups use the alert card with the jumping flame", () => {
  // Same card as the new-report alarm: coloured header, animated flame, report code.
  for (const path of ["app/_components/municipal-backup-alarm.tsx", "app/_components/municipal-alarm-declaration.tsx", "app/_components/provincial-backup-alarm.tsx"]) {
    const alarm = source(path);
    assert.match(alarm, /import \{ EmergencyAlertCard \} from "\.\/emergency-alert-card"/, `${path} uses the shared alert card`);
    assert.match(alarm, /<EmergencyAlertCard/, `${path} renders it`);
  }
  // A popup with one button gives it the full width.
  assert.match(source("app/_components/emergency-alert-card.tsx"), /\.eac-foot > \.eac-btn:only-child \{ grid-column:1 \/ -1; \}/);
});

test("declaring an alarm level from the provincial popup opens the incident", () => {
  const alarm = source("app/_components/provincial-backup-alarm.tsx");
  const declare = alarm.slice(alarm.indexOf("const declare = useCallback"), alarm.indexOf("if (!active) return <ProvincialBarangayAlert />"));
  assert.match(declare, /window\.location\.assign\(`\/provincial-bfp\/incidents\?incident=\$\{encodeURIComponent\(fireReportId\)\}`\)/);
  // The level being declared says so instead of every button just greying out.
  assert.match(alarm, /declaringLevel === entry\.level/);
});
