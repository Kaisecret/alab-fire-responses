import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("resident login never redirects on a browser flag; only the proxy sends signed-in residents home", () => {
  // Regression: an expired session plus a leftover localStorage flag made the login page
  // jump to /resident, the proxy sent it back to /resident/login, and the page reloaded forever.
  const login = readFileSync("app/_components/login-page.tsx", "utf8");
  assert.doesNotMatch(login, /window\.location\.replace\("\/resident"\)/);
  assert.doesNotMatch(login, /setItem\("alab_resident_logged_in"/);
  assert.match(login, /removeItem\("alab_resident_logged_in"\)/);

  const proxy = readFileSync("proxy.ts", "utf8");
  assert.match(proxy, /path === "\/resident\/login"[\s\S]*verifyResidentSession[\s\S]*homeUrl\.pathname = "\/resident"/);
});
