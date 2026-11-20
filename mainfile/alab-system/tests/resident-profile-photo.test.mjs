import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const realRequire = createRequire(import.meta.url);
const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const source = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
function load(path, dependencies, globals = {}) {
  assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), `${path} must exist`);
  const compiled = ts.transpileModule(source(path), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  new Function("require", "exports", ...Object.keys(globals), compiled)(name => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  }, exports, ...Object.values(globals));
  return exports;
}

function photoStore({ uploadError = null, signError = null, deleteError = null } = {}) {
  const objects = new Map(); const calls = [];
  const client = { storage: {
    createBucket: async (name, options) => { calls.push({ action: "bucket", name, options }); return { error: null }; },
    updateBucket: async () => ({ error: null }),
    from: bucket => ({
      upload: async (key, bytes, options) => {
        calls.push({ action: "upload", bucket, key, options });
        if (!uploadError) objects.set(key, Buffer.from(bytes));
        return { error: uploadError };
      },
      createSignedUrl: async (key, expiresIn) => {
        calls.push({ action: "sign", bucket, key, expiresIn });
        if (signError) return { error: signError, data: null };
        if (!objects.has(key)) return { error: { statusCode: "404", message: "Object not found" }, data: null };
        return { data: { signedUrl: `https://storage.example.test/private/${key}?token=signed` }, error: null };
      },
      remove: async keys => {
        if (!deleteError) keys.forEach(key => objects.delete(key));
        return { error: deleteError };
      },
    }),
  } };
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://storage.example.test";
  process.env.SUPABASE_SECRET_KEY = "server-only-test-key";
  const api = load("lib/resident-profile/photos.ts", {
    "server-only": {}, "@supabase/supabase-js": { createClient: () => client }, "sharp": realRequire("sharp"),
  });
  return { ...api, objects, calls };
}

async function imageFile() {
  const sharp = realRequire("sharp");
  const bytes = await sharp({ create: { width: 1600, height: 800, channels: 3, background: "#aaccff" } })
    .withMetadata({ orientation: 6 }).jpeg().toBuffer();
  return new File([bytes], "portrait.jpg", { type: "image/jpeg" });
}

test("the existing camera control opens the resident photo editor", () => {
  assert.match(source("app/_content/resident-profile-content.ts"), /profile-camera-btn[^>]*data-profile-photo-edit/);
  assert.match(source("app/resident/profile/page.tsx"), /ResidentProfilePhotoEditor/);
});

test("profile photos persist privately under the signed-in user's object key", async () => {
  const store = photoStore();
  await store.uploadResidentProfilePhoto(userId, await imageFile());
  assert.ok(store.objects.has(`${userId}/profile`));
  const bucket = store.calls.find(call => call.action === "bucket");
  assert.equal(bucket.name, "resident-profile-photos");
  assert.equal(bucket.options.public, false);
  const upload = store.calls.find(call => call.action === "upload");
  assert.equal(upload.options.contentType, "image/jpeg");
  assert.equal(upload.options.cacheControl, "0");
  const metadata = await realRequire("sharp")(store.objects.get(`${userId}/profile`)).metadata();
  assert.equal(metadata.format, "jpeg");
  assert.ok(Math.max(metadata.width, metadata.height) <= 1024);
  assert.equal(metadata.exif, undefined);
  const savedUrl = await store.createResidentProfilePhotoUrl(userId);
  assert.match(savedUrl, /token=signed/);
  assert.equal(await store.createResidentProfilePhotoUrl(otherId), null);
});

test("invalid, disguised and oversized images never replace a saved photo", async () => {
  const store = photoStore();
  for (const file of [new File(["not an image"], "fake.jpg", { type: "image/jpeg" }),
    new File(["<svg/>"], "portrait.svg", { type: "image/svg+xml" }),
    { size: 3 * 1024 * 1024 + 1, type: "image/jpeg" }]) {
    await assert.rejects(store.uploadResidentProfilePhoto(userId, file), /INVALID_PROFILE_PHOTO/);
  }
  assert.equal(store.calls.filter(call => call.action === "upload").length, 0);
});

test("storage failures are reported rather than claiming a photo was saved or removed", async () => {
  const failedUpload = photoStore({ uploadError: { message: "private provider error" } });
  await assert.rejects(failedUpload.uploadResidentProfilePhoto(userId, await imageFile()), /PROFILE_PHOTO_STORAGE_FAILED/);
  const failedRead = photoStore({ signError: { statusCode: "503", message: "unavailable" } });
  await assert.rejects(failedRead.createResidentProfilePhotoUrl(userId), /PROFILE_PHOTO_STORAGE_FAILED/);
  const failedDelete = photoStore({ deleteError: { message: "unavailable" } });
  await assert.rejects(failedDelete.deleteResidentProfilePhoto(userId), /PROFILE_PHOTO_STORAGE_FAILED/);
});

function routeFixture({ signingFails = false, missingPhoto = false } = {}) {
  const calls = [];
  const route = load("app/api/resident/profile/photo/route.ts", {
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "../../../../../lib/auth/session": { RESIDENT_SESSION_COOKIE: "alab_resident_session",
      verifyResidentSession: token => token === "valid" ? { userId, role: "RESIDENT" } : null },
    "../../../../../lib/resident-profile/photos": {
      uploadResidentProfilePhoto: async (id, file) => { calls.push({ id, file }); },
      createResidentProfilePhotoUrl: async id => {
        if (signingFails) throw new Error("PROFILE_PHOTO_STORAGE_FAILED");
        if (missingPhoto) return null;
        return `https://storage.example.test/${id}/profile?token=signed`;
      },
      deleteResidentProfilePhoto: async id => { calls.push({ id, deleted: true }); },
    },
  });
  const request = (authenticated = true, form = new FormData()) => ({
    cookies: { get: () => ({ value: authenticated ? "valid" : "invalid" }) },
    nextUrl: new URL("https://alab.example.test/api/resident/profile/photo"),
    headers: new Headers(), formData: async () => form,
  });
  return { route, calls, request };
}

test("photo read, upload and removal require a resident session", async () => {
  const { route, calls, request } = routeFixture();
  for (const method of ["GET", "POST", "DELETE"]) assert.equal((await route[method](request(false))).status, 401);
  assert.equal(calls.length, 0);
});

test("an uploaded userId cannot redirect the photo to another account", async () => {
  const { route, calls, request } = routeFixture();
  const form = new FormData();
  form.set("userId", otherId); form.set("photo", await imageFile());
  const response = await route.POST(request(true, form));
  assert.equal(response.status, 200);
  assert.equal(calls[0].id, userId);
  assert.match((await response.json()).photoUrl, /^\/api\/resident\/profile\/photo\?image=1&v=/);
  const read = await route.GET(request());
  assert.equal(read.headers.get("cache-control"), "private, no-store");
  assert.equal((await route.POST(request())).status, 400);
});

test("a preview signing outage must not turn a completed photo save into an upload failure", async () => {
  const { route, calls, request } = routeFixture({ signingFails: true });
  const form = new FormData(); form.set("photo", await imageFile());
  const saved = await route.POST(request(true, form));
  assert.equal(saved.status, 200);
  assert.equal(calls[0].id, userId);
  assert.match((await saved.json()).photoUrl, /^\/api\/resident\/profile\/photo\?image=1&v=/);
  assert.equal((await route.GET(request())).status, 503);
});

test("authenticated image reads redirect privately, while missing photos and anonymous reads fail safely", async () => {
  const { route, request } = routeFixture();
  const imageRequest = request(); imageRequest.nextUrl.searchParams.set("image", "1");
  const image = await route.GET(imageRequest);
  assert.equal(image.status, 307);
  assert.match(image.headers.get("location"), new RegExp(`${userId}/profile\\?token=signed`));
  assert.equal(image.headers.get("cache-control"), "private, no-store");
  const anonymous = request(false); anonymous.nextUrl.searchParams.set("image", "1");
  assert.equal((await route.GET(anonymous)).status, 401);
  const empty = routeFixture({ missingPhoto: true });
  const missing = empty.request(); missing.nextUrl.searchParams.set("image", "1");
  assert.equal((await empty.route.GET(missing)).status, 404);
});

test("nested camera and editor scroll locks release correctly when the parent unmounts first", () => {
  const { lockBodyScroll } = load("app/_lib/body-scroll-lock.ts", {});
  const body = { style: { overflow: "auto" } };
  const editorUnlock = lockBodyScroll(body);
  const cameraUnlock = lockBodyScroll(body);
  assert.equal(body.style.overflow, "hidden");
  editorUnlock(); assert.equal(body.style.overflow, "hidden");
  cameraUnlock(); assert.equal(body.style.overflow, "auto");
  cameraUnlock(); assert.equal(body.style.overflow, "auto");
});

test("the profile editor reuses the tested camera and allows a separate gallery choice", () => {
  const component = source("app/_components/resident-profile-photo-editor.tsx");
  assert.match(component, /ResidentSelfieCapture/);
  assert.match(component, /type="file"/);
  assert.match(component, /shrinkPhoto/);
  assert.match(component, /AbortController/);
  assert.match(source("app/resident/layout.tsx"), /useResidentProfilePhoto/);
});

const flush = async () => { await new Promise(setImmediate); await new Promise(setImmediate); };
test("a late photo read cannot overwrite the resident's newly saved photo", async () => {
  const window = new EventTarget(); const values = []; let resolveRead, cleanup, signal;
  const { useResidentProfilePhoto } = load("app/_lib/resident-profile-photo.ts", {
    react: { useState: () => [null, value => values.push(value)], useEffect: effect => { cleanup = effect(); } },
  }, { window, fetch: (_url, options) => { signal = options.signal; return new Promise(resolve => { resolveRead = resolve; }); } });
  useResidentProfilePhoto();
  window.dispatchEvent(new CustomEvent("alab:resident-photo-changed", { detail: { photoUrl: "https://storage.example.test/new.jpg" } }));
  resolveRead(Response.json({ photoUrl: "https://storage.example.test/old.jpg" }));
  await flush();
  assert.deepEqual(values, ["https://storage.example.test/new.jpg"]);
  cleanup(); assert.equal(signal.aborted, true);
});

function editorHarness({ response = () => Response.json({ photoUrl: "https://storage.example.test/saved.jpg" }) } = {}) {
  const state = [], effects = [], deps = [], cleanups = []; let cursor, tree, dirty = false, closed = 0;
  const requests = [], changed = [], urls = [];
  const window = new EventTarget();
  window.setTimeout = setTimeout; window.clearTimeout = clearTimeout;
  window.addEventListener("alab:resident-photo-changed", event => changed.push(event.detail.photoUrl));
  const document = { activeElement: { isConnected: true, focus() {} }, body: { style: { overflow: "" } } };
  const react = {
    useState(initial) { const key = cursor++; if (!(key in state)) state[key] = initial; return [state[key], value => { state[key] = typeof value === "function" ? value(state[key]) : value; dirty = true; }]; },
    useRef(initial) { const key = cursor++; return state[key] ??= { current: initial }; },
    useCallback(callback) { cursor++; return callback; },
    useEffect(effect, dependencies) {
      const key = cursor++;
      if (!deps[key] || dependencies.some((value, index) => value !== deps[key][index])) {
        deps[key] = dependencies; effects.push(() => { cleanups[key]?.(); cleanups[key] = effect(); });
      }
    },
  };
  const jsx = (type, props) => {
    if (props.ref) props.ref.current = { focus() {}, querySelector: () => null, querySelectorAll: () => [], click() {} };
    return { type, props };
  };
  const camera = () => null;
  const { ResidentProfilePhotoEditor } = load("app/_components/resident-profile-photo-editor.tsx", {
    react, "react/jsx-runtime": { jsx, jsxs: jsx },
    "../_lib/resident-profile-photo": { DEFAULT_RESIDENT_PHOTO: "/images/resident-avatar.webp", RESIDENT_PHOTO_CHANGED: "alab:resident-photo-changed" },
    "../_lib/shrink-photo": { shrinkPhoto: async file => file },
    "../_lib/body-scroll-lock": load("app/_lib/body-scroll-lock.ts", {}),
    "../_lib/resident-text": { useResidentText: () => text => text },
    "../_content/resident-text": { RESIDENT_TEXT: {} },
    "./resident-selfie-capture": { ResidentSelfieCapture: camera, residentSelfieCaptureStyles: "", trapDialogFocus() {} },
  }, { document, window, URL: { createObjectURL: () => { const url = `blob:preview-${urls.length}`; urls.push({ url, revoked: false }); return url; },
    revokeObjectURL: url => { const saved = urls.find(item => item.url === url); if (saved) saved.revoked = true; } },
    fetch: async (url, options) => { requests.push({ url, options }); return response(url, options); },
  });
  const props = { currentPhoto: "https://storage.example.test/old.jpg", onClose: () => { closed++; } };
  const render = () => {
    do { dirty = false; cursor = 0; tree = ResidentProfilePhotoEditor(props); while (effects.length) effects.shift()(); } while (dirty);
    return tree;
  };
  const nodes = (node = tree) => !node || typeof node !== "object" ? [] : [node, ...[node.props?.children].flat(Infinity).filter(child => child != null).flatMap(child => nodes(child))];
  render();
  return { render, requests, changed, urls, document,
    get closed() { return closed; },
    pick: file => { nodes().find(node => node.type === "input").props.onChange({ currentTarget: { files: [file], value: "photo.jpg" } }); render(); },
    capture: file => { nodes().find(node => node.type === camera).props.onCapture(file); render(); },
    save: () => nodes().find(node => node.props?.className === "rpp-save").props.onClick(),
    saveDisabled: () => nodes().find(node => node.props?.className === "rpp-save").props.disabled,
    error: () => nodes().find(node => node.props?.role === "alert")?.props.children,
    cleanup: () => cleanups.forEach(cleanup => cleanup?.()),
  };
}

test("gallery and confirmed camera photos both reach the real multipart save action", async () => {
  for (const action of ["pick", "capture"]) {
    const h = editorHarness();
    try {
      const file = await imageFile();
      h[action](file); assert.equal(h.saveDisabled(), false);
      h.save(); await flush(); h.render();
      assert.equal(h.requests.length, 1);
      assert.equal(h.requests[0].options.method, "POST");
      assert.equal(h.requests[0].options.body.get("photo").name, file.name);
      assert.deepEqual(h.changed, ["https://storage.example.test/saved.jpg"]);
      assert.equal(h.closed, 1);
    } finally { h.cleanup(); }
    assert.equal(h.urls.every(url => url.revoked), true);
  }
});

test("a failed save keeps the editor open and never replaces the displayed photo", async () => {
  const h = editorHarness({ response: () => Response.json({ error: "Storage is temporarily unavailable." }, { status: 503 }) });
  try {
    h.pick(await imageFile()); h.save(); await flush(); h.render();
    assert.match(h.error(), /temporarily unavailable/);
    assert.equal(h.closed, 0); assert.deepEqual(h.changed, []);
    assert.equal(h.saveDisabled(), false);
  } finally { h.cleanup(); }
});

test("unmount aborts an upload and ignores a late successful response", async () => {
  let resolveUpload;
  const h = editorHarness({ response: () => new Promise(resolve => { resolveUpload = resolve; }) });
  h.capture(await imageFile()); h.save(); await flush(); h.render();
  assert.equal(h.saveDisabled(), true);
  h.save(); assert.equal(h.requests.length, 1);
  h.cleanup();
  assert.equal(h.requests[0].options.signal.aborted, true);
  resolveUpload(Response.json({ photoUrl: "https://storage.example.test/late.jpg" })); await flush();
  assert.deepEqual(h.changed, []); assert.equal(h.closed, 0);
  assert.equal(h.document.body.style.overflow, "");
});
