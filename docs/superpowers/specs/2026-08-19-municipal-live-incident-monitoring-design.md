# Municipal Live Incident Monitoring Design

## Goal

Make Municipal BFP incident information live and operational without changing the established dashboard design or creating a second source of truth.

## Scope

- Poll the Municipal Active Incidents queue every five seconds while the browser tab is visible.
- Preserve manual refresh and give both automatic and manual refreshes clear feedback.
- Replace the Municipal dashboard's hardcoded incident rows and active/pending counters with the signed-in station's incident API data.
- Keep the existing visual language, filters, cards, links, and dashboard layout.

## Data flow

Both screens use `GET /api/municipal-bfp/incidents`. The endpoint already checks the signed-in Municipal BFP cookie and limits results to the assigned municipality. Each response becomes the single in-browser incident snapshot for that screen.

The Active Incidents page refreshes when it opens, then every 5,000 ms while `document.visibilityState` is `visible`. A visibility-change event triggers an immediate refresh when the BFP returns to the tab. It pauses while the tab is hidden and keeps the manual refresh button available.

The dashboard reads the same endpoint on mount and on the same visible-tab schedule. It renders up to five current incidents in the existing queue table and computes only the Active Incidents and Pending Verification values from that response. Fleet, staffing, and assistance cards remain unchanged because no live data endpoint exists for them.

## Refresh feedback

- Automatic checks briefly animate the existing refresh indicator without disabling the page.
- Manual refresh uses the same indicator and disables only its button while the request is in flight.
- A small status label reports `Live · checked just now`; failures keep the last successful data visible and show a concise non-blocking error.
- Newly appearing incident rows receive a short highlight animation once per response.

## Safety and reliability

- No polling occurs in a hidden browser tab.
- Requests use `cache: "no-store"` so the queue is not stale.
- Failed refreshes do not erase a previously successful incident list.
- The UI never treats an empty response as a failure; it shows the established empty state.

## Verification

Tests will assert the five-second visible-tab poller, visibility pause/resume behavior, use of the municipal incident API, and removal of dashboard sample incident rows. The full test suite and production build must pass before merge.
