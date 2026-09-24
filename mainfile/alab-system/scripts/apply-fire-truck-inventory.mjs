import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");

const version = "20260924090000";
const name = "add_fire_truck_inventory";
const apply = process.argv.includes("--apply");
const sql = await readFile(`supabase/migrations/${version}_${name}.sql`, "utf8");
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 60_000,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  const existing = await client.query("select to_regclass('public.fire_trucks') is not null as present");
  if (existing.rows[0].present) {
    const count = await client.query("select count(*)::int as count from public.fire_trucks where record_origin = 'BFP_FIRETRUCK_INVENTORY'");
    console.log(JSON.stringify({ alreadyPresent: true, inventoryTrucks: count.rows[0].count }));
    if (count.rows[0].count !== 29) throw new Error("Existing inventory is incomplete; inspect before retrying");
    process.exitCode = 0;
  } else {
    await client.query("begin");
    try {
      await client.query("set local lock_timeout = '10s'");
      await client.query("set local statement_timeout = '90s'");
      await client.query(sql);
      const result = await client.query(`
        select municipality.name, station.station_name, count(truck.id)::int as trucks
          from public.fire_trucks truck
          join public.municipal_bfp_stations station on station.id = truck.station_id
          join public.municipalities municipality on municipality.id = truck.municipality_id
         where truck.record_origin = 'BFP_FIRETRUCK_INVENTORY'
         group by municipality.name, station.station_name
         order by municipality.name, station.station_name`);
      const total = result.rows.reduce((sum, row) => sum + row.trucks, 0);
      if (total !== 29) throw new Error(`Expected 29 trucks, got ${total}`);
      if (result.rows.some((row) => row.name === "Hamtic" && row.station_name !== "Hamtic Fire Station")) {
        throw new Error("Hamtic inventory assigned to an unrelated station");
      }
      const tracking = await client.query(`select to_regclass('supabase_migrations.schema_migrations') is not null as present`);
      if (apply) {
        if (tracking.rows[0].present) {
          await client.query(
            `insert into supabase_migrations.schema_migrations(version, name, statements)
             values ($1, $2, $3) on conflict (version) do nothing`,
            [version, name, [sql]],
          );
        }
        await client.query("commit");
      } else {
        await client.query("rollback");
      }
      console.log(JSON.stringify({ applied: apply, inventoryTrucks: total, stationsWithTrucks: result.rows }));
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }
} finally {
  await client.end();
}
