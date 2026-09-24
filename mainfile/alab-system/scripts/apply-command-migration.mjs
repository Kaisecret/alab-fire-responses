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
      where record_origin = 'BFP_FIRETRUCK_INVENTORY') as inventory_fire_trucks`);
  console.log(JSON.stringify(verified.rows[0]));
} finally {
  await client.end();
}
