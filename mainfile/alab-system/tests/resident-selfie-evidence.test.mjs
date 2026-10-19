import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import sharp from "sharp";
import ts from "typescript";

import { renderWatermark, watermarkTime } from "../lib/media/watermark-render.mjs";
import * as composition from "../lib/resident-applications/selfie-contact-sheet.mjs";

const directory = "lib/resident-applications/";

async function evidenceStore({ failUpload = 0 } = {}) {
  const uploaded = []; const removed = [];
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://storage.example.test";
  process.env.SUPABASE_SECRET_KEY = "synthetic-storage-secret";
  const dependencies = {
    "server-only": {}, "node:crypto": crypto, sharp: { default: sharp },
    "./selfie-contact-sheet.mjs": composition,
    "../media/watermark": { watermarkImage: (input, options) => renderWatermark(sharp, input, options), watermarkTime },
    "@supabase/supabase-js": { createClient: () => ({ storage: { from: () => ({
      upload: async (key, body, options) => {
        if (failUpload && uploaded.length + 1 === failUpload) return { error: new Error("storage rejected") };
        uploaded.push({ key, body, options }); return { error: null };
      },
      remove: async keys => { removed.push(...keys); return { error: null }; },
    }) } }) },
  };
  const code = ts.transpileModule(readFileSync(`${directory}evidence.ts`, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function("require", "exports", code)(name => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected evidence dependency: ${name}`);
  }, exports);
  return { ...exports, uploaded, removed };
}

async function image(width, height, background, name) {
  const bytes = await sharp({ create: { width, height, channels: 3, background } }).png().toBuffer();
  return new File([bytes], name, { type: "image/png" });
}

async function fixture() {
  return {
    applicationId: "synthetic-application", reference: "ALAB-TEST", submittedAt: new Date("2026-10-19T00:00:00Z"),
    front: await image(160, 100, "#eeeeee", "id-front.png"), back: await image(160, 100, "#dddddd", "id-back.png"),
    selfie: await image(1200, 300, "#ff0000", "front.png"),
    selfieRight: await image(300, 1200, "#0000ff", "right.png"),
    selfieLeft: await image(800, 800, "#00ff00", "left.png"),
  };
}

function pixel(data, info, x, y) {
  const index = (y * info.width + x) * info.channels;
  return [...data.subarray(index, index + 3)];
}

test("three selfie views become one bounded labelled private contact sheet with its own stored hash", async () => {
  const store = await evidenceStore(); const input = await fixture();
  const result = await store.uploadIdentityEvidence(input);
  assert.equal(store.uploaded.length, 6);
  const original = store.uploaded.find(asset => asset.key === result.selfie.originalKey);
  assert.equal(original.options.contentType, "image/jpeg"); assert.equal(original.options.upsert, false);
  assert.equal(result.selfie.sha256, crypto.createHash("sha256").update(original.body).digest("hex"));
  assert.notEqual(result.selfie.sha256, crypto.createHash("sha256").update(Buffer.from(await input.selfie.arrayBuffer())).digest("hex"));
  assert.equal(result.selfie.sizeBytes, original.body.length); assert.ok(original.body.length < 6 * 1024 * 1024);
  const { data, info } = await sharp(original.body).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 1800); assert.equal(info.height, 880);
  for (const [x, channel] of [[300, 0], [900, 2], [1500, 1]]) {
    const color = pixel(data, info, x, 400);
    assert.ok(color[channel] > 240 && color.filter((_value, index) => index !== channel).every(value => value < 15));
  }
  // Wide and tall inputs retain their full aspect ratio with blank padding.
  assert.ok(pixel(data, info, 300, 50).every(value => value > 240));
  assert.ok(pixel(data, info, 650, 400).every(value => value > 240));
  for (const left of [0, 600, 1200]) {
    let labelInk = 0;
    for (let y = 810; y < 870; y++) for (let x = left + 200; x < left + 400; x++) {
      if (pixel(data, info, x, y).some(value => value < 100)) labelInk++;
    }
    assert.ok(labelInk > 100, "each view has a visible label outside the photo");
  }
  const review = store.uploaded.find(asset => asset.key === result.selfie.reviewKey);
  assert.equal((await sharp(review.body).metadata()).width, 1800);
  assert.equal(result.uploadedKeys.length, 6);
});

test("correction submissions without side views preserve their original single selfie", async () => {
  const store = await evidenceStore(); const input = await fixture(); delete input.selfieRight; delete input.selfieLeft;
  const result = await store.uploadIdentityEvidence(input);
  const original = store.uploaded.find(asset => asset.key === result.selfie.originalKey);
  assert.deepEqual(original.body, Buffer.from(await input.selfie.arrayBuffer()));
  assert.equal(result.selfie.mimeType, "image/png");
});

test("a partial side-view pair is rejected before any evidence is uploaded", async () => {
  for (const key of ["selfieRight", "selfieLeft"]) {
    const store = await evidenceStore(); const input = await fixture(); delete input[key];
    await assert.rejects(() => store.uploadIdentityEvidence(input), /SELFIE_VIEWS_REQUIRED/);
    assert.equal(store.uploaded.length, 0);
  }
});

test("invalid or oversized contact-sheet inputs fail before any evidence is uploaded", async () => {
  const oversized = await image(5001, 100, "white", "oversized.png");
  const excessivePixels = await image(4000, 4000, "white", "pixels.png");
  const source = Buffer.from(await oversized.arrayBuffer());
  for (const bad of [new File(["not an image"], "invalid.png", { type: "image/png" }),
    new File([Buffer.alloc(6 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }),
    new File([source.subarray(0, 16)], "truncated.png", { type: "image/png" }),
    new File([source], "mislabeled.jpg", { type: "image/jpeg" }),
    new File([source], "unsupported.txt", { type: "text/plain" }), oversized, excessivePixels]) {
    const store = await evidenceStore(); const input = await fixture(); input.selfieRight = bad;
    await assert.rejects(() => store.uploadIdentityEvidence(input), /image|6 MB|5000/i);
    assert.equal(store.uploaded.length, 0);
  }
});

test("a failed selfie-sheet upload removes the existing uploaded ID assets", async () => {
  const store = await evidenceStore({ failUpload: 5 }); const input = await fixture();
  await assert.rejects(() => store.uploadIdentityEvidence(input), /securely store/);
  assert.equal(store.uploaded.length, 4);
  assert.deepEqual(store.removed, store.uploaded.map(asset => asset.key));
});
