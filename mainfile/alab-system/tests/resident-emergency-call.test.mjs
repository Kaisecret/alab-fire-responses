import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(path, "utf8");

test("people who cannot report in the app yet can call BFP in one tap", () => {
  const content = source("app/_content/emergency-call.ts");
  assert.match(content, /Fire emergency\? Call BFP now/);
  assert.match(content, /data-call-bfp/);

  for (const path of ["app/_components/login-page.tsx", "app/_components/signup-page.tsx"]) {
    const page = source(path);
    assert.match(page, /Markup\.replace\("<\/header>", `<\/header>\$\{emergencyCallMarkup\}`\)/, `${path} lacks the emergency button`);
    assert.match(page, /dangerouslySetInnerHTML=\{\{ __html: markup \}\}/);
    assert.match(page, /querySelector\("\[data-call-bfp\]"\)/);
    assert.match(page, /dispatchEvent\(new Event\(OPEN_BFP_HOTLINES\)\)/);
  }

  const application = source("app/resident/application/page.tsx");
  assert.match(application, /\{!isApproved && \(\s*<div className="approval-emergency">/);
  assert.match(application, /dispatchEvent\(new Event\(OPEN_BFP_HOTLINES\)\)/);

  // The hotline sheet is mounted on these screens.
  const layout = source("app/resident/layout.tsx");
  assert.match(layout, /if \(isAuth\) return <>\{children\}<ResidentOfflineEmergency \/><\/>;/);
});
