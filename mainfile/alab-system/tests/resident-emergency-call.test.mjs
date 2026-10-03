import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(path, "utf8");

test("the landing hero lets anyone call BFP in one tap", () => {
  const content = source("app/_content/emergency-call.ts");
  assert.match(content, /class="button hero__emergency" data-call-bfp/);
  assert.match(content, /Fire emergency\?/);

  const landing = source("app/_components/landing-page.tsx");
  assert.match(landing, /<a class="button button--secondary" href="#incidents">/);
  assert.match(landing, /heroEmergencyMarkup/);
  // It replaces "View active incidents" rather than adding a third action.
  assert.match(landing, /landingMarkup\.slice\(0, start\)\}\$\{heroEmergencyMarkup\}\$\{landingMarkup\.slice\(end \+ 4\)\}/);
  assert.match(landing, /dangerouslySetInnerHTML=\{\{ __html: markup \}\}/);
  assert.match(landing, /querySelector\("\[data-call-bfp\]"\)/);
  assert.match(landing, /dispatchEvent\(new Event\(OPEN_BFP_HOTLINES\)\)/);
  assert.match(landing, /<ResidentOfflineEmergency \/>/);
});

test("the login and sign-up forms carry no emergency button", () => {
  for (const path of ["app/_components/login-page.tsx", "app/_components/signup-page.tsx"]) {
    assert.doesNotMatch(source(path), /emergency-call|data-call-bfp/, `${path} still shows the emergency button`);
  }
});

test("an applicant waiting for approval can still call BFP", () => {
  const application = source("app/resident/application/page.tsx");
  assert.match(application, /\{!isApproved && \(\s*<div className="approval-emergency">/);
  assert.match(application, /dispatchEvent\(new Event\(OPEN_BFP_HOTLINES\)\)/);
});
