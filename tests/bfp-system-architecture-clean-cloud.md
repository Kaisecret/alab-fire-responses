# Clean BFP architecture with top cloud

Revised image: bfp-system-architecture-clean-cloud.png

The diagram uses smaller icons, shorter labels, a cloud data node at the top, and lock badges on all four applications. PostgreSQL records and private files are visually consolidated into Cloud Data; protected access remains through the Backend API. External maps/routes stay separate. Backend workflows generate notifications.

## Offline reporting is planned

The dashed Resident PWA -> Offline queue -> Backend API path expresses the user's requested future design: save locally while offline, then submit through the authenticated backend when connectivity returns. It does not claim reports can reach the cloud without internet.

Local code inspected on 2026-09-14:
- mainfile/alab-system/public/resident-sw.js handles GET page and asset caching; it does not queue report POST requests.
- mainfile/alab-system/app/resident/report-fire/page.tsx sends the report as FormData through POST /api/resident/fire-reports and reports failures.
- mainfile/alab-system/app/_components/resident-offline-emergency.tsx detects connection loss and presents emergency hotlines.
- mainfile/alab-system/app/_components/resident-report-status.tsx performs background PATCH requests, but that alone does not establish persistent offline retries.

No application behavior was modified by this diagram-editing task.

## Image generation

Method: built-in image-generation tool, using the original architecture as the edit target and two local connector refinements.

Initial edit prompt:
Edit the supplied BFP architecture reference into a cleaner, more compact version with much LESS TEXT and SMALLER ICONS. This is a thesis figure on pure white. Retain crisp thin NAVY line icons, thin black orthogonal connectors, tiny red SOS accent, four human roles at the corners. Make it look very similar to the reference icon-and-arrow pattern but with generous whitespace and a SMALL CLOUD AT THE TOP CENTER. Do NOT make a giant cloud in the center. Do NOT use cards, bands, big headings or long subtitles. Use consistent compact legible type. Landscape 3:2 composition, crisp high-resolution. Smaller icons, not tiny illegible labels.

VERY IMPORTANT factual constraint: automatic offline report queuing is a PLANNED feature, not currently implemented. Include the requested flow using DASHED lines and label it "Offline queue (planned)" and "Sync when online". Never say cloud synchronization happens without internet. Current implemented flows use solid arrows. The planned offline queue must synchronize through the BACKEND API when connectivity returns, never directly into the database.

COMPOSITION:
TOP CENTER (x50%,y11%): a small cloud outline with tiny database-cylinder and folder pictograms within it, ONE label below: "Cloud Data". This is hosted PostgreSQL and private files, not a separate auth or sync process. Small text "Database / Files" is allowed under the cloud. Central server icon (x50%,y44%) labeled "Backend API". Exactly one vertical TWO-HEADED line between Backend API and Cloud Data labeled "Read / write". This means protected records reach cloud data only through backend. Do not retain another database icon below the API; database and private storage are consolidated into the Cloud Data node to reduce clutter.
UPPER LEFT: Resident human x6%,y34% -> phone x19%,y34% labeled "Resident PWA" -> document x32%,y34% labelled "SOS Report" -> Backend API. Short labels: phone -> report "GPS + details"; report -> API "Submit". A separate return arrow API -> PWA labelled "Status" routed below that row.
ABOVE resident/report area (x29%,y14%): small LOCAL-device document-stack icon labelled "Offline queue (planned)". Draw dashed PWA -> offline queue line labelled "Save offline". Draw dashed offline queue -> Backend API line labelled "Sync when online". Route this dashed return down to the central API through upper-left whitespace, clearly avoiding cloud and solid SOS submission path. All offline arrows dashed. This local queue is NOT inside the cloud.
UPPER RIGHT: phone x81%,y34% "Firefighter App" -> human x95%,y34% "Field Responder". Backend API -> Firefighter App "Dispatch". Separate app -> API returning path "GPS + status".
TOP RIGHT x77%,y12%: compact folded-map-and-pin icon labelled "Maps / Routes". Two-headed line to Firefighter App labelled "Tiles / routes". This represents public mapping/routing services, not private incident storage. No Maps / Routes -> database or cloud-data connector.
LOWER LEFT: Municipal BFP Personnel human x6%,y71% -> monitor x20%,y71% "Municipal Dashboard". Dashboard <-> Backend API via ONE clean elbow two-headed connector, short label "Review / dispatch". Under the monitor, small clipboard and handshake icons labelled "Review" and "Backup" linked locally to monitor with small arrows. Do not connect to Cloud Data directly.
LOWER RIGHT: Provincial BFP Personnel human x95%,y71% -> monitor x81%,y71% "Provincial Dashboard". Dashboard <-> Backend API via ONE elbow two-headed connector, short label "Reports / records". Small document icon below monitor labelled "Records", locally linked to monitor.
BOTTOM CENTER x50%,y84%: small bell "Notifications". Single-headed elbow arrow from Backend API directly to bell labelled "Alerts". Route without touching the cloud data line. No database-to-notification edge.
Near API on its upper-right at x61%,y30%, small sun/map icon "Severity", single-headed short arrow into API labelled "Score".

AUTHENTICATION: attach a small visible lock/shield badge immediately next to EACH of the FOUR application icons (Resident PWA, Municipal Dashboard, Firefighter App, Provincial Dashboard). These four badges mean app authentication checked by the backend. Do not create four large authentication nodes and do not draw additional authentication spaghetti. Small label under Backend API: "Auth / Roles". This preserves all-side authentication while using less text.

Only two short bottom legend phrases:
"Lock = authenticated access"
"Dashed = planned offline reporting; sync requires internet"

Remove all other paragraphs, provider brand lists, long module subtitles, captions, boilerplate and the old centralized standalone Authentication node. Maintain clear arrowheads and distinct routes that do not run through text. Exactly four humans. The output should feel noticeably lighter and cleaner than the input, with small icons and a top cloud, while making the report -> backend -> cloud and planned offline -> online sync obvious.

Final connection correction:
Fix ONE missing connector in this exact image. Do not change anything else.

The horizontal line labelled "Reports / records", above the Provincial Dashboard in the lower right, currently has a DISCONNECTED LEFT END floating in white space. CONNECT THAT OPEN LEFT END back to the Backend API server icon. Draw a thin navy vertical segment upward from the open left end of "Reports / records" to just beneath the existing "GPS + status" return line, then a short horizontal segment left to the right boundary of the Backend API server's bottom rack. Put an arrowhead pointing LEFT INTO the server at that endpoint. Keep the existing downward arrowhead at the Provincial Dashboard. This creates one continuous TWO-HEADED ELBOW CONNECTOR: Backend API <-> Provincial Dashboard, labelled "Reports / records". The line must visibly touch the server icon boundary at one end and the dashboard icon boundary at the other. No floating segments. Avoid overlap with "GPS + status".

Preserve every other connector, the entire layout, cloud at top, all texts, smaller icons, four authentication badges, solid and dashed lines. Do not delete anything or move icons. This is a strictly local addition of one missing elbow segment.

