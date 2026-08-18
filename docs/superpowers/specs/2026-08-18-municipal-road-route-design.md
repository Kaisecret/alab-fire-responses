# Municipal BFP Road Route Design

## Goal

Show Municipal BFP personnel a usable road route from their assigned station to a resident's reported fire location.

## Design

- Use the existing server-side OSRM driving route endpoint for the station-to-incident path.
- Do not draw the grey straight line while an OSRM road route is available.
- Fit the map to the returned road geometry and emphasize it with a solid emergency-red route.
- Show road distance and estimated travel time in the route panel.
- If OSRM is offline or returns no route, draw a dashed straight-line fallback and state clearly that road guidance is unavailable.
- The dispatch origin remains the assigned Municipal BFP station coordinates, not a browser/admin GPS point.

## Verification

- Test that the map component contains a named straight-line fallback and fits the map to a road route.
- Run the focused map test, full app test suite, and production build.
