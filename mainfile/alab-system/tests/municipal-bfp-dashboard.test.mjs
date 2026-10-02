import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("Municipal BFP dashboard API aggregates live incidents, verifications, stations, responders, and mutual aid", () => {
  const route = readFileSync(join(root, "app", "api", "municipal-bfp", "dashboard", "route.ts"), "utf8");
  assert.match(route, /bfpSessionCookieName\("MUNICIPAL_BFP", request\.headers\)/);
  assert.match(route, /session\.role !== "MUNICIPAL_BFP"/);
  assert.match(route, /fire_reports/);
  assert.match(route, /resident_verifications/);
  assert.match(route, /municipal_bfp_stations/);
  assert.match(route, /bfp_station_assignments/);
  assert.match(route, /incident_dispatches/);
  assert.match(route, /municipalities/);
  assert.match(route, /fire_trucks/, "truck counts come from the fleet inventory");
  assert.match(route, /PENDING_VERIFICATION/, "reports awaiting verification use the real status");
  assert.doesNotMatch(route, /charCodeAt|540-8|540-9999/, "no invented phone numbers");
});

test("Municipal BFP dashboard component connects directly to real database state with zero hardcoded mock cards", () => {
  const dash = readFileSync(join(root, "app", "_components", "municipal-bfp-dashboard.tsx"), "utf8");
  // Ensure fake static cards and hardcoded numbers are eliminated
  assert.doesNotMatch(dash, /VR-2025-0152/);
  assert.doesNotMatch(dash, /VR-2025-0151/);
  assert.doesNotMatch(dash, /<span className="mbfp-stat-value">18<\/span>/);
  assert.doesNotMatch(dash, /<span className="mbfp-stat-value">5<\/span>/);
  assert.doesNotMatch(dash, /const resourceData = \[/);
  // Ensure live dashboard fetch and dynamic data mapping
  assert.match(dash, /\/api\/municipal-bfp\/dashboard/);
  assert.match(dash, /stats/);
  assert.match(dash, /recentIncidents/);
  assert.match(dash, /pendingVerifications/);
  assert.match(dash, /stations/);
  assert.match(dash, /nearbyStations/);
  assert.doesNotMatch(dash, /540-9999|tel:/, "no hardcoded hotlines");
});

test("nearby stations are the closest other stations, with their open fires, and trucks come from the fleet", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const route = readFileSync(join(root, "app", "api", "municipal-bfp", "dashboard", "route.ts"), "utf8");
  const closed = route.match(/const CLOSED_STATUSES = "([^"]+)"/)[1];
  const nearbySql = route.slice(route.indexOf("`with home as ("), route.indexOf("limit 4`") + "limit 4`".length).slice(1, -1).replaceAll("${CLOSED_STATUSES}", closed);
  const trucksSql = route.slice(route.indexOf("`select count(*) filter (where operational_status"), route.indexOf("where municipality_id = $1`", route.indexOf("operational_status = 'SERVICEABLE'")) + "where municipality_id = $1`".length).slice(1, -1);
  const db = new PGlite();
  try {
    await db.exec(`
      create table municipalities (id text primary key, name text);
      create table municipal_bfp_stations (id text primary key, municipality_id text, station_name text, latitude numeric, longitude numeric, status text, created_at timestamptz default now());
      create table fire_reports (id text, municipality_id text, status text);
      create table fire_trucks (id text, municipality_id text, operational_status text);
      insert into municipalities values ('ham','Hamtic'),('sj','San Jose de Buenavista'),('bel','Belison'),('far','Pandan');
      insert into municipal_bfp_stations values
        ('s-ham','ham','Hamtic Fire Station',10.6964,121.9867,'ACTIVE'),
        ('s-sj','sj','San Jose Fire Station',10.7432,121.9421,'ACTIVE'),
        ('s-bel','bel','Belison Fire Station',10.8371,121.9606,'ACTIVE'),
        ('s-far','far','Pandan Fire Station',11.7166,122.0959,'ACTIVE');
      insert into fire_reports values ('r1','sj','PENDING_VERIFICATION'),('r2','sj','RESOLVED'),('r3','bel','RESPONDING');
      insert into fire_trucks values ('t1','ham','SERVICEABLE'),('t2','ham','UNSERVICEABLE'),('t3','ham','SERVICEABLE'),('t4','sj','SERVICEABLE');
    `);
    const nearby = (await db.query(nearbySql, ["ham"])).rows;
    assert.deepEqual(nearby.map((row) => row.stationName), ["San Jose Fire Station", "Belison Fire Station", "Pandan Fire Station"], "nearest first, own station excluded");
    assert.equal(nearby[0].activeIncidents, 1, "resolved reports do not count");
    assert.ok(nearby[0].distanceKm > 5 && nearby[0].distanceKm < 8, `San Jose is about 7 km away, got ${nearby[0].distanceKm}`);
    const trucks = (await db.query(trucksSql, ["ham"])).rows[0];
    assert.deepEqual({ ready: trucks.ready, total: trucks.total }, { ready: 2, total: 3 });
  } finally {
    await db.close();
  }
});
