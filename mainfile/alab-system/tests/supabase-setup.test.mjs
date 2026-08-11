import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("Supabase clients use the public project configuration and cookie adapters", () => {
  const browser = source("utils/supabase/client.ts");
  const server = source("utils/supabase/server.ts");

  assert.match(browser, /createBrowserClient/);
  assert.match(browser, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(browser, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(server, /createServerClient/);
  assert.match(server, /getAll\(\)/);
  assert.match(server, /setAll\(cookiesToSet\)/);
});

test("the resident proxy refreshes Supabase cookies without replacing legacy protection", () => {
  assert.equal(existsSync(join(root, "utils", "supabase", "middleware.ts")), true);
  const helper = source("utils/supabase/middleware.ts");
  const proxy = source("proxy.ts");

  assert.match(helper, /createServerClient/);
  assert.match(helper, /auth\.getClaims\(\)/);
  assert.match(helper, /if \(!supabaseUrl \|\| !supabaseKey\) return NextResponse\.next\(\)/);
  assert.match(proxy, /updateSupabaseSession/);
  assert.match(proxy, /verifyResidentSession/);
});
