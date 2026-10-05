# Multiple Incident Alarm Plan

**Goal:** When one municipality has three or more active fire reports, the Provincial BFP hears the alarm siren and sees a popup. The popup opens a separate "Multiple Incidents" screen. The coordination section leaves the Assistance Requests page.

**Decisions (approved in conversation, 2026-10-06):**

- Only the Provincial BFP hears this alarm. Municipal stations keep their per-report siren.
- Trigger: three or more active reports in one municipality. A barangay with three or more is inside that count, so there is one alert per municipality, never two for the same reports. The screen flags a barangay that has three or more.
- Reports pending verification count. Linked duplicates and DUPLICATE, RESOLVED, CLOSED, REJECTED and FALSE_REPORT do not. Reports with no barangay count for their municipality.
- The popup plays the same two-tone siren as the municipal new-report alarm until the officer acknowledges or opens coordination. "Open Coordination" goes to the new screen.
- New screen: `/provincial-bfp/incident-clusters`, sidebar item "Multiple Incidents" with a count of open alerts.
- Old September test reports stay open. Closing them changes live data and needs separate approval.

## Tasks

1. **Migration** `20261006090000_municipal_incident_alerts.sql`: close open per-barangay alerts, make `barangay_id` nullable, replace the open-alert unique index with one per municipality. Add it to the release migration runner.
2. **Backend** `lib/intermunicipality/barangay-alerts.ts`: group active reports by municipality; each incident carries its barangay name; assignment checks the municipality count.
3. **Siren** `app/_components/alarm-siren.ts`: move `startSiren` out of the municipal alarm (no sound change) and add a `useAlarmSiren` hook for the provincial popup.
4. **Popup** `provincial-barangay-alert.tsx`: siren, municipality wording, short incident list, "Open Coordination" to the new screen.
5. **Screen** `app/provincial-bfp/incident-clusters/page.tsx` and `provincial-barangay-coordination.tsx`: page header with live status, incidents grouped by barangay, incidents ready for support first, the rest folded away, sticky form.
6. **Assistance page and sidebar:** remove the section; add the nav item and count.

## Verification

- Update the alert, API, UI and release migration tests first and watch them fail.
- New cases: three reports in three barangays open one alert; three in one barangay open one alert; the siren stops on acknowledgment; the Assistance page no longer renders coordination.
- `npm test`, changed-file ESLint, `npm run build`, then a browser check of the new screen.

## Results

- New and updated tests failed before the change and pass after it.
- `npm test`: 841 tests, 840 passed, 0 failed, 1 skipped (needs `DATABASE_URL`).
- `tsc --noEmit` passed. Changed-file ESLint: no errors (three existing `<img>` warnings in the layout).
- `npm run build` passed and lists `/provincial-bfp/incident-clusters`.
- Visual check: the screen and popup were rendered with mock data shaped like the live Hamtic case (13 reports, 9 in Mapatag) and captured in headless Chrome at 1600px and 390px. No horizontal scroll at 390px. The signed-in live app was not checked: that needs the migration on the live database and a provincial login.

## Update: tab instead of sidebar item (same day)

On request, Multiple Incidents is no longer a sidebar item. It is a second tab under the stat cards on Assistance Requests (`?view=incidents`), the same way Fire trucks and Stations share a page. The tab uses the shared stat cards and icons like the other provincial pages. `/provincial-bfp/incident-clusters` redirects to the tab. `npm test`: 842 tests, 841 passed, 0 failed, 1 skipped. Build passed.
