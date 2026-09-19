import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL missing");

const client = new pg.Client({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 60_000,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
try {
  const applied = await client.query(`select exists(
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'intermunicipal_assistance_requests'
       and column_name = 'is_provincial_command'
  ) as applied`);
  if (!applied.rows[0].applied) {
    const sql = await readFile(
      "supabase/migrations/20260920130000_enforce_provincial_assistance_commands.sql",
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
          ["20260920130000", "enforce_provincial_assistance_commands", [sql]],
        );
      }
      await client.query("commit");
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
      where conname='provincial_command_full_acceptance' and convalidated) as constraint_ready`);
  console.log(JSON.stringify(verified.rows[0]));
} finally {
  await client.end();
}
