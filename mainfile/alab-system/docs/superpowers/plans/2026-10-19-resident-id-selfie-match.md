# Resident ID and selfie matching implementation plan

**Goal:** Verify a resident's ID and selfie using free face models, automatically activate successful registrations after OTP, and provide separate ID and selfie steps.

**Architecture:** Six steps cover personal details, address, paired ID photos, selfie, account security, and review/OTP. Both ID photos are checked together; only a successful current pair automatically opens the selfie step. Errors remain with the relevant photos. A face-check endpoint checks the signed ID proof, compares the ID portrait and confirmed selfie on the server, and signs a short-lived proof bound to the exact images and registered name. Registration requires this proof and can activate new verified accounts when the server-side automatic-approval setting is enabled. Existing camera confirmation controls, OTP provider, styling and application-status redirect are retained.

**Tech stack:** Existing Next.js 16.2.12, TypeScript, Sharp, Postgres, protected evidence storage; ONNX Runtime Node with MIT-licensed OpenCV YuNet and Apache-licensed SFace models. No new paid verification API.

## Constraints

- The latest user request explicitly authorizes separate ID and selfie steps and automatic ID-to-selfie progression; this supersedes the earlier instruction to keep all five steps unchanged.
- No labels identifying a demo, head-turn steps, or unrelated redesign.
- Existing Gemini ID checks and OTP remain in place. Free refers to the additional face-comparison feature.
- Perform comparison on the server; never trust a browser-supplied score or success flag.
- Face comparison is photograph matching, not a claim of certified liveness or government document authenticity.
- Bind the face proof to the exact front/back ID hashes, selfie hash, name, and expiration.
- Invalid, missing, altered, expired, mismatched, faceless, or multi-face evidence must not activate an account.
- Never expose API keys, store embeddings, log images, or make identity evidence public.
- No schema changes, bulk activation, or changes to existing pending residents.
- Preserve existing SEO, canonical-domain redirect, Google verification file, and unrelated local edits.

## Task 1: Face matching runtime

**Files:** New `lib/resident-applications/face-match.ts`, supporting pure helper module, versioned model assets and licenses, targeted tests, and pinned package dependency/lockfile.

**Interface:** `compareResidentFaces(idImage: Buffer, selfieImage: Buffer): Promise<FaceMatchResult>`, with `FaceMatchResult` equal to `{ ok: true; score: number; threshold: number }` or `{ ok: false; code: string; message: string }`.

- [ ] Test normalized similarity, invalid embeddings, face selection, and crop/alignment boundaries before implementing the helpers.
- [ ] Decode model outputs, reject absent/multiple faces, align each portrait, and compare normalized embeddings using the published SFace cosine threshold as the initial evaluation setting.
- [ ] Load pinned model files and licenses from the application, cache sessions, bound image dimensions, and use CPU-only inference suitable for Vercel.
- [ ] Verify native runtime loading and a no-face image; report model and native-file packaging requirements.

## Task 2: Server proof and automatic registration

**Files:** New `lib/resident-applications/face-verification-token.mjs`, new `app/api/auth/register/face-check/route.ts`, update `app/api/auth/register/route.ts`, targeted token/route/registration tests.

**Interface:** Face-check consumes multipart `frontId`, `backId`, `selfie`, `idVerificationToken` and returns `{ verified: true, token }` or `{ verified: false, code, message }`. Registration additionally consumes multipart `faceVerificationToken`.

- [ ] Test forged/expired proofs, changed image/name bindings, absent ID proof, and failed face comparison.
- [ ] Validate signed ID proof, uploaded image limits/signatures, and request rate before inference; return actionable failures without image data or embeddings.
- [ ] Require the signed image-bound face proof at registration after OTP and ID verification.
- [ ] With `RESIDENT_AUTO_APPROVAL_ENABLED=true`, insert a new resident as `ACTIVE`, verification as `VERIFIED`, and an `APPROVED` event with automatic-verification metadata and no invented BFP reviewer. Otherwise retain the existing pending status.
- [ ] Preserve OTP, protected evidence upload/cleanup, uniqueness checks, cookies, notification preferences, and `/resident/application` navigation.
- [ ] Test that clients cannot request activation with a flag and that failed checks never write an active user.

## Task 3: Existing signup integration

**Files:** `app/_components/signup-page.tsx`, `lib/resident-applications/face-check-client.mjs`, `tests/resident-face-check-client.test.mjs`, existing signup verification tests.

- [ ] When the existing Use selfie control confirms a capture, submit the current ID and selfie to the face-check endpoint.
- [ ] Show checking/success/error text through existing status elements. Wait for both ID sides, automatically advance only on a complete valid current pair, and keep ID errors on step 3 and selfie errors on step 4.
- [ ] Invalidate old face proofs when the ID, registered name, or selfie changes; ignore stale network responses and cancel work during unmount/retake.
- [ ] Block continuation/account submission until both signed ID and face proofs exist, and include the face proof in final registration.
- [ ] Reuse the current retake behavior for a mismatch and keep the current application-status redirect.
- [ ] Preserve Back/editing after OTP by restoring the original review controls and resetting the retained submit button. Do not let stale verification responses pull the user forward after Back or unmount.
- [ ] Run the real signup effect navigation tests, including pair-first upload, both orders, wrong-side/mismatch/network errors, replacement races, expired proof, selfie comparison, review/OTP, and final bound-proof registration.

## Task 4: Build and deployment

**Files:** `next.config.ts`, deployment snapshot, operational documentation.

- [ ] Trace model assets and Linux CPU native libraries into the face-check function; exclude unused platform/GPU binaries where necessary and verify the function size limit.
- [ ] Run targeted tests, complete project tests, TypeScript/build, and runtime packaging checks.
- [ ] Deploy an isolated snapshot containing the authorized changes and existing live SEO changes; run the normal build without unrelated release database migrations.
- [ ] Verify deployment readiness before promotion; enable the automatic-approval server setting for the thesis deployment.
- [ ] Verify deployed homepage redirect, verification file, sitemap, signup, rejected missing/invalid face evidence, and unchanged unauthenticated API behavior.
- [ ] Document that real camera success/mismatch and OTP checks require consenting test participants and that this implements photo matching without certified liveness.
