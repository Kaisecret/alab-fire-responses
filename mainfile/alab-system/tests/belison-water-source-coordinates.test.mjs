import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("Belison coordinate migration preserves chart values and changes only its 19 hydrants", async () => {
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
    const names = ["Anini-y", "Barbaza", "Belison", "Bugasong", "Caluya", "Culasi", "Hamtic", "Libertad", "Pandan", "Patnongon", "San Jose de Buenavista", "San Remigio", "Sebaste", "Sibalom", "Tibiao", "Tobias Fornier", "Valderrama"];
    for (const name of names) {
      await db.query("insert into public.municipalities (name, province) values ($1, 'Antique')", [name]);
    }
    await db.exec(`begin; ${readFileSync("supabase/migrations/20260923115621_add_water_sources_registry.sql", "utf8")} commit;`);
    const before = await db.query("select import_sequence, latitude, longitude from public.water_sources order by import_sequence");
    const migration = readFileSync("supabase/migrations/20260924103000_relocate_belison_demo_water_sources.sql", "utf8");
    await db.exec(`begin; ${migration} commit;`);
    const after = await db.query(`
      select source.import_sequence, source.latitude, source.longitude,
             source.original_latitude, source.original_longitude, source.coordinate_basis,
             municipality.name
      from public.water_sources source
      join public.municipalities municipality on municipality.id = source.municipality_id
      order by source.import_sequence
    `);
    const belison = after.rows.filter((row) => row.name === "Belison");
    assert.equal(belison.length, 19);
    assert.equal(new Set(belison.map((row) => `${row.latitude},${row.longitude}`)).size, 19);
    for (const row of belison) {
      const original = before.rows.find((item) => item.import_sequence === row.import_sequence);
      assert.equal(row.original_latitude, original.latitude);
      assert.equal(row.original_longitude, original.longitude);
      assert.equal(row.coordinate_basis, "THESIS_DEMO_APPROXIMATION");
      assert.ok(Number(row.latitude) > 10.83 && Number(row.latitude) < 10.845);
      assert.ok(Number(row.longitude) > 121.955 && Number(row.longitude) < 121.975);
    }
    for (const row of after.rows.filter((item) => item.name !== "Belison")) {
      const original = before.rows.find((item) => item.import_sequence === row.import_sequence);
      assert.equal(row.latitude, original.latitude);
      assert.equal(row.longitude, original.longitude);
      assert.equal(row.coordinate_basis, "RECORDED");
    }
    await db.exec(`begin; ${migration} commit;`);
    const repeated = await db.query(`
      select import_sequence, latitude, longitude, original_latitude, original_longitude
      from public.water_sources where import_sequence between 7 and 25
      order by import_sequence
    `);
    assert.deepEqual(repeated.rows.map((row) => ({
      import_sequence: row.import_sequence,
      latitude: row.latitude,
      longitude: row.longitude,
      original_latitude: row.original_latitude,
      original_longitude: row.original_longitude,
    })), belison.map((row) => ({
      import_sequence: row.import_sequence,
      latitude: row.latitude,
      longitude: row.longitude,
      original_latitude: row.original_latitude,
      original_longitude: row.original_longitude,
    })));
  } finally {
    await db.close();
  }
});
