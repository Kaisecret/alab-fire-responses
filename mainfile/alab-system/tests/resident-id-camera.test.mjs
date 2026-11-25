import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { idFrameCrop } from "../lib/resident-applications/id-frame-crop.mjs";

test("the ID crop follows the on-screen frame when the video is cropped by object-fit cover", () => {
  // A 1920x1080 camera shown in a 390x700 phone stage: scale 700/1080, wide sides hidden.
  const stage = { left: 0, top: 0, width: 390, height: 700 };
  const frame = { left: 27, top: 250, width: 336, height: 212 };
  const crop = idFrameCrop(stage, frame, 1920, 1080, 0);
  const scale = 700 / 1080;
  const offsetX = (390 - 1920 * scale) / 2;
  assert.equal(crop.x, Math.round((27 - offsetX) / scale));
  assert.equal(crop.y, Math.round(250 / scale));
  assert.equal(crop.width, Math.round(336 / scale));
  assert.equal(crop.height, Math.round(212 / scale));
});

test("the ID crop keeps a margin but never leaves the camera image", () => {
  const stage = { left: 100, top: 50, width: 640, height: 360 };
  const crop = idFrameCrop(stage, { left: 100, top: 50, width: 640, height: 360 }, 1280, 720);
  assert.deepEqual(crop, { x: 0, y: 0, width: 1280, height: 720 });
});

test("a missing or hidden frame falls back to the whole camera image", () => {
  const stage = { left: 0, top: 0, width: 640, height: 480 };
  assert.deepEqual(idFrameCrop(stage, { left: 0, top: 0, width: 0, height: 0 }, 640, 480), { x: 0, y: 0, width: 640, height: 480 });
  assert.deepEqual(idFrameCrop({ ...stage, width: 0, height: 0 }, { left: 0, top: 0, width: 10, height: 10 }, 640, 480), { x: 0, y: 0, width: 640, height: 480 });
});

test("the ID step offers both a guided camera scan and a photo upload for each side", () => {
  const markup = readFileSync(new URL("../app/_content/signup-content.ts", import.meta.url), "utf8");
  const page = readFileSync(new URL("../app/_components/signup-page.tsx", import.meta.url), "utf8");
  for (const side of ["Front", "Back"]) {
    assert.match(markup, new RegExp(`id="scan${side}Btn"`));
    assert.match(markup, new RegExp(`id="upload${side}Btn"`));
    assert.match(markup, new RegExp(`id="file${side}"`));
  }
  assert.match(markup, /id="idCameraPanel"[^>]*role="dialog"/);
  assert.match(markup, /<video id="idCameraVideo" autoplay playsinline muted><\/video>/);
  assert.match(page, /facingMode: \{ ideal: "environment" \}/);
  // A camera photo goes through the same input change as an uploaded photo.
  assert.match(page, /input\.dispatchEvent\(new Event\("change", \{ bubbles: true \}\)\)/);
  assert.match(page, /track\.stop\(\)/);
});
