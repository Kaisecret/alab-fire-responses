import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

const municipalities = [
  "Anini-y", "Barbaza", "Belison", "Bugasong", "Caluya", "Culasi", "Hamtic",
  "Laua-an", "Libertad", "Pandan", "Patnongon", "San Jose de Buenavista",
  "San Remigio", "Sebaste", "Sibalom", "Tibiao", "Tobias Fornier", "Valderrama",
];

test("water-source migration executes and imports the paper registry safely", async () => {
  const db = new PGlite();
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
    `);
    for (const name of municipalities) {
      await db.query("insert into public.municipalities (name, province) values ($1, 'Antique')", [name]);
    }

    const sql = readFileSync("supabase/migrations/20260923115621_add_water_sources_registry.sql", "utf8");
    await db.exec(`begin; ${sql} commit;`);

    const total = await db.query("select count(*)::int as count from public.water_sources");
    assert.equal(total.rows[0].count, 148);
    const hamtic = await db.query(`select count(*)::int as count
      from public.water_sources source
      join public.municipalities municipality on municipality.id = source.municipality_id
      where municipality.name = 'Hamtic'`);
    assert.equal(hamtic.rows[0].count, 2);

    await assert.rejects(
      db.query(`insert into public.water_sources
        (municipality_id, source_kind, quantity, exact_location, latitude, longitude, type_color, record_origin)
        select id, 'FIRE_HYDRANT', 1, 'Invalid point', 0, 0, 'Red', 'MUNICIPAL_ENTRY'
        from public.municipalities limit 1`),
      /water_sources_latitude_check|check constraint/i,
    );

    const privileges = await db.query(
      "select has_table_privilege('anon', 'public.water_sources', 'SELECT,INSERT,UPDATE,DELETE') as allowed",
    );
    assert.equal(privileges.rows[0].allowed, false);
  } finally {
    await db.close();
  }
});
