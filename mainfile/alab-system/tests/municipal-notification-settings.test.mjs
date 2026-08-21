import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("Municipal settings use authenticated identity and real notification status", () => {
  const api = source("app/api/municipal-bfp/me/route.ts");
  const page = source("app/municipal-bfp/profile/page.tsx");

  assert.match(api, /email/);
  assert.match(api, /displayName/);
  assert.match(api, /municipalityName/);
  assert.match(page, /api\/municipal-bfp\/me/);
  assert.match(page, /In-app notifications active/);
  assert.match(page, /Updates every 5 seconds/);
  assert.match(page, /municipal-bfp\/notifications/);
  assert.doesNotMatch(page, /john\.dela\.cruz@bfp\.gov\.ph/i);
  assert.doesNotMatch(page, /Badge No\. 2020-14567/i);
});

test("Municipal settings use a neutral built-in profile avatar", () => {
  const page = source("app/municipal-bfp/profile/page.tsx");

  assert.match(page, /data-municipal-profile-avatar/);
  assert.match(page, /<svg[^>]*viewBox="0 0 24 24"/);
  assert.match(
    page,
    /\.municipal-settings__avatar\s*\{[^}]*color:\s*#334155;[^}]*background:\s*#f8fafc;/,
  );
  assert.doesNotMatch(
    page,
    /\.municipal-settings__avatar\s*\{[^}]*background:\s*#d91b10;/,
  );
});
