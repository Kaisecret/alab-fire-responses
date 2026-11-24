import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("incident dossier keeps short labels and drops filler lines", () => {
  const detail = read("../app/_components/provincial-report-detail.tsx");
  for (const filler of ["Tactical Ground Reconnaissance Map", "120m Safety Perimeter", "WGS84 Datum", "Caller initial report",
    "BFP Antique Jurisdiction", "Active tactical operation", "Reporter Information Snapshot", "Verified ALAB Resident Mobile Account",
    "Municipal Dispatches & Responding Units", "Dispatch Unit #", "milestones", "response latency"]) {
    assert.doesNotMatch(detail, new RegExp(filler.replace(/[#&]/g, "\\$&")), `"${filler}" is gone`);
  }
  for (const label of ["Location", "Fire type", "Reported", "Response", "Resolved", "Coordinates", "Location map", "Reporter", "Photos", "Dispatches"]) {
    assert.match(detail, new RegExp(`'${label}'|>${label}<`), `"${label}" is shown`);
  }
  assert.doesNotMatch(detail, /border-left: \dpx solid/, "No colored side stripe");
});

test("verified user identity photos open only in the viewer, which names each photo", () => {
  const review = read("../app/_components/provincial-resident-application-review.tsx");
  const viewer = read("../app/_components/photo-lightbox.tsx");
  assert.doesNotMatch(review, /par-evidence-img/, "No inline identity photos");
  assert.match(review, /className="par-evidence-tile"/);
  assert.match(review, /grid-auto-rows: 1fr/, "Tiles share one height");
  assert.match(review, /labels=\{uploadedEvidence\.map\(\(item\) => item\.label\)\}/);
  assert.doesNotMatch(review, /border-left: \dpx solid/, "No side stripe on history notes");
  assert.match(viewer, /labels\?: string\[\]/);
  assert.match(viewer, /className=\{`plb-thumb/, "Thumbnails switch photos");
  assert.match(viewer, /event\.key === "Escape"/, "Escape still closes");
});
