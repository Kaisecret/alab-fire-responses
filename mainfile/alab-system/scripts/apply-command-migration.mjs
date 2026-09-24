import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL missing");

// Migrations the release depends on. Each is applied once, inside a
// transaction, only when its check reports that it has not been applied yet.
const releaseMigrations = [
  {
    version: "20260920130000",
    name: "enforce_provincial_assistance_commands",
    appliedCheck: `select exists(
      select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'intermunicipal_assistance_requests'
         and column_name = 'is_provincial_command'
    ) as applied`,
  },
  {
    version: "20260924090000",
    name: "add_fire_truck_inventory",
    appliedCheck: `select to_regclass('public.fire_trucks') is not null as applied`,
  },
  {
    version: "20260924103000",
    name: "relocate_belison_demo_water_sources",
    appliedCheck: `select count(*) = 19 as applied
      from public.water_sources source
      join public.municipalities municipality on municipality.id = source.municipality_id
      where municipality.name = 'Belison'
        and municipality.province = 'Antique'
        and source.record_origin = 'BFP_LOCATOR_CHART_2018'
        and source.import_sequence between 7 and 25
        and to_jsonb(source)->>'coordinate_basis' = 'THESIS_DEMO_APPROXIMATION'
        and to_jsonb(source)->>'original_latitude' is not null
        and to_jsonb(source)->>'original_longitude' is not null`,
  },
];

const client = new pg.Client({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 60_000,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
try {
  for (const migration of releaseMigrations) {
    const applied = await client.query(migration.appliedCheck);
    if (applied.rows[0].applied) continue;

    const sql = await readFile(
      `supabase/migrations/${migration.version}_${migration.name}.sql`,
      "utf8",
    );
    await client.query("begin");
    try {
      await client.query("set local lock_timeout = '10s'");
      await client.query("set local statement_timeout = '60s'");
      await client.query(sql);
      const tracking = await client.query(`select exists(
        select 1 from information_schema.tables
         where table_schema = 'supabase_migrations'
           and table_name = 'schema_migrations'
      ) as present`);
      if (tracking.rows[0].present) {
        await client.query(
          `insert into supabase_migrations.schema_migrations(version, name, statements)
           values ($1, $2, $3)
           on conflict (version) do nothing`,
          [migration.version, migration.name, [sql]],
        );
      }
      await client.query("commit");
      console.log(`Applied migration ${migration.version}_${migration.name}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }
  const verified = await client.query(`select
    exists(select 1 from information_schema.columns
      where table_schema='public' and table_name='intermunicipal_assistance_requests'
        and column_name='is_provincial_command') as column_ready,
    exists(select 1 from pg_constraint
      where conname='provincial_command_full_acceptance' and convalidated) as constraint_ready,
    (select count(*)::int from public.fire_trucks
      where record_origin = 'BFP_FIRETRUCK_INVENTORY') as inventory_fire_trucks,
    (select count(*)::int from public.water_sources source
      join public.municipalities municipality on municipality.id = source.municipality_id
      where municipality.name = 'Belison'
        and municipality.province = 'Antique'
        and source.coordinate_basis = 'THESIS_DEMO_APPROXIMATION') as belison_demo_sources`);
  if (verified.rows[0].belison_demo_sources !== 19) {
    throw new Error(`Expected 19 relocated Belison sources, found ${verified.rows[0].belison_demo_sources}`);
  }
  console.log(JSON.stringify(verified.rows[0]));
} finally {
  await client.end();
}
