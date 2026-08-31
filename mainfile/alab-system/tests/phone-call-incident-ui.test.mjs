import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(path, "utf8");

test("municipal incident views expose From Phone Caller without requiring a resident profile", () => {
  const queue = source("app/api/municipal-bfp/incidents/route.ts");
  const detail = source("app/api/municipal-bfp/incidents/[id]/route.ts");
  const queueUi = source("app/municipal-bfp/active-incidents/page.tsx");
  const detailUi = source("app/_components/municipal-incident-detail.tsx");
  const gisUi = source("app/_components/municipal-gis-incident-modal.tsx");

  assert.match(queue, /fr\.report_source as "reportSource"/);
  assert.match(detail, /left join resident_profiles/);
  assert.match(detail, /fr\.report_source as "reportSource"/);
  assert.match(queueUi, /From Phone Caller/);
  assert.match(detailUi, /From Phone Caller/);
  assert.match(gisUi, /From Phone Caller/);
});

test("phone call intake provides a draggable map pin and explicit responder selection", () => {
  const intake = source("app/_components/municipal-phone-call-incident-intake.tsx");
  assert.match(intake, /import\("leaflet"\)/);
  assert.match(intake, /draggable:\s*true/);
  assert.match(intake, /marker\.on\("dragend"/);
  assert.match(intake, /map\.on\("click"/);
  assert.match(intake, /zoomControl:\s*true/);
  assert.match(intake, /Caller name/);
  assert.match(intake, /Caller phone/);
  assert.match(intake, /From Phone Caller/);
  assert.match(intake, /\/api\/municipal-bfp\/stations\/\$\{stationId\}\/responders/);
  assert.match(intake, /Create & Dispatch/);
});

test("phone call intake submits only supported fire type values", () => {
  const intake = source("app/_components/municipal-phone-call-incident-intake.tsx");
  assert.match(intake, /"HOUSE_BUILDING"/);
  assert.match(intake, /"GRASS"/);
  assert.match(intake, /"FOREST"/);
  assert.match(intake, /"VEHICLE"/);
  assert.match(intake, /"OTHER"/);
});
