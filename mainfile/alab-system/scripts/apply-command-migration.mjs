import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import pg from "pg";

// Preview deployments compile the app without applying release migrations.
if (process.env.VERCEL_ENV === "preview") {
  console.log("Skipping release migrations for Vercel preview deployment.");
  process.exit(0);
}

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
  {
    version: "20260930030000",
    name: "link_duplicate_fire_reports",
    appliedCheck: `select exists(
      select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'fire_reports'
         and column_name = 'duplicate_of_report_id'
    ) as applied`,
  },
  {
    version: "20261002090000",
    name: "make_resident_email_optional",
    appliedCheck: `select coalesce((
      select is_nullable = 'YES' from information_schema.columns
       where table_schema = 'public' and table_name = 'users' and column_name = 'email'
    ), true) as applied`,
  },
  {
    version: "20261002120000",
    name: "add_fire_report_fire_types",
    appliedCheck: `select exists(
      select 1 from pg_constraint where conname = 'fire_reports_fire_types_check'
    ) as applied`,
  },
  {
    version: "20261002150000",
    name: "add_municipal_report_acknowledgement",
    appliedCheck: `select exists(
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'fire_reports'
         and column_name = 'municipal_acknowledged_by_user_id'
    ) as applied`,
  },
  {
    version: "20261004130448",
    name: "add_resident_fire_report_follows",
    appliedCheck: `select to_regclass('public.resident_fire_report_follows') is not null as applied`,
  },
  {
    version: "20261004133956",
    name: "add_provincial_barangay_alerts",
    appliedCheck: `select to_regclass('public.provincial_barangay_alerts') is not null as applied`,
  },
  {
    version: "20261005150000",
    name: "set_municipal_fire_marshal_heads",
    appliedCheck: `select to_regclass('public.municipal_bfp_stations') is null
      or coalesce(obj_description(to_regclass('public.municipal_bfp_stations'), 'pg_class'), '') like '%Release 20261005150000%' as applied`,
  },
  {
    version: "20261006090000",
    name: "municipal_incident_alerts",
    appliedCheck: `select to_regclass('public.provincial_barangay_alerts_open_municipality_idx') is not null as applied`,
  },
  {
    // Without it every backup and alarm-declaration notification is rejected,
    // so a municipality called by a provincial alarm never hears the alarm.
    version: "20261007090000",
    name: "allow_backup_alarm_notifications",
    appliedCheck: `select coalesce((
      select pg_get_constraintdef(oid) like '%ALARM_DECLARED%'
        from pg_constraint
       where conname = 'account_notifications_event_type_check'
    ), false) as applied`,
  },
  {
    // Caluya's seat point was in the sea, so its station pin sat in the water.
    version: "20261008090000",
    name: "move_caluya_station_onto_island",
    appliedCheck: `select to_regclass('public.municipal_bfp_stations') is null or exists(
      select 1 from pg_attribute
       where attrelid = to_regclass('public.municipal_bfp_stations')
         and attname = 'latitude'
         and coalesce(col_description(attrelid, attnum), '') like '%Release 20261008090000%'
    ) as applied`,
  },
  {
    // Laua-an, Patnongon, Sebaste and Tobias Fornier pins were also offshore.
    version: "20261008100000",
    name: "move_station_pins_onto_land",
    appliedCheck: `select to_regclass('public.municipal_bfp_stations') is null or exists(
      select 1 from pg_attribute
       where attrelid = to_regclass('public.municipal_bfp_stations')
         and attname = 'longitude'
         and coalesce(col_description(attrelid, attnum), '') like '%Release 20261008100000%'
    ) as applied`,
  },
  {
    // Belison station and seat move to Poblacion; Anini-y station beside the church.
    version: "20261008110000",
    name: "place_belison_and_anini_y_stations",
    appliedCheck: `select to_regclass('public.municipal_bfp_stations') is null or exists(
      select 1 from pg_attribute
       where attrelid = to_regclass('public.municipalities')
         and attname = 'latitude'
         and coalesce(col_description(attrelid, attnum), '') like '%Release 20261008110000%'
    ) as applied`,
  },
  {
    // A responder can ask for another station from their own town.
    version: "20261009090000",
    name: "add_local_backup_requests",
    appliedCheck: `select to_regclass('public.incident_local_backup_requests') is not null as applied`,
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
