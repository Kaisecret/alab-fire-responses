# BFP architecture: cloud map updates and authentication

This diagram reflects the inspected local application code. It is a logical architecture view, not a verification of the current live deployment.

## What the diagram shows

- All four application sides have an authentication marker. These markers represent credentials checked by the backend, not four independent authentication services.
- Resident PWA requests use a signed resident session cookie. Municipal and provincial web dashboards use signed BFP session cookies and backend role/access checks.
- The firefighter application sends a bearer token to the mobile API. In the current implementation this is a Municipal BFP session; the firefighter is a user-facing application role, not an additional authentication role.
- The cloud node represents the Backend API. Protected application reads and writes pass through it.
- App Map Views is a shorthand for map views inside the web and mobile applications, not a separate deployed map server. Each user's data remains restricted to the access granted by the relevant endpoint.
- Incident locations and responder GPS updates are saved through the API to PostgreSQL. Apps fetch the permitted incident and dispatch data to refresh their map overlays. The implementation uses API requests and polling; the diagram does not claim full offline synchronization or a Supabase Realtime subscription.
- Public map tiles and route calculations are separate external requests. Mobile routing calls OSRM directly; web road routing can use the backend road-route proxy. OSM is a base-map source; some web views also offer ArcGIS imagery.
- Supabase private storage holds uploaded images/documents; the backend handles uploads and signed retrieval URLs.
- Notifications originate from backend workflows, not directly from the database. Channels depend on the workflow and configured providers: in-app records, FCM push, SMS and email.
- Municipal BFP personnel review and authorize dispatch and coordination actions. Provincial BFP personnel access permitted summaries and administrative changes.

## Source files inspected

| Diagram element | Local implementation |
|---|---|
| Signed session formats | mainfile/alab-system/lib/auth/session.ts |
| Resident protected reports | mainfile/alab-system/app/api/resident/fire-reports/route.ts |
| Municipal access | mainfile/alab-system/lib/municipal-bfp/auth.ts |
| Provincial access | mainfile/alab-system/lib/provincial-bfp/auth.ts |
| Mobile bearer-token check | mainfile/alab-system/lib/auth/mobile-bfp.ts |
| Mobile API and GPS updates | apps/bfp_mobile_app/flutter_application_1/lib/services/mobile_bfp_api.dart |
| GPS collection and OSM tiles | apps/bfp_mobile_app/flutter_application_1/lib/screens/map_screen.dart |
| Authorized GPS endpoint | mainfile/alab-system/app/api/mobile-bfp/dispatches/[dispatchId]/route.ts |
| Dispatch persistence | mainfile/alab-system/lib/municipal-bfp/dispatch.ts |
| Database connection | mainfile/alab-system/lib/db.ts |
| Private storage | mainfile/alab-system/lib/supabase/server-storage.ts |
| Mobile route service | apps/bfp_mobile_app/flutter_application_1/lib/services/road_routing_service.dart |
| Web route proxy | mainfile/alab-system/app/api/routes/road/route.ts |
| Web maps | mainfile/alab-system/app/_components/antique-gis-map.tsx |
| Map feed refresh | mainfile/alab-system/app/_components/municipal-incident-detail.tsx |
| Mobile dispatch refresh | apps/bfp_mobile_app/flutter_application_1/lib/services/mobile_dispatch_store.dart |
| Push notifications | mainfile/alab-system/lib/notifications/fcm.ts |
| Deployment and correction notifications | mainfile/alab-system/README.md |

## Files

- Source image: tests/bfp-system-architecture-data-flow.png
- Revised image: tests/bfp-system-architecture-cloud-map-auth.png
- Generation method: built-in image generation, followed by two connector/layout refinement passes.
- Review: visually checked all four authentication markers, map request/response arrows, cloud API read/write links, private-storage link, and API-originated notification arrow.

## Final refinement prompt

Refine this exact diagram to remove ambiguity at the central cloud. Keep all four user/app/authentication branches, map services, clear navy icons, labels and white background. Make this ONE architectural simplification:

The cloud must represent ONE node: "Cloud Backend API". Put only the server rack INSIDE that cloud, with small text "Authenticate / Authorize / Process". Remove the old top label "Cloud Backend & Data" and remove the duplicated separate "Backend API" label. The cloud with its server is now the actual API endpoint, so all four protected app/authentication paths and both map-data arrows can validly terminate at the cloud boundary. Maintain existing positions of human groups and their apps and authentication shields. Preserve app names and authentication sublabels on all four sides.

Move PostgreSQL Database BELOW and OUTSIDE the cloud, at lower center, with short sublabel "Incidents / Dispatch / GPS / Users" and small "Supabase". Draw ONLY two separate vertical directed arrows between CLOUD API and DATABASE: downward "Save records", upward "Read records". The database has no other connections. Keep Private Storage OUTSIDE the cloud to its right or lower right, sublabels "Photos / IDs" and "Supabase", with one bidirectional link directly to Cloud Backend API labelled "Upload / retrieve".

Move Notifications bell to below-left of the cloud API, clear of the database. Draw ONE SINGLE-HEADED arrow starting at cloud API boundary and ENDING at bell, labelled "Event alerts". No arrowhead points back toward API. No connection at all between Database and Notifications. Keep notification sublabel "In-app / Push / SMS / Email".
Keep Severity Assessment left of cloud, sublabel "Weather + incident factors", ONE SINGLE-HEADED arrow FROM severity INTO cloud API labelled "Score".
Keep Map Views above cloud. LEFT map-data connector has ONE arrowhead at CLOUD API (map -> cloud) labelled "Requests / GPS updates". RIGHT map-data connector has ONE arrowhead at MAP (cloud -> map) labelled "Incident + GPS data". Never put an arrowhead at the bottom of this right upward connector. Keep "Map Data Sync (HTTPS)" to the side. Top App Map Views <-> External Map Services connection remains labelled "Tiles / route requests", providers "OpenStreetMap / OSRM"; retain "Within web and mobile apps" under App Map Views.
All four protected application channels are bidirectional request/response links through their authentication shield to Cloud Backend API. Preserve their accurate concise data labels. Return channels may share one two-headed line with request channels. Keep people connected to their apps only. Keep municipal Review / Dispatch and Backup Requests, provincial Manage Records.

The change is simply moving data stores OUTSIDE the API cloud so cloud represents a single API node and connector endpoints are unambiguous. Draw tidy nonoverlapping orthogonal links in the reclaimed central whitespace. No user or map view connects directly to database. Do not sacrifice existing labels or add extra modules. Keep the two bottom sentences unchanged.

