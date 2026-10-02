import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { loadServerModule } from "./helpers/load-server-module.mjs";

const source = (path) => readFileSync(path, "utf8");

class FakeNextResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status ?? 200;
    this.headers = new Map(Object.entries(init.headers ?? {}));
    this.cookieWrites = [];
    this.cookies = { set: (name, value, options) => this.cookieWrites.push({ name, value, options }) };
  }

  static json(body, init) {
    return new FakeNextResponse(body, init);
  }

  static redirect(url, status) {
    const response = new FakeNextResponse(null, { status });
    response.location = String(url);
    return response;
  }
}

function loadLogoutRoute() {
  return loadServerModule("app/api/auth/bfp/logout/route.ts", {
    "next/server": { NextResponse: FakeNextResponse },
    "../../../../../lib/auth/local-ui-preview": { isLocalUiPreviewEnabled: () => false },
    "../../../../../lib/auth/session": {
      bfpSessionCookie: { httpOnly: true, path: "/" },
      bfpSessionCookieName: (role, headers) => role === "PROVINCIAL_BFP"
        ? "alab_provincial_bfp_session"
        : `alab_municipal_bfp_session_${headers.get("x-alab-municipal-tab")}`,
    },
  });
}

test("in-app BFP sign-out gets JSON and the session cookie is expired", async () => {
  const { POST } = loadLogoutRoute();
  const tab = "0f8fad5b-d9cb-469f-a165-70867728950e";
  const response = await POST(new Request("https://alab.test/api/auth/bfp/logout", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", "x-alab-municipal-tab": tab },
    body: "portal=MUNICIPAL",
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { signedOut: true, loginPath: "/municipal-bfp/login", previewSession: false });
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.cookieWrites.length, 1);
  assert.equal(response.cookieWrites[0].name, `alab_municipal_bfp_session_${tab}`);
  assert.equal(response.cookieWrites[0].value, "");
  assert.equal(response.cookieWrites[0].options.maxAge, 0);
});

test("a plain BFP sign-out form post still redirects to the portal login", async () => {
  const { POST } = loadLogoutRoute();
  const response = await POST(new Request("https://alab.test/api/auth/bfp/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ portal: "PROVINCIAL" }),
  }));

  assert.equal(response.status, 303);
  assert.equal(response.location, "https://alab.test/provincial-bfp/login");
  assert.equal(response.cookieWrites[0].name, "alab_provincial_bfp_session");
});

function loadConfirm() {
  return loadServerModule("app/_components/bfp-logout-dialog.tsx", {
    react: { useEffect() {}, useRef() { return { current: null }; }, useState(value) { return [value, () => {}]; } },
    "react-dom": { createPortal: (node) => node },
    "react/jsx-runtime": { jsx: () => null, jsxs: () => null, Fragment: Symbol("Fragment") },
  }).confirmBfpSignedOut;
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

test("sign-out is confirmed only when /me refuses the browser afterwards", async () => {
  const confirm = loadConfirm();
  let checks = 0;
  await confirm(json({ signedOut: true }), async () => { checks += 1; return json({ error: "sign-in required" }, 401); });
  assert.equal(checks, 1);

  await assert.rejects(
    confirm(json({ signedOut: true }), async () => json({ user: { displayName: "Still here" } })),
    /still signed in/,
  );
  await assert.rejects(confirm(json({ error: "bad" }, 400), async () => json({}, 401)), /could not end your session/);
  await assert.rejects(confirm(json({ ok: true }), async () => json({}, 401)), /did not confirm/);
});

test("local UI previews skip the /me check because there is no real session", async () => {
  const confirm = loadConfirm();
  let checked = false;
  await confirm(json({ signedOut: true, previewSession: true }), async () => { checked = true; return json({}); });
  assert.equal(checked, false);
});

test("both BFP portals ask before signing out and leave only after confirmation", () => {
  for (const [path, mePath, loginPath] of [
    ["app/_components/municipal-bfp-layout.tsx", "/api/municipal-bfp/me", "/municipal-bfp/login"],
    ["app/_components/provincial-bfp-layout.tsx", "/api/provincial-bfp/me", "/provincial-bfp/login"],
  ]) {
    const layout = source(path);
    assert.match(layout, /<BfpLogoutDialog/);
    assert.match(layout, /setIsLogoutOpen\(true\)/);
    assert.doesNotMatch(layout, /onClick=\{handleLogout\}/, `${path} signs out without asking`);
    assert.match(layout, /onConfirm=\{handleLogout\}/);
    assert.match(layout, new RegExp(`confirmBfpSignedOut\\(response, \\(\\) => fetch\\('${mePath.replaceAll("/", "\\/")}'`));
    assert.match(layout, new RegExp(`window\\.location\\.replace\\('${loginPath.replaceAll("/", "\\/")}'\\)`));
    assert.match(layout, /Accept: 'application\/json'/);
  }

  const provincial = source("app/_components/provincial-bfp-layout.tsx");
  assert.match(provincial, /clearProvincialBrowserCache\(\)/);
  assert.match(provincial, /BroadcastChannel\(PROVINCIAL_SESSION_CHANNEL\)/);
  assert.match(provincial, /event\.persisted\) window\.location\.reload\(\)/);
});
