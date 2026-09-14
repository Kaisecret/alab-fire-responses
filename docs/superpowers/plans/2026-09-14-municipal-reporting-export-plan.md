# Municipal Reporting and Export Implementation Plan

> **For agentic workers:** Use the executing-plans skill to implement the approved scope task by task. The checkboxes below track future implementation, not completed work.

**Status:** Phase 1 implementation reviewed against commit `35dc80e` (Gemini's implementation). Corrective changes are in the working tree. Phase 1 is not yet fully accepted: deployment of the audit migration and visual/print verification remain unverified. Phases 2 and 3 remain future scope.

**Goal:** Give Municipal BFP personnel a clear, reliable way to review local incidents and export useful records and summaries.

**Architecture:** Build a municipal report directory backed by a server-authorized reporting service. Use the same filter rules and data definitions for the table, summary, preview, and export. Adapt the existing provincial CSV patterns while retaining separate municipal authorization.

**Tech stack:** Existing Next.js, React, TypeScript, PostgreSQL, application authentication, and Node test runner. Start with CSV and print layouts; introduce native Excel workbooks and direct PDF generation in a subsequent phase.

**Spec:** The product requirements and acceptance criteria are contained in this document. This is a roadmap; task-level implementation code follows when implementation is requested.

## 1. What the existing code shows

The following bullets describe the baseline inspected before Gemini's implementation, not the current implementation. See the review below for the current findings.

Paths in this document are relative to `mainfile/alab-system/` unless otherwise stated.

- `app/municipal-bfp/incident-reports/page.tsx` has five hardcoded reports. Its filter buttons and Generate New Report button have no handlers, and View links point to `#`.
- `lib/provincial-bfp/management/exports.ts` already provides CSV exports, a 10,000-row limit, cell escaping, and provincial export auditing.
- `lib/provincial-bfp/management/reports.ts` and `report-summaries.ts` provide useful examples for incident queries and aggregation.
- `lib/provincial-bfp/management/filters.ts` already handles Philippine calendar-day boundaries and validates report filters.
- `lib/municipal-bfp/auth.ts` provides municipal administrator authorization. Production exports must require an active assigned account and must not use the preview identity as an official export actor.
- The municipal incident feed includes origin and observer records. Observer visibility must not automatically grant bulk export rights or add another municipality's incidents to local totals.
- The inspected library code and migrations have response, dispatch, arrival, and status-history data. No structured casualty, fatality, fire-cause, or property-damage fields were found. The sample values do not establish real data availability.
- The municipal water-source page contains sample records, and the firetruck page initializes local sample state. Resource export requires a separately verified persistent source.

These are source-code findings, not a live database audit.

## 2. Recommended scope and alternatives

**Recommended: reporting inside Incident Reports.** Keep the existing navigation and replace the sample page with real records, a useful summary, filters, and an export dialog. This directly serves the screen in the request and supports expansion later.

**Smaller alternative: CSV button only.** Faster to implement, but still requires a real report directory and municipal authorization. It would leave monthly summaries and printable documents unavailable.

**Larger alternative: municipal Export Center.** Centralizes incidents, personnel, resources, and application exports. Defer this until those datasets are consistently stored and the incident export flow works well.

First release: incident register, monthly/custom-period summary, barangay breakdown, and individual incident print view. Dispatch, coordination, native Excel, and additional municipal datasets follow as distinct deliverables.

## 3. What users should be able to export

| Export | Contents | Format and priority |
|---|---|---|
| Incident register | One row per report: reference, municipality, barangay, source, fire type, calculated severity, status, submitted time, response start, recorded arrival, resolution time, derived durations | CSV first; native XLSX later |
| Municipal summary | Period, total intake, confirmed incidents, resolved incidents, unresolved confirmed incidents, administrative outcomes, severity/source/type breakdowns, timing coverage | Printable report and summary CSV first; direct PDF/XLSX later |
| Barangay breakdown | Every barangay, total intake, confirmed incidents, resolved incidents, administrative outcomes, recorded timing averages and sample counts | CSV and section in printable summary, first release |
| Individual incident report | Reference, location, source, type, severity, current status, operational timeline, responding stations, recorded dispatch information | Print / Save as PDF first |
| Dispatch activity | Incident reference, dispatch ID, participating station, dispatch status, dispatched/completed times, assigned responder count, recorded movement and arrival events | CSV in second phase |
| Coordination activity | Origin municipality, assisting municipality, request reference, request time, decision/status and recorded assistance activity | CSV in second phase, limited to authorized local participation |
| Municipal resources | Stations and personnel assignments; later firetrucks and water sources once persistence is verified | Separate exports in third phase |
| Resident application statistics | Counts by status and reporting period; individual administrative records only under a separately defined permission and field policy | Third phase; aggregate export first |

Do not present an unrestricted “Export entire database” option.

## 4. Data definitions that make the reports trustworthy

### Incident identity and classification

- Use the actual stored reference number. Remove the duplicate sample Report ID / Incident columns unless a separate report-document reference is introduced deliberately.
- Keep fire type separate from administrative disposition. A false report is not a fire type, and it must not be silently relabeled as a verified false alarm.
- Display calculated severity as **Calculated severity** in exports. Use the stored categories, including Moderate and Unknown, rather than copying sample labels.
- Count each incident once, even when several stations or responders participated.
- Maintain a central status mapping shared by the directory and summaries. Initially align confirmed statuses with the existing provincial logic: `CONFIRMED`, `VERIFIED`, `RESPONDING`, `FIRETRUCK_DISPATCHED`, `RESPONDER_ARRIVED`, `UNDER_CONTROL`, `RESOLVED`, and `CLOSED`.
- Resolved incidents are the subset in `RESOLVED` or `CLOSED`. Unresolved confirmed incidents are confirmed incidents outside those two statuses. Administrative outcomes are `FALSE_REPORT`, `DUPLICATE`, and `REJECTED`, with separate breakdowns. Remaining intake statuses form the pending/unconfirmed group.
- Explain that confirmed and resolved counts overlap; users must not add those two figures together as independent categories.

### Time and period rules

- Default the page to **This month**, with **This week**, **Last month**, **This year**, **Custom**, and **All dates** available. Show the selected dates explicitly.
- Use `submitted_at` as the first release's period basis, labeled **Reported during**. A report submitted before the period and resolved during it is excluded; “Resolved during” is a separate future reporting basis.
- Interpret date-only filters in `Asia/Manila`: inclusive starting midnight through exclusive midnight after the ending date. Use Philippine time in the display and clearly labeled exported timestamps.
- **Time to response start:** stored response start minus submitted time. Missing start stays missing; do not silently substitute acknowledgment or arrival.
- **Time to recorded arrival:** earliest valid recorded on-scene event minus submitted time. Retain arrival method in detailed data because an automatic geofence event is a recorded system event.
- **Time to resolution:** latest qualifying resolved/closed history timestamp minus submitted time, only for currently resolved/closed records.
- Reject negative durations from aggregates and report them as unavailable. Calculate averages from valid observations only and show the denominator, such as “12 of 18 incidents have arrival records.”
- Label summaries as current status for the selected intake period, with a generated-at timestamp. They are not historical month-end status snapshots.

### Missing and sensitive data

- Show **Not recorded** in human-readable reports and blank cells in raw data when a value is missing. Never turn a missing value into zero.
- Do not include casualties, fatalities, estimated damage, or cause-of-fire findings in the first release. A later closure form must collect and validate these fields first, including a distinction between zero and unknown.
- Standard exports exclude reporter names, phone numbers, identity documents, personal addresses, photos, storage links, and raw GPS trails.
- Precise incident coordinates and detailed narratives require an explicit authorized operational template; they are not default register columns.
- A printable individual report uses operational facts and structured timeline events. Avoid blindly exporting free-text notes that may contain personal information.

## 5. Make the page look clear and polished

Retain ALAB's sidebar, existing typography, red accent, pale background, and municipal identity. Use a solid red primary action, white surfaces, restrained borders, and consistent spacing.

**Header:** “Incident Reports” with the subtitle “Review municipal incidents and export records or summaries.” Place an outlined **Print summary** button and a primary **Export data** button on the right. Replace “Generate New Report,” which is ambiguous on a page of existing incidents.

**Summary strip:** Four compact figures: Total reports, Confirmed incidents, Resolved incidents, and Average time to recorded arrival. Include timing coverage under the last figure. All four reflect the active filters.

**Filter area:** Search by incident reference or barangay, period selector, barangay, status, fire type, severity, and source. Keep less-used filters under “More filters.” Display active filters and a Clear filters action. Municipality is fixed by the signed-in assignment.

**Table:** Selection checkbox, Reference, Barangay, Fire type, Severity, Reported at, Status, and View. Keep additional timestamps and dispatch details in the incident detail view. Use text with status colors, readable row spacing, a sticky header, and pagination.

**Selection:** Label the header checkbox “Select this page.” Show the number selected; changing filters clears selection. “All matching records” remains a separate export choice so page selection cannot be mistaken for the entire dataset.

**Responsive behavior:** Stack controls on narrow screens, scroll the table within its own region, and use a full-screen export dialog on mobile. Preserve visible labels and keyboard focus. Avoid large decorative charts above the records.

## 6. Export flow

1. User filters the report directory and selects **Export data**.
2. A single dialog opens, prefilled from the active filters.
3. User chooses the dataset: Incident register, Municipal summary, or Barangay breakdown.
4. User chooses the scope: **All matching records**, **Selected records** when selection exists, or **Current page**. Aggregate summaries use all matching records; do not allow a page-only municipal summary.
5. User chooses an available format. First release offers CSV here; printable summary is accessible from the page. Hide formats that are not implemented.
6. The dialog shows municipality, period, filters, included columns, matching count, and proposed filename. An expandable preview shows a few rows without loading the entire export into the page.
7. User selects **Download CSV**. The server rechecks access, generates the file, records the export event, and returns the attachment.

Keep the main action and Cancel visible in the dialog footer. Show “Preparing export…” while working and disable repeat submissions. Preserve chosen filters on failure, with an inline Retry action. Do not show fake percentage progress.

Disable empty register exports with “No reports match these filters.” A zero-incident period can still produce a clearly labeled zero-activity summary and barangay breakdown.

Use a 10,000-record incident limit initially, consistent with provincial exports. If exceeded, request a narrower period or barangay. Never return a silently truncated file. Apply the limit before one-to-many expansion in later dispatch exports, with a separate output-row limit there.

The modal must keep keyboard focus inside while open, support Escape, and restore focus to Export data when closed, following the [W3C dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

Example filename: `alab-hamtic-incident-register-2026-09-01-to-2026-09-30-20260930T163000PHT.csv`. Generate municipality and timestamps from trusted data; sanitize filename characters.

## 7. Printed reports and future Excel workbooks

**First-release print layout:** A4 portrait for an individual incident and municipal summary; landscape only where a wide table requires it. Include the municipality, report title, reporting period, generation timestamp, applied filters, summary figures, breakdown tables, timing definitions, and missing-data notes. Remove application navigation and controls. Use repeated table headers and deliberate page breaks where supported.

Offer **Print / Save as PDF**, accurately labeled as the browser print flow. Print CSS can define output-specific styles and page dimensions; test the actual target browsers before release. See [MDN printing guidance](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing).

Do not label a generated document an approved official BFP form without an agreed template. Any Prepared by information must identify the real generating user; do not fabricate signatures or approval.

**Later native XLSX:** Use a workbook with Summary, Incidents, Barangay Breakdown, and Definitions sheets. Include proper date and numeric cells, frozen headers, column widths, filters, and wrapped long text. Store references as text. A CSV renamed to `.xlsx` does not qualify.

**Later direct PDF:** Add a real downloadable PDF once the document template and rendering approach are agreed. This is distinct from opening browser printing.

## 8. Server responsibilities and proposed files

| Path | Responsibility |
|---|---|
| `app/municipal-bfp/incident-reports/page.tsx` | Replace sample content with the report directory |
| `app/_components/municipal-report-directory.tsx` | Filter state, totals, table, selection, pagination |
| `app/_components/municipal-report-export-dialog.tsx` | Scope, format, preview, download states |
| `app/_components/municipal-report-detail.tsx` | Individual operational record and timeline |
| `lib/municipal-bfp/reports/types.ts` | Shared report, filter, summary, and export contracts |
| `lib/municipal-bfp/reports/filters.ts` | Allowed filters, period validation, municipal constraints |
| `lib/municipal-bfp/reports/service.ts` | Scoped records, detail, counts, and summaries |
| `lib/municipal-bfp/reports/exports.ts` | Field allowlist, file generation, limits, export event |
| `app/api/municipal-bfp/reports/route.ts` | Authenticated directory and summary query |
| `app/api/municipal-bfp/reports/[id]/route.ts` | Authenticated own-municipality incident detail |
| `app/api/municipal-bfp/reports/export/route.ts` | Authenticated export request and attachment response |
| `app/municipal-bfp/incident-reports/print/page.tsx` | Print view for summary or individual incident |
| `tests/municipal-report-directory.test.mjs` | Scope, filtering, pagination, aggregates |
| `tests/municipal-report-export.test.mjs` | Export contents, limits, authorization, escaping |

The server derives municipality from the current active assignment, never from a trusted client parameter. Reauthorize detail, preview, print, and export requests independently. Reject cross-municipality selected IDs. Production exports must reject synthetic preview identities and users required to change their password.

Use one normalized filter contract for all views. Execute export selection and aggregate reads against a consistent database snapshot, with stable ordering by submitted time and ID. Preview counts are advisory; the export returns the authoritative count and generation time because records can change before download.

Audit generated exports with actor, municipality, dataset, format, normalized filters, record count, generation time, filename, and result. Add a dedicated municipal export-event persistence mechanism during implementation; do not repurpose provincial audit records by pretending the actor is provincial. A generated attachment does not prove the user saved it, and opening print does not prove printing completed.

Reuse the provincial CSV escaping approach after behavior tests for delimiters, quotes, Unicode, line breaks, and formula-like inputs. Spreadsheet formula handling needs explicit protection; see [OWASP CSV injection guidance](https://community.owasp.org/attacks/CSV_Injection). Return private, noncached attachment responses.

## 9. Build order and acceptance checks

### Phase 1A: Real report directory

- [ ] Define municipal scope and shared data/status/time definitions.
- [ ] Implement the scoped report query and replace hardcoded rows.
- [ ] Add working filters, summary figures, pagination, and incident detail.
- [ ] Verify that local records appear, another municipality's records do not, and observer records do not inflate municipal totals.
- [ ] Verify that a multi-station incident is counted once and that date boundaries match Philippine calendar days.

### Phase 1B: CSV export and audit

- [ ] Add incident-register, summary, and barangay export shapes with explicit field allowlists.
- [ ] Add the export endpoint, export-event persistence, and export dialog.
- [ ] Verify all matching rows across pagination, selected records, current page, exact limits, and no silent truncation.
- [ ] Verify anonymous, inactive, wrong-role, preview, and cross-municipality requests fail appropriately.
- [ ] Verify missing values stay missing, no restricted fields appear, and formula-like strings do not become executable spreadsheet formulas.
- [ ] Verify audit records reflect server-authorized filters and actual generated counts.

### Phase 1C: Printable summary and individual report

- [ ] Build the print layout with metadata, operational timeline, definitions, and barangay breakdown.
- [ ] Verify zero-activity periods, long references and locations, missing arrival times, and multi-page tables.
- [ ] Check desktop and narrow-screen behavior, keyboard navigation, loading, retry, and print output visually.
- [ ] Run relevant Node tests, TypeScript checks, lint, and production build; compare exported totals with the authorized database query results.

### Phase 2: Richer operational reporting

- [ ] Add native XLSX workbooks and direct PDF downloads after choosing and verifying the required generation tools.
- [ ] Add dispatch activity with a declared row grain and no duplicated incident summary counts.
- [ ] Add coordination exports with explicit participation and historical-access rules. An ended observer relationship alone does not establish retained export permission.
- [ ] Add casualties, fatalities, damage estimates, and fire-cause findings only after validated data-entry workflows are available.

### Phase 3: Other municipal datasets

- [ ] Extend the export pattern to stations, personnel assignments, and application statistics.
- [ ] Connect firetruck and water-source records to verified persistent sources before exporting them.
- [ ] Consider a municipal Export Center once multiple reliable export datasets exist.

## 10. First-release completion criteria

The feature is ready when the municipal user can filter real records, inspect an incident, export an accurate CSV, and print a readable summary; the table and exported counts agree for the same snapshot and filters; unauthorized records are excluded; exports are audited; and missing or uncollected information is never fabricated.

## 11. Implementation review and corrections

The overall first-release scope remains appropriate. The original file was a product roadmap, not an executable task-by-task specification; unchecked items must not be read as evidence that Gemini implemented or verified every requirement.

### Errors corrected in this review

- Municipal report, detail, export, and print requests now use `municipalTabFetch`. Ordinary `fetch` omitted the tab selector required by municipal authentication.
- Print links navigate within the signed-in tab. A new tab intentionally has a separate municipal session and cannot be assumed to inherit the originating account.
- Print summaries preserve status, fire type, severity, source, search, barangay, and reporting period. The print view reads identity from the API's `user` object and does not substitute a sample municipality or officer.
- Printing waits for the identity and report, rejects preview/password-change-required identities, hides municipal navigation in print output, and declares an A4 layout. The individual print view excludes precise coordinates, raw narratives, and free-text timeline notes by default; it is labeled a system-generated incident report rather than an approved official form.
- JSON numeric `page` and `pageSize` values survive filter parsing. Previously a current-page POST export could silently use page 1.
- Response-start calculations use only `response_started_at`. Arrival calculations use the earliest valid on-scene event, excluding negative intervals before choosing the minimum.
- A missing barangay is labeled Unknown Barangay rather than replaced by a personal address. The barangay breakdown adds an Unknown Barangay row when needed so its totals reconcile with municipal intake.
- Export selection is validated for UUID format, duplicates, size, ownership, and matching filters. Aggregate exports reject selected/current-page scope instead of silently ignoring it.
- CSV exports use a repeatable-read transaction shared by all record/summary queries and audit insertion. An audit failure now fails the export. Scope and selected IDs are included in the recorded export parameters.
- Directory records and summary figures are read from the same database snapshot. API responses are noncached and unexpected database errors are not exposed to the browser.
- CSV missing timestamps and measurements use blank cells. Filename timestamps use Philippine time independently of the server timezone.
- The export dialog uses a native modal rendered outside the page container, with focus containment, focus restoration, background scroll locking, and protected dismissal while exporting. The selected-records action opens the selected scope; previews use selected rows when applicable.
- Relative-period export previews resolve actual Philippine dates, and aggregate counts are labeled matching incident records rather than incorrectly claiming incident totals are barangay counts.

### Requirements still needing acceptance or follow-up

- Verify `20260914100000_add_municipal_export_events.sql` has been applied to the deployed database. This review does not claim a live migration was applied. Missing audit storage will now correctly prevent downloads.
- Test with real municipal accounts in the browser: filtering, selection changes, keyboard focus, mobile layouts, printed page breaks, and the full download flow. No browser connection was available during the preceding work; automated checks cannot establish visual correctness.
- Extend behavior coverage to the exact 10,000-record boundary, all route-level role/preview/password checks, concurrent updates, and exported totals against the deployed database. The existing Gemini tests largely search source text; they are not equivalent to these runtime checks.
- Persist and display arrival-method provenance in detailed reporting, as required by section 4. This remains a gap rather than an inferred field.
- Review and finish every first-release display requirement, including complete breakdowns and human-readable applied-filter labels on printouts. The current print filter label preserves values but can display an internal barangay ID.
- Decide whether a machine-oriented summary CSV should use one rectangular schema instead of the existing multiple human-readable sections. Do not describe the current multi-section file as a native Excel workbook.
- Print generation auditing is not implemented by this correction. A future print audit must record preparation/opening accurately and must not claim the browser actually printed or saved the document.

### Verification evidence

Review validation passed: 18 reporting/session tests, targeted ESLint checks for the changed reporting files, TypeScript checking, and a production Next.js build. These results do not replace the live database and browser acceptance checks above.

`tests/municipal-report-review.test.mjs` adds behavior checks for JSON pagination, audit failures, snapshot transactions, missing CSV values, invalid export scopes/selections, and executable report SQL in an isolated PGlite database. The SQL fixture checks missing response start, earliest valid arrival among multiple responders, and reconciliation of unknown-barangay incidents while retaining zero-count barangays. Source checks also cover tab-session request wiring and same-tab print navigation.

Run the reporting and session checks from `mainfile/alab-system/`:

```powershell
node --test tests/municipal-report*.test.mjs tests/municipal-export-schema.test.mjs tests/municipal-tab-session.test.mjs
npx tsc --noEmit
npm run build
```

Keep the phase checkboxes above unchecked until their full acceptance conditions have been verified. Future Excel/PDF generation, operational exports, and resource exports have not been implemented by this review.

## 12. Related resident correction work

The September 15 request about a resident correction form stuck loading and requiring a freshly taken selfie is tracked in [Resident correction loading and camera selfie plan](2026-09-15-resident-correction-camera-selfie-plan.md). Loading error handling is implemented locally; camera-only correction capture is planned separately and is not part of reporting/export completion.
