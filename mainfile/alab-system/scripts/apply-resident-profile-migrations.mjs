import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const migrations = [
  { version: "20260821175022", name: "add_resident_security_settings",
    check: "select to_regclass('public.resident_security_settings') is not null and to_regclass('public.resident_login_activity') is not null as applied" },
  { version: "20260822020000", name: "allow_security_preferences_without_pin",
    check: "select exists(select 1 from information_schema.columns where table_schema='public' and table_name='resident_security_settings' and column_name='pin_hash' and is_nullable='YES') as applied" },
];

export async function applyResidentProfileMigrations(client) {
  await client.query("begin");
  try {
    await client.query("set local lock_timeout = '10s'");
    await client.query("set local statement_timeout = '60s'");
    await client.query("select pg_advisory_xact_lock(66192185)");
    for (const migration of migrations) {
      if ((await client.query(migration.check)).rows[0].applied) continue;
      const sql = await readFile(new URL(`../supabase/migrations/${migration.version}_${migration.name}.sql`, import.meta.url), "utf8");
      // Preserve an existing table if a prior manual deployment applied only
      // part of the first migration. The final checks still require both tables.
      const executable = migration.name === "add_resident_security_settings"
        ? sql.replaceAll("create table public.", "create table if not exists public.").replace("create index resident_login_activity", "create index if not exists resident_login_activity")
        : sql;
      await client.query(executable);
      const history = await client.query("select to_regclass('supabase_migrations.schema_migrations') is not null as present");
      if (history.rows[0].present) {
        await client.query(`insert into supabase_migrations.schema_migrations(version, name, statements)
          values ($1, $2, $3) on conflict (version) do nothing`, [migration.version, migration.name, [sql]]);
      }
      console.log(`Applied resident profile migration ${migration.version}_${migration.name}`);
    }
    const ready = await client.query(`select
      (select count(*) = 2 from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relname in ('resident_security_settings','resident_login_activity') and c.relrowsecurity) as private_tables_ready,
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='resident_security_settings'
        and column_name='pin_hash' and is_nullable='YES') as preferences_ready`);
    if (!ready.rows[0].private_tables_ready || !ready.rows[0].preferences_ready) throw new Error("Resident profile schema verification failed");
    await client.query("commit");
    console.log("Resident profile security and login activity schema verified");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.env.VERCEL_ENV === "preview") {
    console.log("Skipping resident profile migrations for preview deployment.");
  } else {
    const nextEnv = (await import("@next/env")).default;
    nextEnv.loadEnvConfig(process.cwd());
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for resident profile migrations");
    const { Client } = (await import("pg")).default;
    const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 30_000 });
    await client.connect();
    try { await applyResidentProfileMigrations(client); } finally { await client.end(); }
  }
}
