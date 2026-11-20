import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

test("profile release setup applies the existing security migrations once without losing settings", async () => {
  const url = new URL("../scripts/apply-resident-profile-migrations.mjs", import.meta.url);
  assert.ok(existsSync(url), "The missing production profile migrations need a release runner");
  const { applyResidentProfileMigrations } = await import(url);
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite();
  try {
    await db.exec(`create table public.resident_profiles (id uuid primary key);
      create schema supabase_migrations;
      create table supabase_migrations.schema_migrations (version text primary key, name text, statements text[]);
      insert into resident_profiles values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');`);
    const client = { query: (sql, params) => {
      if (/pg_advisory_xact_lock/.test(sql)) return Promise.resolve({ rows: [] });
      if (!params && sql.includes(";")) return db.exec(sql).then(results => results.at(-1));
      return db.query(sql, params);
    } };
    await applyResidentProfileMigrations(client);
    await db.query("insert into resident_security_settings (resident_profile_id, pin_hash, bfp_contact_allowed) values ($1, null, true)", ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]);
    await applyResidentProfileMigrations(client);
    assert.equal((await db.query("select bfp_contact_allowed from resident_security_settings")).rows[0].bfp_contact_allowed, true);
    assert.equal((await db.query("select count(*)::int as n from supabase_migrations.schema_migrations")).rows[0].n, 2);
    assert.equal((await db.query("select count(*)::int as n from pg_class where relname in ('resident_security_settings','resident_login_activity') and relrowsecurity")).rows[0].n, 2);
    assert.equal((await db.query("select is_nullable from information_schema.columns where table_name='resident_security_settings' and column_name='pin_hash'")).rows[0].is_nullable, "YES");
    await assert.rejects(db.query("update resident_security_settings set pin_hash = 'plaintext'"));
    // Recover a partial prior deployment while preserving its existing settings.
    await db.exec("drop table resident_login_activity");
    await applyResidentProfileMigrations(client);
    assert.equal((await db.query("select bfp_contact_allowed from resident_security_settings")).rows[0].bfp_contact_allowed, true);
    assert.ok((await db.query("select to_regclass('resident_login_activity') as relation")).rows[0].relation);
    // A failed final security check must roll back schema changes as well.
    await db.query("update resident_security_settings set pin_hash = $1", ["a".repeat(60)]);
    await db.exec("alter table resident_security_settings alter column pin_hash set not null; alter table resident_security_settings disable row level security");
    await assert.rejects(applyResidentProfileMigrations(client), /schema verification failed/);
    assert.equal((await db.query("select is_nullable from information_schema.columns where table_name='resident_security_settings' and column_name='pin_hash'")).rows[0].is_nullable, "NO");
  } finally { await db.close(); }
});
