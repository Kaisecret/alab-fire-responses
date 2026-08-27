# BFP Mobile Production Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the Flutter BFP responder app to the deployed ALAB server so Municipal BFP personnel can use issued temporary passwords and are forced to replace them before accessing the dashboard.

**Architecture:** New Next.js mobile API routes reuse the existing custom BFP credential service and signed BFP session format. Flutter calls the HTTPS production API, stores only the returned signed token in platform secure storage, and never communicates with Supabase directly.

**Tech Stack:** Next.js 16 route handlers, Node PostgreSQL connection to Supabase, existing HMAC BFP sessions, Flutter, `http`, and `flutter_secure_storage`.

## Global Constraints

- Do not place `DATABASE_URL`, `AUTH_SECRET`, Supabase secret keys, or service-role keys in Flutter source, Android resources, or Git.
- Only active `MUNICIPAL_BFP` accounts may use the mobile routes.
- Keep temporary-password and replacement-password UI in the existing ALAB red Flutter visual system.
- Production API base URL defaults to `https://alab-fire-responses-bynr.vercel.app` and must be HTTPS.
- Preserve the user's unrelated `app/municipal-bfp/verification-queue/page.tsx` change and all existing untracked files.

---

### Task 1: Secure mobile BFP API routes

**Files:**
- Create: `app/api/mobile-bfp/login/route.ts`
- Create: `app/api/mobile-bfp/me/route.ts`
- Create: `app/api/mobile-bfp/change-password/route.ts`
- Create: `lib/auth/mobile-bfp.ts`
- Modify: `tests/bfp-account-provisioning.test.mjs`

**Interfaces:**
- Consumes: `verifyBfpCredentials(email, password, "MUNICIPAL_BFP")`, `changeBfpPassword(userId, currentPassword, nextPassword)`, `getBfpIdentity(userId)`, `createBfpSession(input)`, and `verifyBfpSession(token)`.
- Produces: `POST /api/mobile-bfp/login` returning `{ token, identity, mustChangePassword }`; `GET /api/mobile-bfp/me` returning `{ identity, mustChangePassword }`; `POST /api/mobile-bfp/change-password` returning `{ token, identity, mustChangePassword: false }`.

- [ ] **Step 1: Write the failing route-contract test**

Add a `mobile BFP APIs use bearer sessions and never issue Supabase credentials` test to `tests/bfp-account-provisioning.test.mjs` that verifies all three route files exist, use `runtime = "nodejs"`, reference `requireMobileMunicipalBfp`, use `verifyBfpCredentials` in login, use `changeBfpPassword` in the password route, and do not contain `DATABASE_URL`, `SUPABASE_SECRET_KEY`, or `password_hash` in JSON responses.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/bfp-account-provisioning.test.mjs`

Expected: the new test fails because the `app/api/mobile-bfp` routes do not yet exist.

- [ ] **Step 3: Implement the bearer-session helper and routes**

Create `lib/auth/mobile-bfp.ts` with `requireMobileMunicipalBfp(request: Request)`. It must parse exactly one `Authorization: Bearer <token>` value, validate it with `verifyBfpSession`, reject non-`MUNICIPAL_BFP` roles and expired tokens with `401`, and return the validated session.

Implement login with the existing login rate limiter and `verifyBfpCredentials(email, password, "MUNICIPAL_BFP")`. On success, return only `token`, `mustChangePassword`, and safe identity fields (`userId`, `displayName`, `municipalityId`, `municipalityName`, `assignmentRole`).

Implement `me` with the helper plus `getBfpIdentity`, returning `401` for an invalid session and `403` for a no-longer-active account.

Implement password change with the helper and `changeBfpPassword`. It must require both the submitted current password and a replacement password, issue a refreshed session whose `mustChangePassword` is `false`, and return safe identity fields only.

- [ ] **Step 4: Run the focused test and TypeScript verification**

Run: `node --test tests/bfp-account-provisioning.test.mjs; npx tsc --noEmit`

Expected: all focused BFP tests pass and TypeScript exits with code 0.

- [ ] **Step 5: Commit the server route implementation**

```powershell
git add tests/bfp-account-provisioning.test.mjs lib/auth/mobile-bfp.ts app/api/mobile-bfp
git commit -m "feat: add mobile BFP authentication API"
```

### Task 2: Flutter production API and secure session storage

**Files:**
- Modify: `../../apps/bfp_mobile_app/flutter_application_1/pubspec.yaml`
- Create: `../../apps/bfp_mobile_app/flutter_application_1/lib/services/mobile_bfp_api.dart`
- Create: `../../apps/bfp_mobile_app/flutter_application_1/lib/services/mobile_bfp_session_store.dart`
- Modify: `../../apps/bfp_mobile_app/flutter_application_1/lib/screens/login_screen.dart`
- Modify: `../../apps/bfp_mobile_app/flutter_application_1/lib/main.dart`
- Test: `../../apps/bfp_mobile_app/flutter_application_1/test/mobile_bfp_api_test.dart`

**Interfaces:**
- Consumes: the three JSON APIs from Task 1.
- Produces: `MobileBfpApi.signIn`, `MobileBfpApi.changePassword`, `MobileBfpApi.restoreSession`, and a secure persisted `MobileBfpSession`.

- [ ] **Step 1: Write the failing Flutter API-contract test**

Create `test/mobile_bfp_api_test.dart` that asserts the API base URL defaults to `https://alab-fire-responses-bynr.vercel.app`, the login request uses `/api/mobile-bfp/login`, and a successful response with `mustChangePassword: true` is represented as a session requiring password replacement.

- [ ] **Step 2: Run the focused Flutter test and verify it fails**

Run: `flutter test test/mobile_bfp_api_test.dart`

Expected: failure because `MobileBfpApi` and `MobileBfpSession` are not defined.

- [ ] **Step 3: Implement API client and secure storage**

Add `http` and `flutter_secure_storage` to `pubspec.yaml`, then run `flutter pub get` to update `pubspec.lock`.

Create `MobileBfpApi` using `const String.fromEnvironment("ALAB_API_BASE_URL", defaultValue: "https://alab-fire-responses-bynr.vercel.app")`. It must use JSON requests, short request timeouts, safe server error parsing, and `Authorization: Bearer <token>` for `me` and password changes.

Create `MobileBfpSessionStore` using `FlutterSecureStorage` to persist and clear the token. Do not use `SharedPreferences` for the token.

- [ ] **Step 4: Replace the demo login request**

Update `LoginScreen._handleLogin` to submit the email/password fields through `MobileBfpApi.signIn`. Disable duplicate taps while waiting, show a red-themed visible error on failure, persist the returned token on success, navigate to the temporary-password screen when `mustChangePassword` is true, and otherwise continue to `TermsAndConditionsScreen`.

- [ ] **Step 5: Run Flutter verification**

Run: `flutter test test/mobile_bfp_api_test.dart; flutter analyze`

Expected: focused test passes and analyzer reports no errors.

### Task 3: Forced temporary-password replacement screen

**Files:**
- Create: `../../apps/bfp_mobile_app/flutter_application_1/lib/screens/change_temporary_password_screen.dart`
- Modify: `../../apps/bfp_mobile_app/flutter_application_1/lib/screens/login_screen.dart`
- Modify: `../../apps/bfp_mobile_app/flutter_application_1/lib/main.dart`
- Modify: `../../apps/bfp_mobile_app/flutter_application_1/test/widget_test.dart`

**Interfaces:**
- Consumes: a persisted `MobileBfpSession`, `MobileBfpApi.changePassword`, and the existing `TermsAndConditionsScreen`.
- Produces: a password-change-only route that cannot open `MainNavigationShell` until the server returns a refreshed session.

- [ ] **Step 1: Write the failing widget test**

Extend `test/widget_test.dart` to pump `ChangeTemporaryPasswordScreen` with a fake successful password update callback. The test must verify the visible title `Set New Password`, a disabled save action while the fields are invalid, and navigation to the supplied completion route only after matching replacement passwords of at least 12 characters.

- [ ] **Step 2: Run the widget test and verify it fails**

Run: `flutter test test/widget_test.dart`

Expected: failure because `ChangeTemporaryPasswordScreen` does not exist.

- [ ] **Step 3: Implement the current-style password screen**

Build `ChangeTemporaryPasswordScreen` using existing `AppColors.primaryRed`, Plus Jakarta Sans, the same rounded white input surfaces, input visibility toggles, red gradient primary action, and existing loading treatment. Include temporary password, new password, and confirmation inputs. Prevent save until the new password is at least 12 characters and confirmation matches. Present server/network errors in the existing red alert style.

On a successful API response, replace the secure token and use `pushAndRemoveUntil` to show `TermsAndConditionsScreen`, preventing return to the temporary-password form.

- [ ] **Step 4: Restore an existing secure session at launch**

Add an app startup gate in `main.dart`. It reads only the secure token, calls `MobileBfpApi.restoreSession`, clears an invalid token, routes an active normal session to `MainNavigationShell`, routes an active `mustChangePassword` session to the password screen, and otherwise opens `FireTruckOnboardingScreen`.

- [ ] **Step 5: Run full Flutter verification and build**

Run: `flutter test; flutter analyze; flutter build apk --debug --dart-define=ALAB_API_BASE_URL=https://alab-fire-responses-bynr.vercel.app`

Expected: tests and analysis pass; the debug APK is created without embedding a Supabase database or secret key.

### Task 4: Deploy and smoke test the server connection

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: pushed production API routes and Vercel environment variables `DATABASE_URL` and `AUTH_SECRET`.
- Produces: documented Flutter production build command and controlled live API response.

- [ ] **Step 1: Document production configuration**

Add a Mobile BFP Production section to `README.md` explaining that Vercel needs `DATABASE_URL` and a 32+-character `AUTH_SECRET`, while Flutter receives only `ALAB_API_BASE_URL`. Include the exact release build command:

```powershell
flutter build apk --release --dart-define=ALAB_API_BASE_URL=https://alab-fire-responses-bynr.vercel.app
```

- [ ] **Step 2: Push only the tracked website/server changes**

Run: `git push origin main`

Expected: Vercel deploys the new API routes from `main`. Do not add the existing untracked `apps/` tree to Git unless the user separately asks to publish the mobile project source.

- [ ] **Step 3: Smoke test the deployed login route**

Run: `Invoke-WebRequest -Method Post -ContentType "application/json" -Body '{"email":"invalid@example.com","password":"not-a-real-password"}' https://alab-fire-responses-bynr.vercel.app/api/mobile-bfp/login`

Expected: a controlled `401` response. A `500` means the Vercel `DATABASE_URL` or `AUTH_SECRET` environment variable must be configured in the deployment dashboard before production login can work.
