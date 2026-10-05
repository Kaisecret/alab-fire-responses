import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

import { originalPhotoKey, watermarkLegacyPhotos } from "../lib/media/legacy-photo-watermark.mjs";

const REPORT = "11111111-1111-4111-8111-111111111111";

async function database(photos) {
  const db = new PGlite();
  await db.exec(`
    create table public.fire_reports (id uuid primary key, reference_number text not null);
    create table public.fire_report_photos (
      id uuid primary key,
      fire_report_id uuid not null references public.fire_reports(id),
      storage_key text not null,
      mime_type text not null,
      file_size_bytes integer not null,
      uploaded_at timestamptz not null
    );
  `);
  await db.query("insert into public.fire_reports values ($1, 'ALAB-20260930-AB12CD')", [REPORT]);
  for (const photo of photos) {
    await db.query("insert into public.fire_report_photos values ($1, $2, $3, $4, $5, $6)",
      [photo.id, REPORT, photo.key, photo.mime, photo.size, photo.uploadedAt]);
  }
  return {
    db,
    client: { query: async (sql, params) => { const result = await db.query(sql, params); return { rows: result.rows }; } },
  };
}

function bucket(objects, { failUploadOf } = {}) {
  const files = new Map(Object.entries(objects));
  return {
    files,
    hasOriginal: async (storageKey) => files.has(originalPhotoKey(storageKey)),
    download: async (key) => {
      if (!files.has(key)) throw new Error(`missing ${key}`);
      return files.get(key);
    },
    upload: async (key, data) => {
      if (failUploadOf?.(key)) throw new Error(`upload refused ${key}`);
      files.set(key, data);
    },
    remove: async (keys) => { for (const key of keys) files.delete(key); },
  };
}

const quiet = { log() {}, error() {} };
const legacy = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", key: `${REPORT}/old.png`, mime: "image/png", size: 5, uploadedAt: "2026-09-30T00:55:34Z" };
const done = { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", key: `${REPORT}/new.jpg`, mime: "image/jpeg", size: 9, uploadedAt: "2026-10-03T00:00:00Z" };

test("an old photo gets a watermarked copy and its original is kept", async () => {
  const { db, client } = await database([legacy]);
  const storage = bucket({ [legacy.key]: Buffer.from("plain") });
  const calls = [];
  const render = async (input, options) => {
    calls.push({ input: input.toString(), options });
    return { data: Buffer.from("marked!"), mimeType: "image/jpeg", extension: "jpg" };
  };
  try {
    const summary = await watermarkLegacyPhotos({ db: client, storage, render, newId: () => "p1", log: quiet });
    assert.deepEqual(summary, { checked: 1, watermarked: 1, failed: 0 });
    // Labelled like a new report: its reference and when it was sent.
    assert.deepEqual(calls, [{ input: "plain", options: { label: "Fire report evidence", detail: "ALAB-20260930-AB12CD · Sep 30, 2026 · 8:55 AM" } }]);
    const { rows } = await db.query("select storage_key, mime_type, file_size_bytes from public.fire_report_photos");
    assert.deepEqual(rows, [{ storage_key: `${REPORT}/p1.jpg`, mime_type: "image/jpeg", file_size_bytes: 7 }]);
    assert.equal(storage.files.get(`${REPORT}/p1.jpg`).toString(), "marked!");
    assert.equal(storage.files.get(`${REPORT}/original/p1`).toString(), "plain");
    assert.equal(storage.files.has(legacy.key), false, "the unmarked copy is no longer viewable");
  } finally {
    await db.close();
  }
});

test("a photo that already has its original kept is left alone, so the job can rerun", async () => {
  const { db, client } = await database([done]);
  const storage = bucket({ [done.key]: Buffer.from("marked"), [originalPhotoKey(done.key)]: Buffer.from("plain") });
  try {
    const summary = await watermarkLegacyPhotos({ db: client, storage, render: async () => assert.fail("must not redraw"), log: quiet });
    assert.deepEqual(summary, { checked: 1, watermarked: 0, failed: 0 });
  } finally {
    await db.close();
  }
});

test("an unreadable photo is left as it was and the others still run", async () => {
  const second = { ...legacy, id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", key: `${REPORT}/second.jpg`, uploadedAt: "2026-09-30T01:00:00Z" };
  const { db, client } = await database([legacy, second]);
  const storage = bucket({ [legacy.key]: Buffer.from("broken"), [second.key]: Buffer.from("plain") });
  let id = 0;
  const render = async (input) => {
    if (input.toString() === "broken") throw new Error("not an image");
    return { data: Buffer.from("marked"), mimeType: "image/jpeg", extension: "jpg" };
  };
  try {
    const summary = await watermarkLegacyPhotos({ db: client, storage, render, newId: () => `p${++id}`, log: quiet });
    assert.deepEqual(summary, { checked: 2, watermarked: 1, failed: 1 });
    const { rows } = await db.query("select storage_key from public.fire_report_photos order by uploaded_at");
    assert.deepEqual(rows.map((row) => row.storage_key), [legacy.key, `${REPORT}/p1.jpg`]);
    assert.equal(storage.files.get(legacy.key).toString(), "broken");
  } finally {
    await db.close();
  }
});

test("a failed upload leaves the photo record and files as they were", async () => {
  const { db, client } = await database([legacy]);
  const storage = bucket({ [legacy.key]: Buffer.from("plain") }, { failUploadOf: (key) => key.endsWith(".jpg") });
  const render = async () => ({ data: Buffer.from("marked"), mimeType: "image/jpeg", extension: "jpg" });
  try {
    const summary = await watermarkLegacyPhotos({ db: client, storage, render, newId: () => "p1", log: quiet });
    assert.deepEqual(summary, { checked: 1, watermarked: 0, failed: 1 });
    const { rows } = await db.query("select storage_key from public.fire_report_photos");
    assert.equal(rows[0].storage_key, legacy.key);
    assert.deepEqual([...storage.files.keys()], [legacy.key], "no half-made copies are left behind");
  } finally {
    await db.close();
  }
});

test("the original is kept under the same name the app expects", () => {
  assert.equal(originalPhotoKey(`${REPORT}/p1.jpg`), `${REPORT}/original/p1`);
  assert.equal(originalPhotoKey("backup-requests/x/p2.webp"), "backup-requests/x/original/p2");
});
