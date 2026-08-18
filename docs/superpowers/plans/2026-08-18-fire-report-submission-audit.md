# Fire Report Submission Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record a reporter's server-observed public IP and safe browser/device summary when a resident sends a fire alert, display it only to the assigned Municipal BFP, and use the resident fire-logo marker for municipal incident maps.

**Architecture:** The resident POST route extracts trusted proxy headers on the server and passes a validated audit object into the existing fire-report service. A small additive migration stores the IP as PostgreSQL `inet` and a short device/browser summary. The existing municipality-filtered incident-detail route returns this data only after its Municipal BFP identity and assignment checks succeed; its UI displays the audit data and its Leaflet map changes only the incident marker to the existing `/images/fire logo.webp` asset.

**Tech Stack:** Next.js App Router route handlers, TypeScript, PostgreSQL/Supabase, `pg`, Leaflet, Node test runner.

## Global Constraints

- Capture the IP from trusted server-side request headers; never accept an IP sent by the resident browser.
- Keep IP/device data off resident responses and restrict its display to the existing municipality-assignment protected Municipal BFP endpoint.
- Reuse `/images/fire logo.webp`; do not add a duplicate asset.
- Keep the existing fire-report submission workflow and Municipal BFP authorization logic unchanged.
- Do not expose a Supabase secret/service key to the client.

---

### Task 1: Add the protected audit data path

**Files:**
- Create: `mainfile/alab-system/lib/fire-reports/submission-audit.ts`
- Modify: `mainfile/alab-system/app/api/resident/fire-reports/route.ts`
- Modify: `mainfile/alab-system/lib/fire-reports/service.ts`
- Modify: `mainfile/alab-system/tests/resident-report-submission.test.mjs`

**Interfaces:**
- Produces: `submissionAuditFromHeaders(headers: Headers): FireReportSubmissionAudit`.
- Produces: `createResidentFireReport(userId: string, input: FireReportInput, audit: FireReportSubmissionAudit)`.

- [ ] **Step 1: Write failing tests** that require a server-header audit helper and require the POST route to pass it into `createResidentFireReport`.
- [ ] **Step 2: Run** `node --test tests/resident-report-submission.test.mjs`; expected result: failure because the helper and audit argument do not exist.
- [ ] **Step 3: Implement** a helper that selects the first valid address from `x-vercel-forwarded-for`, `x-forwarded-for`, or `x-real-ip`, validates it with `node:net`, and produces a short browser/OS summary from `user-agent`.
- [ ] **Step 4: Implement** the POST route and insertion change so `reporter_ip_address` and `reporter_device_summary` are supplied as bound SQL parameters.
- [ ] **Step 5: Run** `node --test tests/resident-report-submission.test.mjs`; expected result: pass.

### Task 2: Persist and expose audit fields to the assigned station

**Files:**
- Create: `mainfile/alab-system/supabase/migrations/<generated>_add_fire_report_submission_audit.sql`
- Modify: `mainfile/alab-system/app/api/municipal-bfp/incidents/[id]/route.ts`
- Modify: `mainfile/alab-system/tests/municipal-incident-access.test.mjs`
- Modify: `mainfile/alab-system/tests/supabase-schema.test.mjs`

**Interfaces:**
- Consumes: `fire_reports.reporter_ip_address inet` and `fire_reports.reporter_device_summary text`.
- Produces: `incident.reporterIpAddress` and `incident.reporterDeviceSummary` only from the existing `fr.municipality_id = $2` query.

- [ ] **Step 1: Write failing tests** for the additive migration and Municipal BFP incident query aliases.
- [ ] **Step 2: Run** `node --test tests/municipal-incident-access.test.mjs tests/supabase-schema.test.mjs`; expected result: failure because the columns/aliases do not exist.
- [ ] **Step 3: Generate the migration filename with `supabase migration new` and write** idempotent `ALTER TABLE public.fire_reports ADD COLUMN IF NOT EXISTS` statements using `inet` and a bounded text check.
- [ ] **Step 4: Modify** the existing assignment-filtered detail query to select the two audit values without altering the resident or provincial queries.
- [ ] **Step 5: Run** the two test files; expected result: pass.

### Task 3: Update Municipal BFP details and map marker

**Files:**
- Modify: `mainfile/alab-system/app/_components/municipal-incident-detail.tsx`
- Modify: `mainfile/alab-system/app/_components/municipal-incident-map.tsx`
- Modify: `mainfile/alab-system/tests/municipal-gis-map.test.mjs`

**Interfaces:**
- Consumes: the new `incident.reporterIpAddress` and `incident.reporterDeviceSummary` fields.
- Produces: “Public IP address”, “Device / browser”, and “GPS coordinates” in the existing resident emergency profile grid.

- [ ] **Step 1: Write failing tests** requiring the profile labels and a Leaflet `divIcon` containing `/images/fire logo.webp`.
- [ ] **Step 2: Run** `node --test tests/municipal-gis-map.test.mjs`; expected result: failure because the map still uses `circleMarker`.
- [ ] **Step 3: Implement** the three profile cells with unavailable fallbacks, and replace only the incident `circleMarker` with a fire-logo `divIcon` matching the resident map's 38px marker.
- [ ] **Step 4: Run** `node --test tests/municipal-gis-map.test.mjs`; expected result: pass.

### Task 4: Verify, apply the migration, and deploy

**Files:**
- Modify: generated migration from Task 2 only if database verification identifies an SQL issue.

- [ ] **Step 1: Run** `npm test` and `npm run build -- --webpack` from `mainfile/alab-system`.
- [ ] **Step 2: Execute** the migration against the configured Supabase database without printing the connection string, then query `information_schema.columns` to confirm both columns and their types.
- [ ] **Step 3: Commit** only feature files and tests with `feat: record fire report audit details`.
- [ ] **Step 4: Fast-forward merge the verified branch into `main` and push `origin main` to trigger Vercel production deployment.
