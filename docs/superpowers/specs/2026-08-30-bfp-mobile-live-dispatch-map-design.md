# BFP Mobile Live Dispatch Map Design

## Goal

Keep the existing ALAB BFP mobile visual design while replacing its hard-coded dashboard, alert, incident, and map content with the Municipal BFP user's real active dispatch assignments.

## Scope

- Preserve the existing colour palette, cards, bottom navigation, typography, spacing, and interactions.
- Use the existing authenticated `/api/mobile-bfp/dispatches` endpoint as the single source of active incident data.
- Refresh active assignments when the incidents tab opens, when the user pulls to refresh, and on a short foreground polling interval.
- Replace dashboard demo counts, featured incident, alert modal rows, and assignment preview with live assignment data or an honest empty state.
- Replace the painted demo map markers and fixed route with a real OpenStreetMap tile map centered on the active assignment's report latitude/longitude.
- Display the actual incident marker and, when location permission is granted, the responder's current location marker. The route action remains the existing dispatch acknowledgement; routing instructions are not fabricated.
- Register each authenticated BFP phone's FCM token and refresh its registration when Firebase rotates the token.
- Send each registered recipient phone an Android FCM notification when its station is dispatched.

## Data Flow

1. The mobile BFP session supplies its bearer token to `MobileBfpApi.listDispatchAssignments`.
2. The API returns only the dispatch-recipient records belonging to that user.
3. A shared assignment controller/cached future exposes loading, ready, empty, and error states to the existing Home, Incidents, and Map tabs.
4. The map reads the first current assignment. If none exists, it retains the current visual frame but states that no active destination is assigned.
5. After sign-in or session restore, the client posts its FCM token to a protected mobile API. The server saves it in `bfp_mobile_devices` and sends dispatch alerts using Firebase Admin and a production-only secret.

## Error Handling

- A failed refresh retains the most recently successful assignment data and shows a small non-blocking connection message.
- A missing current-location permission leaves the incident map usable and shows only the incident marker.
- An empty assignment list never displays demo incidents, false counts, fake alerts, or a fake route.
- The tactical map never uses station coordinates as a responder position and never renders a straight-line route. It shows a clear road-route loading or unavailable state until phone GPS and OSRM road geometry are both available.
- The truck marker updates only when a new accurate phone-GPS reading is at least five metres from the displayed position. It recalculates OSRM routing after a forty-metre movement.

## Constraints

- Do not alter the server dispatch schema or create duplicate dispatch notifications.
- Store the Firebase Admin service-account JSON only as Vercel's protected `FIREBASE_SERVICE_ACCOUNT_JSON` variable; never commit, log, or expose it to Flutter.
- OpenStreetMap is used only for map tiles; no API key is required.
- The existing public OSRM driving endpoint supplies road geometry. The app does not manufacture a curved or direct fallback route.
- The feature must work on the existing Android Flutter app and keep the existing UI design intact.

## Validation

- Unit/widget tests prove empty, loaded, and failed assignment states do not expose demo incident text.
- Tests prove the map receives the active assignment coordinates and handles missing location access.
- `flutter test` passes before device testing.
- Manual Android test: sign in as an active member of a selected station, dispatch an incident, open/refresh Assigned Incidents, and confirm the same incident appears on the dashboard and map.
