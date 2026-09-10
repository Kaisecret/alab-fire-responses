import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('management migration replays, denies public access, and enforces immutable audit and unique operations', async () => {
  const db = new PGlite();
  const actorId = '11111111-1111-4111-8111-111111111111';
  try {
    await db.exec(`create role anon; create role authenticated;
      create table users (id uuid primary key);
      create table municipalities (id uuid primary key);
      insert into users values ('${actorId}');`);
    const sql = readFileSync('supabase/migrations/20260910140000_provincial_management_support.sql', 'utf8');
    await db.exec(sql);
    await db.exec(sql);
    for (const table of ['provincial_management_events', 'provincial_management_operations']) {
      for (const role of ['anon', 'authenticated']) {
        const { rows } = await db.query('select has_table_privilege($1, $2, $3) as allowed', [role, table, 'SELECT,INSERT,UPDATE,DELETE']);
        assert.equal(rows[0].allowed, false);
      }
      const { rows } = await db.query('select relrowsecurity from pg_class where relname = $1', [table]);
      assert.equal(rows[0].relrowsecurity, true);
    }
    await db.query(`insert into provincial_management_events(actor_user_id,target_type,target_id,action)
      values ($1,'STATION','station-test','UPDATE')`, [actorId]);
    await assert.rejects(db.query("update provincial_management_events set action = 'REWRITTEN'"), /immutable/);
    await assert.rejects(db.query('delete from provincial_management_events'), /immutable/);
    const insertOperation = () => db.query(`insert into provincial_management_operations
      (actor_user_id,request_id,action,target_type,target_id,payload_digest,result_status,saved_result)
      values ($1,'same-request','UPDATE','STATION','station-test','digest','SUCCESS','{"ok":true}')`, [actorId]);
    await insertOperation();
    await assert.rejects(insertOperation(), error => error.code === '23505');
    assert.equal((await db.query('select count(*)::int as count from provincial_management_events')).rows[0].count, 1);
    assert.equal((await db.query('select count(*)::int as count from provincial_management_operations')).rows[0].count, 1);
  } finally { await db.close(); }
});
