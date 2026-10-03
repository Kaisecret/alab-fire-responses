import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(path, "utf8");

test("every provincial tab loads with skeletons instead of spinners and loading text", () => {
  const uses = {
    "app/provincial-bfp/incidents/page.tsx": /SkeletonTableRows rows=\{7\} columns=\{8\}/,
    "app/provincial-bfp/assistance-requests/page.tsx": /<SkeletonPage label="Loading assistance requests"/,
    "app/provincial-bfp/gis-map/page.tsx": /<SkeletonPage variant="map"/,
    "app/provincial-bfp/incident-reports/page.tsx": /<SkeletonPage /,
    "app/provincial-bfp/reports/page.tsx": /<SkeletonPage /,
    "app/provincial-bfp/resident-applications/page.tsx": /<SkeletonPage /,
    "app/provincial-bfp/responders/page.tsx": /<SkeletonPage /,
    "app/provincial-bfp/firetrucks-stations/page.tsx": /<SkeletonPage /,
    "app/_components/provincial-bfp-dashboard.tsx": /<SkeletonList rows=\{4\}/,
    "app/_components/provincial-incident-analytics.tsx": /<SkeletonChart /,
    "app/_components/provincial-fire-trucks.tsx": /<SkeletonCards /,
    "app/_components/provincial-water-sources.tsx": /<SkeletonCards /,
    "app/_components/provincial-station-directory.tsx": /<SkeletonTableRows rows=\{5\} columns=\{6\}/,
    "app/_components/provincial-personnel-directory.tsx": /<SkeletonTableRows rows=\{6\} columns=\{7\}/,
    "app/_components/provincial-resident-directory.tsx": /<SkeletonTableRows rows=\{6\} columns=\{6\}/,
    "app/_components/provincial-municipal-accounts.tsx": /<SkeletonTableRows rows=\{6\} columns=\{5\}/,
    "app/_components/provincial-report-console.tsx": /<SkeletonTableRows rows=\{7\} columns=\{8\}/,
    "app/_components/provincial-report-detail.tsx": /<SkeletonDetail /,
    "app/_components/provincial-resident-application-review.tsx": /<SkeletonDetail /,
    "app/_components/notifications/notification-center.tsx": /<SkeletonList rows=\{5\}/,
  };
  for (const [path, pattern] of Object.entries(uses)) {
    const file = source(path);
    assert.match(file, pattern, `${path} does not load with a skeleton`);
    assert.doesNotMatch(file, /BfpDataLoader/, `${path} still uses the full loader`);
  }

  const pages = Object.keys(uses).map(source).join("\n");
  assert.doesNotMatch(pages, /Loading (provincial stations registry|municipal BFP personnel roster|resident directory|municipal account roster|active incidents|live analytics|the provincial fire truck inventory|the province-wide registry|account updates)…/);
});

test("skeleton styles are hoisted once and respect reduced motion", () => {
  const skeleton = source("app/_components/skeleton-loader.tsx");
  assert.match(skeleton, /<style href="alab-skeleton-loader" precedence="default">/);
  assert.match(skeleton, /prefers-reduced-motion: reduce\) \{ \.skl::after \{ animation: none; \}/);
  assert.match(skeleton, /role="status"/);
});
