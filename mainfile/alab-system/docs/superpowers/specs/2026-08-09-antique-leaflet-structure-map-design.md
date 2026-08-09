# Antique-Only Leaflet Structure Map Design

**Status:** Approved in conversation on 2026-08-09

## Goal

Improve only the Municipal BFP GIS map so it opens on the complete Province of Antique and lets authorized personnel inspect OpenStreetMap-mapped houses, buildings, roads, schools, hospitals, government facilities, landmarks, fire-response resources, water sources, evacuation locations, and recommended routes.

The map supports the study's decision-support purpose: province-wide awareness first, followed by municipality and street-level inspection for response planning. It is reference mapping, not cadastral or property-ownership data.

## Scope

The change is limited to the GIS map component, map-specific styling, an Antique boundary data asset, and focused GIS tests. Existing dashboard navigation, incident cards, statistics, authentication, resident pages, and other Municipal BFP pages remain unchanged.

All application overlays, searches, facility requests, labels, markers, and selectable municipalities are restricted to Antique. The map cannot be panned into another province. OpenStreetMap tiles may contain small border context at the edge of the rectangular viewport, but the interface will not expose non-Antique destinations or operational data.

## User Experience

### Province Overview

- The initial view fits the whole Province of Antique, including Caluya and its offshore islands.
- The Antique provincial boundary is clearly outlined without placing a white or colored wash over the map.
- The natural OpenStreetMap street-map colors remain visible.
- Province-level labels prioritize Antique municipalities and operational markers.
- A compact `All Antique` action returns the map to the province overview.

### Municipality Detail

- A compact in-map selector lists all 18 Antique municipalities: Anini-y, Barbaza, Belison, Bugasong, Caluya, Culasi, Hamtic, Laua-an, Libertad, Pandan, Patnongon, San Jose de Buenavista, San Remigio, Sebaste, Sibalom, Tibiao, Tobias Fornier, and Valderrama.
- Selecting a municipality moves the map to a street-level view where OpenStreetMap building footprints, roads, labels, and landmarks are readable.
- Municipality navigation is the primary way to reach structure detail because individual houses cannot be legible in a province-wide view.
- Clicking a mapped facility opens a concise popup with its name, category, municipality when available, and OpenStreetMap source attribution.

### Operational Layers

- Fire incidents use ALAB red.
- Fire stations use operational blue.
- Verified water sources use teal.
- Recommended routes use a restrained dashed line.
- Schools and educational facilities use blue facility markers.
- Hospitals and clinics use red medical markers.
- Government, police, and BFP facilities use amber markers.
- Evacuation areas and community shelters use green markers.
- The existing Incident, Station, Water Source, and All Layers controls continue to toggle only their matching operational overlays.

### Responsive Behavior

- Desktop layout outside the map remains unchanged.
- On mobile, the municipality selector remains usable without covering zoom controls.
- The legend becomes compact or collapsible so it does not obscure the map.
- Controls keep touch targets large enough for field use, and all labels remain within the map frame.

## Technical Design

### Mapping Engine and Basemap

- Continue using Leaflet 1.9 with the standard OpenStreetMap raster tile layer.
- Use zoom levels through 19 so mapped building footprints and local roads are visible where OpenStreetMap provides them.
- Keep visible OpenStreetMap attribution.
- Use the OpenStreetMap Antique administrative relation (`1506746`) as the exact province boundary and local reference geometry.
- Use the verified province extent of approximately `10.2712376–12.2794760° N` and `121.1450673–122.3323830° E`, which includes Caluya.
- Use a minimum province-level zoom and maximum bounds viscosity to prevent navigation away from the Antique extent.
- Keep the area inside Antique fully colored and unobstructed. If an outside-boundary mask is needed for focus, it applies only outside the exact provincial geometry and never washes out Antique itself.

The raster basemap is the reliable source for roads, mapped houses, building footprints, schools, landmarks, and geographic context. It avoids downloading every building polygon in Antique through Overpass, which would be slow, rate-limit prone, and likely to cause blank or stalled map states.

### Antique Navigation Data

- Store the 18 municipality names, center coordinates, and detail zoom levels in one typed configuration.
- Populate both municipality labels and the selector from that configuration.
- Use `fitBounds` for the whole-province view and `flyTo` or `setView` for municipality detail.
- Keep all configured coordinates inside the exact Antique administrative boundary, including the Caluya municipality location.

### Public Facilities

- Use OpenStreetMap Overpass data for named schools, colleges, hospitals, clinics, fire stations, police stations, government offices, town halls, community centers, markets, libraries, places of worship, social facilities, shelters, and emergency assembly points in Antique.
- Do not request all province-wide building polygons. Houses and ordinary buildings remain visible through the OpenStreetMap basemap at local zoom.
- Hide facility markers at province scale and reveal them at municipality/detail zoom to prevent clutter.
- Prefer the primary Overpass endpoint and retain a fallback endpoint.
- Sanitize all OpenStreetMap text before inserting popup HTML.

### Failure Handling

- Tile-map failure must not create a white overlay or cover operational controls.
- If Overpass is unavailable, the OpenStreetMap basemap, Antique navigation, operational markers, and route remain usable.
- Facility loading failure stays non-blocking and can retry after a municipality change or map reload.
- No external request may expand its query outside the Antique bounding area.

## Testing

Focused GIS tests will verify:

- Leaflet and OpenStreetMap remain the active map stack.
- The initial map uses Antique bounds and a whole-province fit.
- All 18 municipalities are configured and no non-Antique destination is offered.
- Municipality selection changes to a structure-readable zoom.
- OpenStreetMap supports zoom level 19 for mapped buildings and roads.
- Facility queries include education, medical, government, emergency, and evacuation categories and remain bounded to Antique.
- Operational layer controls remain functional and accessible.
- No white wash overlay or MapLibre dependency returns.
- Mobile map controls and legend have dedicated responsive styling.

Verification will include the focused test, lint, production build, diff inspection, and a local HTTP check of the GIS route and OpenStreetMap tile endpoint.

## Acceptance Criteria

1. The GIS map opens on the whole Province of Antique, including Caluya, and cannot be navigated beyond the Antique extent.
2. Users can select any of Antique's 18 municipalities and reach a zoom where mapped houses and structures are visible.
3. Mapped schools, hospitals, government facilities, fire stations, evacuation locations, roads, landmarks, and other OpenStreetMap details are readable without a color wash.
4. Existing incident, station, water-source, and route overlays remain clear and use the ALAB palette.
5. No non-map application behavior or desktop dashboard layout changes.
6. The map remains usable on mobile and when the public-facility request fails.
