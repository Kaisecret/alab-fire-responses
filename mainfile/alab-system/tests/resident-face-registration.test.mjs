import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";

import { loadServerModule } from "./helpers/load-server-module.mjs";
import { signIdVerification } from "../lib/resident-applications/id-verification-token.mjs";

const SECRET = "resident-face-test-secret-with-at-least-32-characters";
const payload = { firstName: "Juan", lastName: "Dela Cruz", email: "", phone: "+639171234567", municipality: "Hamtic", barangay: "Mapatag", address: "Brgy. Mapatag, Hamtic", username: "juandela", passwordHash: "already-hashed", termsAccepted: true };
const next = { NextResponse: { json(body, init = {}) { const response = Response.json(body, init); response.cookies = { values: [], set(...args) { this.values.push(args); } }; return response; } } };
let address = 0;

async function fixture() {
  const proof = await import("../lib/resident-applications/face-verification-token.mjs");
  const images = await Promise.all(["#eeeeee", "#dddddd", "#bbbbbb", "#999999", "#777777"].map(background => sharp({ create: { width: 160, height: 160, channels: 3, background } }).png().toBuffer()));
  const hashes = images.map(proof.evidenceSha256);
  const idToken = signIdVerification({ sha256: hashes[0], backSha256: hashes[1], firstName: payload.firstName, lastName: payload.lastName }, SECRET);
  const faceEvidence = { sha256: hashes[0], backSha256: hashes[1], selfieSha256: hashes[2], selfieRightSha256: hashes[3], selfieLeftSha256: hashes[4], name: "juan|dela cruz", score: 0.8, threshold: 0.363 };
  const faceToken = proof.signFaceVerification(faceEvidence, SECRET);
  const form = () => { const data = new FormData(); for (const [i, key] of ["frontId", "backId", "selfie", "selfieRight", "selfieLeft"].entries()) data.set(key, new File([images[i]], `${key}.png`, { type: "image/png" })); data.set("verificationId", "otp-verification"); data.set("idVerificationToken", idToken); data.set("faceVerificationToken", faceToken); return data; };
  return { proof, images, hashes, idToken, faceToken, faceEvidence, form };
}

function request(data) { return new Request("https://alab.test/api", { method: "POST", body: data, headers: { "x-real-ip": `test-${++address}` } }); }
function faceRoute(f, compare, sharpDependency = { default: sharp }) { return loadServerModule("app/api/auth/register/face-check/route.ts", { "next/server": next, sharp: sharpDependency, "../../../../../lib/resident-applications/face-verification-token.mjs": f.proof, "../../../../../lib/resident-applications/face-match": { compareResidentFaces: compare } }); }

test("face-check signs only server matches bound to the exact accepted ID and selfie", async () => {
  process.env.AUTH_SECRET = SECRET;
  const f = await fixture();
  let comparisons = 0;
  const { POST } = faceRoute(f, async (front, selfie) => { comparisons++; assert.deepEqual(front, f.images[0]); assert.deepEqual(selfie, f.images[2]); return { ok: true, score: 0.8, threshold: 0.363 }; });
  const result = await POST(request(f.form()));
  assert.equal(result.status, 200);
  const body = await result.json();
  const proof = f.proof.readFaceVerification(body.token, SECRET);
  assert.equal(body.verified, true);
  assert.equal(proof.selfieSha256, f.hashes[2]);
  assert.equal(proof.selfieRightSha256, f.hashes[3]);
  assert.equal(proof.selfieLeftSha256, f.hashes[4]);
  assert.equal(proof.name, "juan|dela cruz");
  assert.equal(comparisons, 1);
});

test("face-check requires each selfie view before comparing the front photo", async () => {
  process.env.AUTH_SECRET = SECRET;
  const f = await fixture();
  const { POST } = faceRoute(f, async () => assert.fail("incomplete selfie views reached inference"));
  for (const key of ["selfie", "selfieRight", "selfieLeft"]) {
    const data = f.form(); data.delete(key);
    const response = await POST(request(data));
    assert.equal(response.status, 400); assert.equal((await response.json()).code, "SELFIE_VIEWS_REQUIRED");
  }
});

test("face-check refuses absent, appended, expired or image-mismatched ID proofs before inference", async () => {
  process.env.AUTH_SECRET = SECRET;
  const f = await fixture();
  const { POST } = faceRoute(f, async () => assert.fail("unverified evidence reached inference"));
  for (const token of ["", `${f.idToken}.extra`, signIdVerification({ sha256: f.hashes[0], backSha256: f.hashes[1], firstName: "Juan", lastName: "Dela Cruz" }, SECRET, Date.now() - 61 * 60_000)]) {
    const data = f.form(); data.set("idVerificationToken", token);
    const response = await POST(request(data));
    assert.equal(response.status, 400); assert.equal((await response.json()).code, "ID_NOT_VERIFIED");
  }
  const changed = f.form(); changed.set("backId", new File([f.images[0]], "changed.png", { type: "image/png" }));
  assert.equal((await (await POST(request(changed))).json()).code, "ID_NOT_VERIFIED");
});

test("face-check rejects failed comparison and forged browser scores without signing", async () => {
  process.env.AUTH_SECRET = SECRET;
  const f = await fixture();
  const { POST } = faceRoute(f, async () => ({ ok: false, code: "FACE_MISMATCH", message: "Retake your selfie so it matches your ID." }));
  const data = f.form(); data.set("verified", "true"); data.set("score", "1");
  const response = await POST(request(data)); const body = await response.json();
  assert.equal(response.status, 422); assert.equal(body.verified, false); assert.equal(body.code, "FACE_MISMATCH"); assert.equal(body.token, undefined);
  const unavailable = faceRoute(f, async () => ({ ok: false, code: "FACE_SERVICE_UNAVAILABLE", message: "Selfie checking is temporarily unavailable." }));
  assert.equal((await unavailable.POST(request(f.form()))).status, 503);
  const busy = faceRoute(f, async () => ({ ok: false, code: "FACE_SERVICE_BUSY", message: "Please try again shortly." }));
  assert.equal((await busy.POST(request(f.form()))).status, 503);
});

test("face-check validates image types, signatures, byte limits, decode and pixel bounds before inference", async () => {
  process.env.AUTH_SECRET = SECRET;
  const f = await fixture();
  const { POST } = faceRoute(f, async () => assert.fail("invalid image reached inference"));
  const giant = await sharp({ create: { width: 5001, height: 100, channels: 3, background: "white" } }).png().toBuffer();
  for (const file of [new File(["text"], "x.png", { type: "image/png" }), new File([f.images[2]], "x.txt", { type: "text/plain" }), new File([Buffer.alloc(6 * 1024 * 1024 + 1)], "x.png", { type: "image/png" }), new File([f.images[2].subarray(0, 16)], "bad.png", { type: "image/png" }), new File([giant], "giant.png", { type: "image/png" })]) {
    for (const key of ["selfie", "selfieRight", "selfieLeft"]) {
      const data = f.form(); data.set(key, file);
      const response = await POST(request(data)); assert.equal(response.status, 400); assert.equal((await response.json()).code, "INVALID_IMAGE");
    }
  }
});

test("face-check fails closed for a short secret or unavailable inference and bounds repeated checks", async () => {
  const f = await fixture(); let calls = 0;
  const { POST } = faceRoute(f, async () => { calls++; throw new Error("private engine details"); });
  process.env.AUTH_SECRET = "short";
  assert.equal((await POST(request(f.form()))).status, 503); assert.equal(calls, 0);
  process.env.AUTH_SECRET = SECRET;
  const response = await POST(request(f.form())); assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /private engine details/);
  const ip = `rate-${++address}`;
  let last;
  for (let i = 0; i < 13; i++) last = await POST(new Request("https://alab.test/api", { method: "POST", body: f.form(), headers: { "x-real-ip": ip } }));
  assert.equal(last.status, 429);
});

test("missing native image processing reports a temporary service failure", async () => {
  process.env.AUTH_SECRET = SECRET;
  const f = await fixture();
  const unavailableSharp = Object.defineProperty({}, "default", { get() { throw new Error("private native dependency path"); } });
  const { POST } = faceRoute(f, async () => assert.fail("unavailable image processing reached inference"), unavailableSharp);
  const response = await POST(request(f.form()));
  assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /private native dependency path/);
});

test("invalid proofs cannot exhaust face-check capacity and spoofed proxy headers cannot reset limits", async () => {
  process.env.AUTH_SECRET = SECRET;
  const f = await fixture();
  const { POST } = faceRoute(f, async () => ({ ok: false, code: "FACE_MISMATCH", message: "Retake your selfie." }));
  const ip = `platform-${++address}`;
  const send = data => POST(new Request("https://alab.test/api", { method: "POST", body: data,
    headers: { "x-vercel-forwarded-for": ip, "cf-connecting-ip": `spoof-${++address}`, "x-real-ip": `spoof-${address}` } }));
  for (let i = 0; i < 13; i++) {
    const data = f.form(); data.delete("idVerificationToken");
    assert.equal((await send(data)).status, 400);
  }
  for (let i = 0; i < 12; i++) assert.equal((await send(f.form())).status, 422);
  assert.equal((await send(f.form())).status, 429);
});

function registrationRoute(f, { auto = true, otp = payload, failTransaction = false } = {}) {
  const queries = []; const notices = []; const uploadedInputs = []; let uploads = 0; let cleaned = 0; let municipalRecipients = 0;
  process.env.AUTH_SECRET = SECRET; process.env.RESIDENT_AUTO_APPROVAL_ENABLED = String(auto);
  const query = async (sql, values) => { queries.push({ sql, values }); if (/select payload/.test(sql)) return { rowCount: otp ? 1 : 0, rows: otp ? [{ payload: otp }] : [] }; if (/select m.id/.test(sql)) return { rowCount: 1, rows: [{ municipality_id: "municipality", barangay_id: "barangay" }] }; return { rowCount: 0, rows: [] }; };
  const asset = (key, index) => ({ originalKey: key, reviewKey: `${key}-review`, sha256: f.hashes[index], mimeType: "image/png", sizeBytes: f.images[index].length });
  const route = loadServerModule("app/api/auth/register/route.ts", {
    "next/server": next, "../../../../lib/db": { getDatabase: () => ({ query }), withTransaction: async work => { if (failTransaction) throw new Error("database failure"); return work({ query }); } },
    "../../../../lib/auth/password": { hashPassword: async () => "password-hash" },
    "../../../../lib/auth/session": { createResidentApplicantSession: () => "applicant-session", residentApplicantCookie: { httpOnly: true }, RESIDENT_APPLICANT_COOKIE: "applicant", RESIDENT_SESSION_COOKIE: "resident" },
    "../../../../lib/auth/google-signup-prefill": { getGoogleSignupPrefill: async () => null, GOOGLE_SIGNUP_PREFILL_COOKIE: "google-prefill" },
    "../../../../lib/resident-applications/evidence": { uploadIdentityEvidence: async input => { uploads++; uploadedInputs.push(input); return { front: asset("front", 0), back: asset("back", 1), selfie: asset("selfie", 2), uploadedKeys: ["front", "back", "selfie"] }; }, removeIdentityEvidence: async keys => { cleaned += keys.length; } },
    "../../../../lib/notifications/service": { createAccountNotifications: async (_client, notice) => { notices.push(notice); }, listMunicipalNotificationRecipients: async () => { municipalRecipients++; return ["reviewer"]; } },
    "../../../../lib/resident-applications/id-name-match.mjs": { registeredNameKey: (first, last) => `${first.toLowerCase()}|${last.toLowerCase()}` },
    "../../../../lib/resident-applications/face-verification-token.mjs": f.proof,
  });
  return { ...route, queries, notices, uploadedInputs, get uploads() { return uploads; }, get cleaned() { return cleaned; }, get municipalRecipients() { return municipalRecipients; } };
}

test("registration refuses missing, forged, expired or changed face evidence before uploads and inserts", async () => {
  const f = await fixture();
  const expired = f.proof.signFaceVerification(f.faceEvidence, SECRET, Date.now() - 31 * 60_000);
  for (const token of ["", "browser-says-pass", `${f.faceToken}.extra`, expired]) {
    const route = registrationRoute(f); const data = f.form(); data.set("faceVerificationToken", token); data.set("autoApprove", "true");
    const response = await route.POST(request(data)); assert.equal(response.status, 400); assert.equal((await response.json()).code, "FACE_NOT_VERIFIED"); assert.equal(route.uploads, 0); assert.equal(route.queries.some(q => /insert into users/.test(q.sql)), false);
  }
  for (const change of ["selfie", "selfieRight", "selfieLeft", "name"]) {
    const route = registrationRoute(f, change === "name" ? { otp: { ...payload, firstName: "Pedro" } } : {}); const data = f.form();
    if (change !== "name") data.set(change, new File([f.images[0]], "other.png", { type: "image/png" }));
    else data.set("idVerificationToken", signIdVerification({ sha256: f.hashes[0], backSha256: f.hashes[1], firstName: "Pedro", lastName: payload.lastName }, SECRET));
    const response = await route.POST(request(data)); assert.equal(response.status, 400); assert.equal((await response.json()).code, "FACE_NOT_VERIFIED"); assert.equal(route.uploads, 0);
  }
});

test("registration requires all three selfie views before uploads and database writes", async () => {
  const f = await fixture();
  for (const key of ["selfie", "selfieRight", "selfieLeft"]) {
    const route = registrationRoute(f); const data = f.form(); data.delete(key);
    const response = await route.POST(request(data));
    assert.equal(response.status, 400); assert.equal((await response.json()).code, "SELFIE_VIEWS_REQUIRED");
    assert.equal(route.uploads, 0); assert.equal(route.queries.some(q => /insert into/.test(q.sql)), false);
  }
});

test("registration rejects ambiguous duplicate evidence fields before any upload", async () => {
  const f = await fixture();
  for (const key of ["frontId", "backId", "selfie", "selfieRight", "selfieLeft"]) {
    const route = registrationRoute(f); const data = f.form();
    data.append(key, new File([f.images[0]], "altered.png", { type: "image/png" }));
    assert.equal((await route.POST(request(data))).status, 400); assert.equal(route.uploads, 0);
  }
});

test("automatic activation writes real schema statuses and an unassigned approval event, keeps applicant navigation", async () => {
  const f = await fixture(); const route = registrationRoute(f);
  const response = await route.POST(request(f.form())); const body = await response.json();
  assert.equal(response.status, 201); assert.equal(body.application.status, "VERIFIED"); assert.equal(body.redirectTo, "/resident/application");
  assert.deepEqual(Buffer.from(await route.uploadedInputs[0].selfieRight.arrayBuffer()), f.images[3]);
  assert.deepEqual(Buffer.from(await route.uploadedInputs[0].selfieLeft.arrayBuffer()), f.images[4]);
  const user = route.queries.find(q => /insert into users/.test(q.sql)); assert.ok(user.values.includes("ACTIVE"));
  const verification = route.queries.find(q => /insert into resident_verifications\s/.test(q.sql)); assert.ok(verification.values.includes("VERIFIED"));
  const approved = route.queries.find(q => /insert into resident_verification_events/.test(q.sql) && /APPROVED/.test(q.sql));
  assert.ok(approved); assert.match(approved.sql, /actor_user_id/); assert.ok(approved.values.includes(null));
  const metadata = approved.values.find(value => typeof value === "string" && value.startsWith("{"));
  assert.deepEqual(JSON.parse(metadata), { municipalityId: "municipality", method: "automatic_face_match", score: 0.8, threshold: 0.363 });
  assert.equal(route.municipalRecipients, 0); assert.equal(route.notices.length, 1); assert.equal(route.notices[0].eventType, "RESIDENT_APPLICATION_APPROVED"); assert.equal(route.notices[0].actorUserId, null);
  assert.equal(response.cookies.values[0][0], "applicant"); assert.equal(response.cookies.values[0][1], "applicant-session");
});

test("disabled automatic approval retains pending review and ignores browser activation flags", async () => {
  const f = await fixture(); const route = registrationRoute(f, { auto: false }); const data = f.form(); data.set("autoApprove", "true"); data.set("accountStatus", "ACTIVE");
  const response = await route.POST(request(data)); assert.equal(response.status, 201); assert.equal((await response.json()).application.status, "PENDING");
  assert.ok(route.queries.find(q => /insert into users/.test(q.sql)).values.includes("PENDING_REVIEW"));
  assert.ok(route.queries.find(q => /insert into resident_verifications\s/.test(q.sql)).values.includes("PENDING"));
  assert.equal(route.queries.some(q => /APPROVED/.test(q.sql)), false); assert.equal(route.notices[0].eventType, "RESIDENT_APPLICATION_SUBMITTED");
});

test("registration keeps OTP gating and cleans uploaded evidence after a failed transaction", async () => {
  const f = await fixture(); const withoutOtp = registrationRoute(f, { otp: null });
  assert.equal((await withoutOtp.POST(request(f.form()))).status, 400); assert.equal(withoutOtp.uploads, 0);
  const route = registrationRoute(f, { failTransaction: true }); const originalError = console.error; console.error = () => {};
  try { assert.equal((await route.POST(request(f.form()))).status, 500); } finally { console.error = originalError; }
  assert.equal(route.uploads, 1); assert.equal(route.cleaned, 3);
});
