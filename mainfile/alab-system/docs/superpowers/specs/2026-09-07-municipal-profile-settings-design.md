# Municipal BFP Profile & Settings Design Spec

**Date:** 2026-09-07  
**Status:** In Review  
**Author:** Antigravity AI  
**Tags:** municipal-bfp, profile-settings, avatar, ui-ux-pro-max, impeccable  

---

## 1. Executive Summary

Municipal Fire Marshals and Officers currently have a read-only, static "Profile & settings" page (`/municipal-bfp/profile`). It displays basic text info and a hardcoded SVG placeholder with no way to update officer name, rank/position, profile picture/avatar, or password.

This feature transforms the Municipal Settings into an interactive, high-craft civic-emergency profile hub adhering to `/ui-ux-pro-max` and `/impeccable` design standards:
- **Concise & High-Signal ("Less text make it nice"):** Replaces verbose static explanations with sleek, data-dense badges, live status pills, and intuitive micro-interactions.
- **Officer Profile Updates:** Real-time editing of display name and rank/position with quick rank suggestion chips (e.g., `Municipal Fire Marshal`, `Senior Fire Officer`, `Fire Inspector`, `Fire Officer`).
- **Interactive Avatar Studio:** Upload custom profile photos (JPEG/PNG/WebP, up to 5MB) stored in Supabase private bucket `bfp-profile-photos`, with instant signed URL rendering and a 1-tap "Reset to Default Insignia" action.
- **Account Security Drawer/Modal:** Smooth in-page password update with current password verification, 12+ character validation, strength indicator, and password visibility toggles.
- **Live Dispatch & Notification Monitor:** Real-time status indicator of background dispatch synchronization with a direct launchpad to notifications.

---

## 2. User Experience & Visual Architecture (`/ui-ux-pro-max` + `/impeccable`)

### 2.1 Aesthetic & Visual Direction
- **Typography:** `Plus Jakarta Sans` / `Outfit` with crisp hierarchy. Headers at 800 weight, labels at 700 uppercase tracking (`0.06em`), values at 600.
- **Palette (ALAB Civic Tokens):**
  - Primary Accent: `--alab-red: #E23632` (crimson emergency red) with glow `rgba(226, 54, 50, 0.15)`.
  - Dark Surface / Text: `--alab-text-primary: #0F172A` (deep slate navy, never pure black).
  - Canvas: `--alab-canvas: #F8FAFC` to `#EEF5FD` soft tinted slate.
  - Card Surfaces: White `#FFFFFF` with double-layered soft elevation (`0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03)`) and subtle border (`1px solid #E2E8F0`).
  - Active Indicators: Emerald `#10B981` (active duty pulse) and Amber `#D97706` (warning/pending).
- **Layout Rhythm:**
  - Modern 2-column or 3-card responsive Bento layout.
  - Left/Main Hero Card: Officer Command Badge with prominent interactive avatar uploader, active duty indicator, inline edit trigger, station assignment pills, and account credentials.
  - Right/Side Cards:
    1. **Security & Credentials:** Masked email, password status pill, and one-tap "Change Password" action.
    2. **Dispatch & Notification Service:** Real-time sync badge ("5s Live Polling"), monitoring coverage chips, and link to notification center.

### 2.2 Micro-Interactions & State
- **Avatar Hover & Upload:**
  - Avatar has a sleek camera overlay badge on hover (`transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)`).
  - Clicking triggers hidden `<input type="file" accept="image/png,image/jpeg,image/webp">`.
  - When custom photo exists: displays subtle "Reset to Default" button beside or below the avatar.
  - Loading spinner replaces the camera icon while uploading.
- **Inline Profile Editor:**
  - Edit trigger switches the name and rank to clean floating-label inputs with instant validation.
  - Quick-select rank chips allow 1-tap selection of official BFP ranks:
    `Municipal Fire Marshal`, `Senior Fire Officer`, `Fire Inspector`, `Fire Officer`.
  - Save & Cancel buttons with optimistic local update and subtle loading state.
- **Toast Notifications:**
  - Floating toast notification at top-right for instant success feedback ("Profile updated", "Avatar updated", "Password changed successfully").

---

## 3. Technical Architecture & Endpoints

### 3.1 Profile Update (`PATCH /api/municipal-bfp/me`)
- **Authentication:** `verifyBfpSession` checking `MUNICIPAL_BFP` cookie.
- **Input:** `{ displayName?: string, rankOrPosition?: string }`.
- **Validation:** `displayName` >= 2 chars, string sanitization.
- **Database Write:** Updates `bfp_personnel_profiles (display_name, rank_or_position, updated_at)` for `user_id = session.userId`.
- **Session Refresh:** Re-issues updated session cookie containing new `displayName`.
- **Response:** `{ ok: true, user: MunicipalIdentity }`.

### 3.2 Profile Photo Management
- **`POST /api/municipal-bfp/profile/photo`**:
  - Multipart form upload (`photo: File`).
  - Validates MIME type (`image/jpeg`, `image/png`, `image/webp`) and size (<= 5MB).
  - Uses `uploadBfpProfilePhoto(userId, file)` to upload to Supabase bucket `bfp-profile-photos` under `${userId}/profile`.
  - Generates signed URL with `createBfpProfilePhotoUrl(userId)`.
  - Returns `{ ok: true, photoUrl }`.
- **`DELETE /api/municipal-bfp/profile/photo`**:
  - Deletes photo from Supabase bucket (`deleteBfpProfilePhoto(userId)`).
  - Clears cached signed URL.
  - Returns `{ ok: true, photoUrl: null }`.
- **`GET /api/municipal-bfp/me` Enhancement:**
  - Returns `photoUrl: string | null` along with user identity.

### 3.3 Password Change
- Leverages existing `/api/auth/bfp/change-password` endpoint:
  - Input: `{ currentPassword, nextPassword, portal: "MUNICIPAL" }`.
  - Verifies current password using `verifyPassword`.
  - Hashes new password (min 12 characters).
  - Updates `users.password_hash` and resets `must_change_password = false`.
  - Re-issues authenticated session cookie.

---

## 4. Verification & Testing Plan

1. **Automated Source & API Tests (`tests/municipal-profile-settings.test.mjs`):**
   - Verify `PATCH /api/municipal-bfp/me` validates session, input, and updates profile.
   - Verify `POST /api/municipal-bfp/profile/photo` and `DELETE /api/municipal-bfp/profile/photo` exist and handle uploads/deletions.
   - Verify `tests/municipal-notification-settings.test.mjs` retains all 10 required assertions (neutral avatar classes, notification status, etc.).
2. **Type Checking & Full Suite:**
   - Run `npx tsc --noEmit` to ensure zero TypeScript errors.
   - Run `npm test` to ensure all 272+ tests pass cleanly.
3. **Deployment:**
   - Git commit and push to `origin/main`.
