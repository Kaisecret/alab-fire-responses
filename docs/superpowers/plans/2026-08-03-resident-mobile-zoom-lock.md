# Resident Mobile Zoom Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Disable phone browser zoom for resident routes while preserving the existing UI and fixed bottom navigation.

**Architecture:** Add route-scoped Next.js viewport metadata in the resident layout and a mobile CSS touch-action fallback in the shared resident dashboard styles. No global metadata, JavaScript listeners, or visible UI changes are required.

**Tech Stack:** Next.js 16 App Router, TypeScript, CSS, Node test runner

## Global Constraints

- Affect only `/resident` routes.
- Preserve all existing resident visuals and content.
- Preserve normal vertical scrolling.
- Keep the bottom navigation fixed.

---

### Task 1: Lock Resident Mobile Zoom

**Files:**
- Create: `mainfile/alab-system/app/resident/layout.tsx`
- Modify: `mainfile/alab-system/app/_content/resident-home-content.ts`
- Modify: `mainfile/alab-system/tests/resident-placeholder-pages.test.mjs`

- [ ] Add a failing test requiring resident viewport metadata and `touch-action: pan-x pan-y`.
- [ ] Run the focused test and confirm it fails because the resident layout is missing.
- [ ] Export `Viewport` metadata with `width: "device-width"`, scale values of `1`, `userScalable: false`, and `viewportFit: "cover"` from the resident layout.
- [ ] Add `touch-action: pan-x pan-y` to the mobile `.dashboard-page-root` rule.
- [ ] Run the focused test, complete suite, and production build.
- [ ] Commit, push to `main`, deploy through Railway, and verify the live viewport meta tag.

