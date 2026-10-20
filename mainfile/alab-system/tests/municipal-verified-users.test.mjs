import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { loadServerModule } from "./helpers/load-server-module.mjs";

const pageUrl = new URL("../app/municipal-bfp/verification-queue/page.tsx", import.meta.url);
const require = createRequire(pageUrl);
const { MunicipalStatCards } = loadServerModule("app/_components/municipal-stat-cards.tsx", {
  "react/jsx-runtime": jsxRuntime,
  "next/link": require("next/link"),
});

function resident(id, status = "VERIFIED", accountStatus = "ACTIVE", extra = {}) {
  return { id, reference: `REF-${id}`, status, accountStatus, submittedAt: "2026-10-20T01:00:00.000Z", correctionReason: null,
    firstName: id, lastName: "Resident", email: `${id.toLowerCase()}@example.test`, phone: "09170000001", barangay: "Mapatag", address: "Test address", ...extra };
}

function harness(responses) {
  const code = ts.transpileModule(readFileSync(pageUrl, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const slots = [];
  const timers = new Map();
  const intervals = new Map();
  const listeners = new Map();
  let cursor = 0;
  let nextTimer = 0;
  let dirty = true;
  let effects = [];
  let tree;
  const sameDeps = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { value: typeof initial === "function" ? initial() : initial };
      return [slots[index].value, (next) => {
        const value = typeof next === "function" ? next(slots[index].value) : next;
        if (!Object.is(slots[index].value, value)) { slots[index].value = value; dirty = true; }
      }];
    },
    useMemo(factory, deps) {
      const index = cursor++;
      if (!sameDeps(slots[index]?.deps, deps)) slots[index] = { deps, value: factory() };
      return slots[index].value;
    },
    useCallback(callback, deps) { return hooks.useMemo(() => callback, deps); },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!sameDeps(slots[index]?.deps, deps)) {
        const previous = slots[index]?.cleanup;
        slots[index] = { deps };
        effects.push(() => { previous?.(); slots[index].cleanup = effect(); });
      }
    },
  };
  const requests = [];
  const pendingResponses = [...responses];
  const fetch = async (url, options = {}) => {
    requests.push({ url, options });
    const reply = await pendingResponses.shift();
    assert.ok(reply, `Unexpected request: ${url}`);
    if (reply instanceof Error) throw reply;
    return { ok: reply.ok ?? true, json: async () => reply.body };
  };
  const exported = {};
  const browser = {
    setTimeout(fn) { const id = ++nextTimer; timers.set(id, fn); return id; }, clearTimeout(id) { timers.delete(id); },
    setInterval(fn, delay) { const id = ++nextTimer; intervals.set(id, { fn, delay }); return id; }, clearInterval(id) { intervals.delete(id); },
  };
  const document = {
    body: {}, visibilityState: "visible",
    addEventListener(type, listener) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(listener); },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
  };
  new Function("require", "exports", "window", "document", code)((name) => {
    if (name === "react") return hooks;
    if (name === "react-dom") return { createPortal: (children) => children };
    if (name === "react/jsx-runtime") return jsxRuntime;
    if (name.endsWith("municipal-tab-fetch")) return { municipalTabFetch: fetch };
    if (name.endsWith("municipal-stat-cards")) return { MunicipalStatCards };
    return require(name);
  }, exported, browser, document);
  async function settle() {
    for (let iteration = 0; iteration < 12; iteration++) {
      if (dirty) { cursor = 0; dirty = false; tree = exported.default(); }
      const queued = effects; effects = [];
      queued.forEach((effect) => effect());
      const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach((fn) => fn());
      await new Promise((resolve) => setImmediate(resolve));
      if (!dirty && effects.length === 0 && timers.size === 0) return;
    }
    throw new Error("Municipal directory did not settle.");
  }
  function nodes(value) {
    if (value == null || typeof value === "boolean") return [];
    if (Array.isArray(value)) return value.flatMap(nodes);
    if (typeof value !== "object") return [];
    if (typeof value.type === "function") return nodes(value.type(value.props));
    if (value.type === "style") return [];
    return [value, ...nodes(value.props?.children)];
  }
  const html = () => renderToStaticMarkup(tree).replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
  const text = () => html().replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  const find = (predicate) => nodes(tree).find(predicate);
  const buttons = () => nodes(tree).filter((node) => node.type === "button");
  const button = (label) => buttons().find((node) => renderToStaticMarkup(node).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() === label || node.props["aria-label"] === label);
  return {
    settle, html, text, find, buttons, button, requests, intervals, listeners,
    async poll() { [...intervals.values()].forEach(({ fn }) => fn()); await settle(); },
    async visibility(state) { document.visibilityState = state; listeners.get("visibilitychange")?.forEach((fn) => fn()); await settle(); },
    unmount() { slots.forEach((slot) => slot?.cleanup?.()); },
  };
}

test("municipal Verified Users renders only verified active residents from a mixed-status response", async () => {
  const page = harness([{ body: { municipality: "Hamtic", applications: [
    resident("Verified"), resident("Pending", "PENDING"), resident("Corrections", "CHANGES_REQUESTED"),
    resident("Inactive", "VERIFIED", "SUSPENDED"), resident("Incomplete", "VERIFIED", "PENDING_REVIEW"),
  ] } }]);
  await page.settle();
  assert.match(page.text(), /Verified Users/);
  assert.match(page.text(), /Verified Resident/);
  assert.match(page.text(), /Hamtic Station Command/);
  assert.doesNotMatch(page.text(), /Pending Resident|Corrections Resident|Inactive Resident|Incomplete Resident/);
  assert.equal(new URL(page.requests[0].url, "http://local.test").searchParams.get("status"), "VERIFIED");
  assert.doesNotMatch(page.text(), /Under Review|Needs Correction|Approved|All submissions|View All Applications/);
  assert.equal(page.find((node) => node.props?.role === "tablist"), undefined);
});

test("municipal directory keeps read-only detail and evidence without approval or corrections actions", async () => {
  const verified = resident("Verified");
  const page = harness([
    { body: { applications: [verified], municipality: "Hamtic" } },
    { body: { application: { ...verified, username: "verified-resident", municipality: "Hamtic", evidence: { frontUrl: "/protected/front", backUrl: null, selfieUrl: "/protected/selfie" }, events: [{ type: "APPROVED", notes: null, createdAt: "2026-10-20T01:00:00.000Z" }] } } },
  ]);
  await page.settle();
  const details = page.button("View details");
  assert.ok(details);
  await details.props.onClick();
  await page.settle();
  assert.ok(page.find((node) => node.props?.role === "dialog"));
  assert.match(page.text(), /Verified Resident|Resident Information|Official Identity Evidence/);
  assert.match(page.html(), /\/protected\/front/);
  assert.doesNotMatch(page.text(), /Approved|Approve Resident|Request corrections|Send Correction|Review saved/);
  assert.equal(page.find((node) => node.type === "textarea"), undefined);
  assert.ok(page.requests.every((request) => !request.options.method || request.options.method === "GET"));
  assert.match(page.requests.at(-1).url, /resident-applications\/Verified$/);
});

test("search stays within verified active users and clear search restores the directory", async () => {
  const page = harness([{ body: { applications: [resident("Verified"), resident("Pending", "PENDING")] } }]);
  await page.settle();
  const search = () => page.find((node) => node.type === "input" && node.props.type === "text");
  for (const query of ["verified", "REF-Verified", "mapatag", "09170000001", "verified@example.test"]) {
    search().props.onChange({ target: { value: query } });
    await page.settle();
    assert.match(page.text(), /Verified Resident/);
    assert.doesNotMatch(page.text(), /Pending Resident/);
  }
  search().props.onChange({ target: { value: "pending" } });
  await page.settle();
  assert.match(page.text(), /No verified users/);
  assert.doesNotMatch(page.text(), /Pending Resident/);
  page.button("Clear Search").props.onClick();
  await page.settle();
  assert.match(page.text(), /Verified Resident/);
  assert.equal(page.requests.length, 1);
});

test("search handles a verified resident without an optional email address", async () => {
  const page = harness([{ body: { applications: [resident("Verified", "VERIFIED", "ACTIVE", { email: null })] } }]);
  await page.settle();
  assert.match(page.text(), /Verified Resident/);
  const search = page.find((node) => node.type === "input" && node.props.type === "text");
  search.props.onChange({ target: { value: "nobody" } });
  await page.settle();
  assert.match(page.text(), /No verified users found/);
  page.button("Clear Search").props.onClick();
  await page.settle();
  assert.match(page.text(), /Verified Resident/);
});

test("load failures show an alert and refresh recovers to the verified directory empty state", async () => {
  const page = harness([
    { ok: false, body: { error: "Directory unavailable" } },
    { body: { applications: [], municipality: "Hamtic" } },
  ]);
  await page.settle();
  assert.match(page.text(), /Directory unavailable/);
  assert.ok(page.find((node) => node.props?.role === "alert"));
  await page.button("Refresh").props.onClick();
  await page.settle();
  assert.equal(page.find((node) => node.props?.role === "alert"), undefined);
  assert.match(page.text(), /No verified users/);
  assert.match(page.text(), /automatically.*ID.*face.*OTP/i);
  assert.equal(page.requests.length, 2);
});

test("a resident who is no longer verified and active cannot open from a stale directory row", async () => {
  for (const detail of [resident("Verified", "PENDING"), resident("Verified", "VERIFIED", "SUSPENDED")]) {
    const page = harness([
      { body: { applications: [resident("Verified")] } },
      { body: { application: detail } },
    ]);
    await page.settle();
    const details = page.button("View details");
    assert.ok(details);
    await details.props.onClick();
    await page.settle();
    assert.equal(page.find((node) => node.props?.role === "dialog"), undefined);
    assert.ok(page.find((node) => node.props?.role === "alert"));
  }
});

test("visible polling and returning to the page refresh verified users, with cleanup on unmount", async () => {
  const page = harness([
    { body: { applications: [resident("Initial")] } },
    { body: { applications: [resident("Returned")] } },
    { body: { applications: [resident("Newest")] } },
  ]);
  await page.settle();
  assert.equal([...page.intervals.values()][0]?.delay, 60_000);
  await page.visibility("hidden");
  await page.poll();
  assert.equal(page.requests.length, 1);
  await page.visibility("visible");
  assert.match(page.text(), /Returned Resident/);
  await page.poll();
  assert.match(page.text(), /Newest Resident/);
  assert.equal(page.requests.length, 3);
  page.unmount();
  assert.equal(page.intervals.size, 0);
  assert.equal(page.listeners.get("visibilitychange")?.size ?? 0, 0);
  await page.poll();
  await page.visibility("visible");
  assert.equal(page.requests.length, 3);
});

test("an older response cannot overwrite a newer verified directory refresh", async () => {
  let finishOld;
  const old = new Promise((resolve) => { finishOld = resolve; });
  const page = harness([old, { body: { applications: [resident("Newest")] } }]);
  await page.settle();
  await page.poll();
  assert.match(page.text(), /Newest Resident/);
  finishOld({ body: { applications: [resident("Old")] } });
  await page.settle();
  assert.match(page.text(), /Newest Resident/);
  assert.doesNotMatch(page.text(), /Old Resident/);
  page.unmount();
});
