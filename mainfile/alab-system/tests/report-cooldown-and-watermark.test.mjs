import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

async function reportsDatabase() {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite();
  await db.exec(`
    create table public.resident_profiles (id uuid primary key default gen_random_uuid(), user_id uuid not null);
    create table public.fire_reports (
      id uuid primary key default gen_random_uuid(),
      reference_number text not null,
      resident_profile_id uuid references public.resident_profiles(id),
      status text not null,
      latitude numeric(9, 6) not null,
      longitude numeric(9, 6) not null,
      reporter_ip_address inet,
      submitted_at timestamptz not null default now()
    );
  `);
  await db.exec(read("../supabase/migrations/20260930030000_link_duplicate_fire_reports.sql"));
  const client = { query: (sql, params) => db.query(sql, params), release() {} };
  return { db, client };
}

test("a resident reporting the same place again gets their own open report back", async () => {
  const { findOwnOpenReportNear } = await import("../lib/fire-reports/duplicates.ts");
  const { db, client } = await reportsDatabase();
  try {
    const me = "11111111-1111-4111-8111-111111111111";
    const neighbour = "22222222-2222-4222-8222-222222222222";
    const profile = async (userId) => (await db.query("insert into resident_profiles (user_id) values ($1) returning id", [userId])).rows[0].id;
    const mine = await profile(me);
    const theirs = await profile(neighbour);
    const insert = (reference, profileId, status, latitude, longitude, hoursAgo = 0.1, linkedTo = null) => db.query(
      `insert into fire_reports (reference_number, resident_profile_id, status, latitude, longitude, submitted_at, duplicate_of_report_id)
       values ($1, $2, $3, $4, $5, now() - ($6::text || ' hours')::interval, $7) returning id`,
      [reference, profileId, status, latitude, longitude, hoursAgo, linkedTo],
    );

    await insert("NEIGHBOUR", theirs, "PENDING_VERIFICATION", 10.7432, 121.9394);
    await insert("MINE-FAR", mine, "PENDING_VERIFICATION", 10.7440, 121.9394);    // ~100 m away
    await insert("MINE-DONE", mine, "RESOLVED", 10.7432, 121.9394);               // over
    await insert("MINE-OLD", mine, "RESPONDING", 10.7432, 121.9394, 13);          // 13 h old
    assert.equal(await findOwnOpenReportNear(client, me, 10.7431, 121.9394), null, "another resident's report is not mine");

    await insert("MINE-OPEN", mine, "VERIFIED", 10.7433, 121.9394);               // ~22 m, open
    assert.equal((await findOwnOpenReportNear(client, me, 10.7431, 121.9394))?.referenceNumber, "MINE-OPEN");

    // A report linked to a neighbour's fire follows that fire's status.
    await db.query("update fire_reports set status = 'RESOLVED' where reference_number = 'MINE-OPEN'");
    const root = (await insert("ROOT", theirs, "RESPONDING", 10.7500, 121.9500)).rows[0].id;
    await insert("MINE-LINKED", mine, "DUPLICATE", 10.7431, 121.9395, 0.05, root);
    assert.equal((await findOwnOpenReportNear(client, me, 10.7431, 121.9394))?.referenceNumber, "MINE-LINKED");
    await db.query("update fire_reports set status = 'RESOLVED' where id = $1", [root]);
    assert.equal(await findOwnOpenReportNear(client, me, 10.7431, 121.9394), null, "the linked fire is over");
  } finally {
    await db.close();
  }
});

test("one report per account every 5 minutes, two per network address", async () => {
  const limiter = await import("../lib/fire-reports/rate-limiter.ts");
  assert.equal(limiter.SOS_RATE_LIMIT_MAX_REPORTS, 1);
  assert.equal(limiter.SOS_RATE_LIMIT_MAX_REPORTS_PER_IP, 2);
  const { db, client } = await reportsDatabase();
  try {
    const me = "33333333-3333-4333-8333-333333333333";
    const other = "44444444-4444-4444-8444-444444444444";
    const profile = async (userId) => (await db.query("insert into resident_profiles (user_id) values ($1) returning id", [userId])).rows[0].id;
    const mine = await profile(me);
    const theirs = await profile(other);
    const insert = (profileId, ip, minutesAgo) => db.query(
      `insert into fire_reports (reference_number, resident_profile_id, status, latitude, longitude, reporter_ip_address, submitted_at)
       values ('R', $1, 'PENDING_VERIFICATION', 10.7, 121.9, $2::inet, now() - ($3::text || ' minutes')::interval)`,
      [profileId, ip, minutesAgo],
    );

    assert.equal((await limiter.checkResidentSosRateLimit(me, "203.0.113.7", client)).allowed, true);
    await insert(mine, "203.0.113.7", 2);
    const blocked = await limiter.checkResidentSosRateLimit(me, "203.0.113.7", client);
    assert.equal(blocked.allowed, false, "a second report within 5 minutes waits");
    assert.ok(blocked.retryAfterSeconds > 150 && blocked.retryAfterSeconds <= 180, `about 3 minutes left, got ${blocked.retryAfterSeconds}`);

    // A neighbour on the same network can still report once more.
    assert.equal((await limiter.checkResidentSosRateLimit(other, "203.0.113.7", client)).allowed, true);
    await insert(theirs, "203.0.113.7", 1);
    assert.equal((await limiter.checkResidentSosRateLimit(other, "203.0.113.7", client)).allowed, false);
    const third = "55555555-5555-4555-8555-555555555555";
    assert.equal((await limiter.checkResidentSosRateLimit(third, "203.0.113.7", client)).allowed, false, "the address used its 2 reports");
    assert.equal((await limiter.checkResidentSosRateLimit(third, "198.51.100.4", client)).allowed, true);

    // Reports older than 5 minutes no longer count.
    await db.query("update fire_reports set submitted_at = now() - interval '6 minutes'");
    assert.equal((await limiter.checkResidentSosRateLimit(me, "203.0.113.7", client)).allowed, true);
  } finally {
    await db.close();
  }
});

test("the report form opens the resident's own report instead of sending the same fire twice", () => {
  const route = read("../app/api/resident/fire-reports/route.ts");
  const ownAt = route.indexOf("findOwnOpenReportNear(");
  assert.ok(ownAt > 0 && ownAt < route.indexOf("checkResidentSosRateLimit("), "checked before the cooldown");
  assert.match(route, /existing: true/);
  assert.match(read("../lib/fire-reports/service.ts"), /findOwnOpenReportNear\(client, userId/);
  const page = read("../app/resident/report-fire/page.tsx");
  assert.match(page, /open-nearby/);
  assert.match(page, /already=1/);
  assert.match(page, /recent\.length < 1/);
  assert.match(read("../app/_content/resident-report-fire-content.ts"), /<strong>1 fire report every 5 minutes<\/strong>/);
});

test("the watermark is drawn from outlines and stays inside the photo", async () => {
  const { watermarkOverlaySvg, textOutline } = await import("../lib/media/watermark-svg.mjs");
  const svg = watermarkOverlaySvg({ width: 800, height: 600, label: "Fire report evidence", detail: "ALAB-20261002-AB12CD · Oct 2, 2026 · 2:31 PM" });
  assert.doesNotMatch(svg, /<text/, "no font needed on the server");
  assert.match(svg, /<path /);
  assert.match(svg, /fill-opacity="0\.16"/, "the pattern is faint");
  const tag = svg.match(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/);
  assert.ok(tag, "a corner tag is drawn");
  const [x, y, width, height] = tag.slice(1).map(Number);
  assert.ok(x >= 0 && y >= 0 && x + width <= 800 && y + height <= 600, "the tag fits the photo");
  // A very narrow photo shrinks the tag instead of overflowing.
  const narrow = watermarkOverlaySvg({ width: 120, height: 900, label: "x", detail: "ALAB-20261002-AB12CD · Oct 2, 2026 · 2:31 PM" });
  const [nx, , nw] = narrow.match(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)"/).slice(1).map(Number);
  assert.ok(nx + nw <= 120.01, `narrow tag fits, got ${nx + nw}`);
  assert.ok(textOutline("ALAB").width > 0);
});

test("photos get the watermark burned in, upright and still the same picture", async () => {
  const { default: sharp } = await import("sharp");
  const { watermarkImage, watermarkTime } = await import("../lib/media/watermark.ts");
  const photo = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: "#1d4ed8" } }).jpeg().toBuffer();
  const out = await watermarkImage(photo, { label: "Fire report evidence", detail: `ALAB-1 · ${watermarkTime(new Date(Date.UTC(2026, 9, 2, 6, 31)))}` });
  assert.equal(out.mimeType, "image/jpeg");
  const meta = await sharp(out.data).metadata();
  assert.equal(meta.width, 1600);
  assert.equal(meta.height, 1200);
  const plain = await sharp(photo).raw().toBuffer();
  const marked = await sharp(out.data).raw().toBuffer();
  let changed = 0;
  for (let i = 0; i < plain.length; i += 3) if (Math.abs(plain[i] - marked[i]) + Math.abs(plain[i + 2] - marked[i + 2]) > 30) changed += 1;
  const share = changed / (plain.length / 3);
  assert.ok(share > 0.003, `the watermark is visible (${share})`);
  assert.ok(share < 0.15, `the watermark covers little of the photo (${share})`);
  assert.equal(watermarkTime(new Date(Date.UTC(2026, 9, 2, 6, 31))), "Oct 2, 2026 · 2:31 PM", "Philippine time");

  const big = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: "#ffffff" } }).png().toBuffer();
  const review = await watermarkImage(big, { label: "For BFP verification only", maxSize: 1800, format: "webp" });
  const reviewMeta = await sharp(review.data).metadata();
  assert.equal(review.mimeType, "image/webp");
  assert.equal(Math.max(reviewMeta.width, reviewMeta.height), 1800);
  await assert.rejects(() => watermarkImage(Buffer.from("not an image"), { label: "x" }));
});

test("every photo residents send is stored watermarked", () => {
  const storage = read("../lib/supabase/server-storage.ts");
  assert.match(storage, /watermarkImage\(/);
  assert.match(storage, /original\//, "the untouched original is kept for investigation");
  assert.match(read("../lib/resident-applications/evidence.ts"), /watermarkImage\(original/);
  assert.match(read("../app/api/resident/fire-reports/route.ts"), /uploadFireReportPhoto\(report\.id, photo, watermark\)/);
});

test("ID photos are made smaller in the browser so a check fits Vercel's 4.5 MB request limit", () => {
  const page = read("../app/_components/signup-page.tsx");
  assert.match(page, /shrinkPhoto\(picked\)/);
  assert.match(page, /if \(preparingSides\.size > 0\) return;/, "never sends a photo that is still being prepared");
  assert.match(page, /response\.status === 413/);
  assert.match(read("../app/resident/application/page.tsx"), /shrinkPhoto\(/);
});
