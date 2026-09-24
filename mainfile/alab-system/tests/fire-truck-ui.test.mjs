import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

test("municipal firetrucks page shows real inventory without an add action", () => {
  const page = read("app/municipal-bfp/firetrucks/page.tsx");
  const component = read("app/_components/municipal-fire-trucks.tsx");
  assert.match(page, /MunicipalFireTrucks/);
  assert.doesNotMatch(page, /Engine 1|BFP-SJ-001/);
  assert.match(component, /api\/municipal-bfp\/fire-trucks/);
  assert.doesNotMatch(component, /method:\s*["']POST["']/);
  assert.doesNotMatch(component, /Add fire ?truck/i);
  assert.match(component, /Records managed by Provincial BFP/);
  assert.match(component, /FireTruckDetailsDialog/);
  assert.match(component, />Retry</);
});

test("provincial fire trucks view can add a truck to a station", () => {
  const component = read("app/_components/provincial-fire-trucks.tsx");
  assert.match(component, /api\/provincial-bfp\/fire-trucks/);
  assert.match(component, /method:\s*["']POST["']/);
  assert.match(component, /Add fire truck/);
  assert.match(component, /id="truck-station"/);
  assert.match(component, /station\.municipalityId === form\.municipalityId/);
  assert.match(component, /FireTruckDetailsDialog/);
  assert.match(component, /createPortal/);
});

test("fire truck details open in a full-screen dialog on document.body", () => {
  const dialog = read("app/_components/fire-truck-details-dialog.tsx");
  const card = read("app/_components/fire-truck-card.tsx");
  const focus = read("app/_components/use-dialog-focus.ts");
  assert.match(dialog, /createPortal/);
  assert.match(dialog, /document\.body/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /position:fixed; inset:0/);
  assert.match(card, /onClick=\{\(\) => onOpen\(truck\)\}/);
  assert.match(focus, /event\.key === "Escape"/);
  assert.match(focus, /setAttribute\("inert"/);
});
