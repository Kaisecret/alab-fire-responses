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
      create table public.users (id uuid primary key);
      create table public.municipalities (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        province text not null
      );
      create table public.intermunicipal_assistance_requests (is_provincial_command boolean);
      create table public.fire_trucks (record_origin text not null);
      insert into public.fire_trucks
        select 'BFP_FIRETRUCK_INVENTORY' from generate_series(1, 29);
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
  } finally {
    pg.Client = originalClient;
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    await db.close();
  }
});
