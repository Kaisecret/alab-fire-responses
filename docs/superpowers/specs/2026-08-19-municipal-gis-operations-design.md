# Municipal GIS Operations Map Design

## Goal

Make the Municipal BFP **GIS Map** navigation item a focused live operations map. It must show every active report returned for the signed-in station's assigned municipality, while the existing incident detail view remains the place to review one resident report and its tactical route.

## Scope

- Keep `/municipal-bfp/gis-map` separate from individual incident details.
- Use the existing municipality-scoped incident feed; no routing, database, or access-control changes.
- Place one branded fire marker for each live incident.
- Fit the map to the reports in the feed. If none exist, center on a municipal watch-area fallback.
- Provide compact live freshness, a manual refresh, loading, empty, and error states.

## Interaction model

1. A station officer opens **GIS Map**.
2. The browser loads the existing live incident API, which is already constrained to the officer's municipality.
3. The map displays all returned reports. Selecting a marker presents report context and an action to open the active incident queue.
4. Selecting **Open incident** from the queue continues to use the existing incident-detail screen, including its resident profile and tactical route map.

## Visual direction

The page is a restrained public-safety command workspace: a pale blue operational canvas, one red emergency accent, a large map as the primary surface, compact tools above it, and small status feedback below it. Motion is limited to the semantic live-status indicator and respects reduced-motion preferences.

## Non-goals

- Do not create or change municipality boundary data.
- Do not expose reports from another municipality.
- Do not replace the existing single-incident tactical route map.
