# BFP Mobile Live Dispatch and Push Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the existing BFP mobile UI to real dispatches, show them on OpenStreetMap, and alert assigned phones through FCM.

**Architecture:** The server owns FCM tokens and sends notifications only to users recorded as dispatch recipients. Flutter retains its current visual components but reads a shared active-assignment store instead of static examples.

**Tech Stack:** Next.js, PostgreSQL, Firebase Admin, Flutter, Firebase Messaging, flutter_map, geolocator.

## Global Constraints

- Preserve the current mobile UI design.
- Never commit or print the Firebase service account.
- All device registration routes require the existing BFP bearer token.

---

### Task 1: Server FCM delivery

**Files:**
- Create: `mainfile/alab-system/lib/notifications/fcm.ts`
- Create: `mainfile/alab-system/app/api/mobile-bfp/devices/route.ts`
- Modify: `mainfile/alab-system/lib/municipal-bfp/dispatch.ts`
- Modify: `mainfile/alab-system/package.json`
- Test: `mainfile/alab-system/tests/mobile-fcm-dispatch.test.mjs`

- [ ] Write a failing test that requires `requireMobileMunicipalBfp`, `registerMobileDevice`, `FIREBASE_SERVICE_ACCOUNT_JSON`, and `sendDispatchPush`.
- [ ] Run `node --test tests/mobile-fcm-dispatch.test.mjs` and confirm it fails before code exists.
- [ ] Add the Firebase Admin sender, protected Android token upsert route, and dispatch push call after recipient records are created. Record each attempted delivery and deactivate invalid tokens.
- [ ] Run `node --test tests/mobile-fcm-dispatch.test.mjs tests/mobile-station-dispatch.test.mjs` and confirm it passes.

### Task 2: Flutter live dispatch state

**Files:**
- Create: `apps/bfp_mobile_app/flutter_application_1/lib/services/mobile_dispatch_store.dart`
- Modify: `apps/bfp_mobile_app/flutter_application_1/lib/services/mobile_bfp_api.dart`
- Modify: `apps/bfp_mobile_app/flutter_application_1/lib/main.dart`
- Modify: `apps/bfp_mobile_app/flutter_application_1/lib/screens/incidents_screen.dart`
- Test: `apps/bfp_mobile_app/flutter_application_1/test/mobile_dispatch_store_test.dart`

- [ ] Write a failing store test that loads an `ALAB-100` assignment from a fake mobile API.
- [ ] Run `flutter test test/mobile_dispatch_store_test.dart` and confirm it fails before the store exists.
- [ ] Register Firebase `getToken()` and `onTokenRefresh`; refresh the assignment store on foreground FCM messages and periodically while the app is open.
- [ ] Run `flutter test test/mobile_dispatch_store_test.dart test/mobile_bfp_api_test.dart` and confirm it passes.

### Task 3: Connected UI and real map

**Files:**
- Modify: `apps/bfp_mobile_app/flutter_application_1/pubspec.yaml`
- Modify: `apps/bfp_mobile_app/flutter_application_1/android/app/src/main/AndroidManifest.xml`
- Modify: `apps/bfp_mobile_app/flutter_application_1/lib/screens/home_dashboard_screen.dart`
- Modify: `apps/bfp_mobile_app/flutter_application_1/lib/screens/map_screen.dart`
- Test: `apps/bfp_mobile_app/flutter_application_1/test/live_mobile_ui_test.dart`

- [ ] Write a failing widget test that verifies `ALAB-100` is shown and demo copy is absent.
- [ ] Run `flutter test test/live_mobile_ui_test.dart` and confirm it fails while the painted demo map remains.
- [ ] Add `flutter_map` and `geolocator`, render OpenStreetMap tiles, the real report marker, and the permitted responder marker. Replace dashboard/alert demo data without changing existing card styles.
- [ ] Run `flutter test` and confirm it passes.

### Task 4: Production secret and device test

- [ ] Validate the downloaded service-account file without printing its content.
- [ ] Store its complete JSON as Vercel production variable `FIREBASE_SERVICE_ACCOUNT_JSON`, not in Git.
- [ ] Deploy, sign into the Infinix, dispatch a new incident to that account's station, and verify both top-phone notification and live assignment/map.
