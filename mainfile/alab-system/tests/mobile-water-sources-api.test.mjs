import assert from "node:assert/strict";
import test from "node:test";

import { loadServerModule } from "./helpers/load-server-module.mjs";

class FakeNextResponse {
  constructor(body, init = {}) { this.body = body; this.status = init.status ?? 200; }
  static json(body, init) { return new FakeNextResponse(body, init); }
}

test("mobile BFP water sources require bearer auth and return every Antique source", async () => {
  let calls = 0;
  const route = loadServerModule("app/api/mobile-bfp/water-sources/route.ts", {
    "next/server": { NextResponse: FakeNextResponse },
    "../../../../lib/auth/mobile-bfp": {
      requireMobileMunicipalBfp: (request) => request.authorized ? { userId: "responder" } : new FakeNextResponse({ error: "Sign in" }, { status: 401 }),
      isMobileBfpAuthorization: (value) => value instanceof FakeNextResponse,
    },
    "../../../../lib/water-sources/service": {
      listProvincialWaterSources: async () => {
        calls++;
        return { sources: [{ id: "a", municipalityName: "Hamtic" }, { id: "b", municipalityName: "Belison" }] };
      },
    },
  });
  assert.equal((await route.GET({ authorized: false })).status, 401);
  assert.equal(calls, 0);
  const response = await route.GET({ authorized: true });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.sources.map((source) => source.id), ["a", "b"]);
  assert.equal(calls, 1);
});
