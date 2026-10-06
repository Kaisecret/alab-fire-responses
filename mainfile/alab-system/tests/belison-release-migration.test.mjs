import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import pg from "pg";
import { PGlite } from "@electric-sql/pglite";

test("deployment build applies Belison coordinates before the app is built", async () => {
  const db = new PGlite();
  const originalClient = pg.Client;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create table public.users (id uuid primary key, email text not null);
      create table public.resident_profiles (id uuid primary key);
      create table public.barangays (id uuid primary key);
      create table public.municipalities (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        province text not null
      );
      create table public.intermunicipal_assistance_requests (is_provincial_command boolean);
      create table public.fire_trucks (record_origin text not null);
      create table public.fire_reports (
        id uuid primary key default gen_random_uuid(),
        status text not null,
        latitude numeric(9, 6) not null,
        longitude numeric(9, 6) not null,
        submitted_at timestamptz not null default now()
        , municipality_id uuid, barangay_id uuid
      );
      insert into public.fire_trucks
        select 'BFP_FIRETRUCK_INVENTORY' from generate_series(1, 29);
      -- As production has it: the event list from before backups and alarms.
      create table public.account_notifications (
        id uuid primary key default gen_random_uuid(),
        event_type text not null,
        constraint account_notifications_event_type_check check (event_type in ('FIRE_REPORT_CREATED', 'ASSISTANCE_REQUESTED'))
      );
    `);
    const names = ["Anini-y", "Barbaza", "Belison", "Bugasong", "Caluya", "Culasi", "Hamtic", "Laua-an", "Libertad", "Pandan", "Patnongon", "San Jose de Buenavista", "San Remigio", "Sebaste", "Sibalom", "Tibiao", "Tobias Fornier", "Valderrama"];
    for (const name of names) {
      await db.query("insert into public.municipalities (name, province) values ($1, 'Antique')", [name]);
    }
    await db.exec(`begin; ${readFileSync("supabase/migrations/20260923115621_add_water_sources_registry.sql", "utf8")} commit;`);
    pg.Client = class {
      async connect() {}
      async end() {}
      async query(sql, params) {
        if (params) throw new Error("Unexpected parameterized query in fixture");
        const results = await db.exec(sql);
        return { rows: results.at(-1)?.rows ?? [] };
      }
    };
    process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
    await import(`../scripts/apply-command-migration.mjs?belison-release=${Date.now()}`);

    const result = await db.query(`
      select count(*)::int as count from public.water_sources
      where coordinate_basis = 'THESIS_DEMO_APPROXIMATION'
    `);
    assert.equal(result.rows[0].count, 19);
    const follows = await db.query(`select relrowsecurity from pg_class where oid = 'public.resident_fire_report_follows'::regclass`);
    assert.equal(follows.rows[0].relrowsecurity, true, 'the release installs protected incident follower access');
    const permissions = await db.query(`select has_table_privilege('anon', 'public.resident_fire_report_follows', 'SELECT') as anon_select,
      has_table_privilege('authenticated', 'public.resident_fire_report_follows', 'SELECT') as authenticated_select`);
    assert.equal(permissions.rows[0].anon_select, false);
    assert.equal(permissions.rows[0].authenticated_select, false);
    const alerts = await db.query("select relrowsecurity from pg_class where oid='public.provincial_barangay_alerts'::regclass");
    assert.equal(alerts.rows[0].relrowsecurity, true);
    const municipalAlerts = await db.query("select indexdef from pg_indexes where indexname='provincial_barangay_alerts_open_municipality_idx'");
    assert.match(municipalAlerts.rows[0]?.indexdef ?? '', /\(municipality_id\)/, 'the release keeps one open alert per municipality');
    // A municipality called by a provincial alarm gets its alarm notice saved.
    await db.query("insert into public.account_notifications (event_type) values ('ALARM_DECLARED'), ('BACKUP_REQUESTED'), ('BACKUP_FORWARDED')");
  } finally {
    pg.Client = originalClient;
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    await db.close();
  }
});
