# Resident Report Location Design

## Goal

Make the existing resident fire-report location step fast, trustworthy, and easy to verify. The page must show an immediate locating experience, refine the device position before confirming it, resolve the barangay and municipality, and keep reports inside Antique without changing any other report section.

## Confirmed Problem

- The current implementation uses one `getCurrentPosition` result and marks it `AUTO DETECTED` regardless of its reported accuracy.
- A desktop or network-based first reading can be kilometers away. The reverse geocoder then correctly names that wrong coordinate, which explains results such as `Municipality Bacolod`.
- The current mini-map has a small fixed layout and receives only one early `invalidateSize` call, making it fragile when the card changes size or reveals address content.
- Barangay fields vary across OpenStreetMap responses. An explicitly named barangay must take priority over generic neighborhood fields.

## Detection Flow

1. Request location permission when the report page is ready.
2. Start `watchPosition` with high accuracy and no cached position. Display the first reading on the map immediately, but keep the state as `IMPROVING ACCURACY` while better readings arrive.
3. Retain only the best reading, determined by the smallest `coords.accuracy` value.
4. Confirm immediately when accuracy reaches 50 meters or better.
5. Stop refinement after 10 seconds. A best reading from 51 to 150 meters is accepted as `APPROXIMATE`; a reading worse than 150 meters remains `LOW ACCURACY` and is not auto-confirmed.
6. Reverse-geocode only the finalized best reading. Store the coordinates, accuracy, barangay, municipality, and Antique validation result on the existing location card data state.
7. Treat an address as inside Antique when the response identifies `PH-ANT` or the province/state as `Antique`. A result outside Antique shows `OUTSIDE ANTIQUE` and requires retrying or adjusting the pin.
8. `Detect my location` restarts the complete refinement flow. `Adjust Pin` enables map-click and marker-drag correction, then resolves the corrected address and labels the state `PIN ADJUSTED`.

## Address Resolution

- First select any address value that explicitly contains `Barangay`.
- Otherwise use the first available value from `village`, `suburb`, `quarter`, `neighbourhood`, or `hamlet`.
- Resolve the municipality from `municipality`, `city`, or `town`; do not use the province as a municipality fallback.
- Keep coordinates visible when an address field is missing or the reverse lookup fails.

## Visual Design

**Visual thesis:** a calm emergency location panel with a clear ALAB-red locator, readable status hierarchy, and a real street map as the dominant evidence of where the report will be sent.

**Content plan:** status and detected place first, coordinates and measured accuracy second, a stable map preview beside them on desktop and below them on mobile, then the two existing correction actions.

**Interaction thesis:** use a restrained pulse while acquiring GPS, animate the map toward each improved reading, and use an accuracy circle that visibly tightens as confidence improves. Status changes use short color and opacity transitions without moving the surrounding form.

- Keep the existing two-column report layout and all non-location content unchanged.
- Give the location card stable responsive dimensions so its details and map cannot overlap or disappear.
- Keep the map visible during locating, success, low-accuracy, and error states.
- Recalculate Leaflet size after layout changes and observe the map container for responsive resizing.
- Use clear states: `LOCATING`, `IMPROVING`, `CONFIRMED`, `APPROXIMATE`, `LOW ACCURACY`, `OUTSIDE ANTIQUE`, and `PIN ADJUSTED`.
- Use the project fire logo inside the map marker, plus a translucent accuracy circle around the current position.

## Error Handling

- Permission denied: explain how to allow location and keep retry/manual adjustment available.
- Position unavailable or timed out: retain the Antique overview map and offer retry/manual adjustment.
- Low accuracy: show the best measured accuracy without claiming that the location is confirmed.
- Outside Antique: show the detected municipality for transparency, but do not mark the report location as valid.
- Reverse-geocoding or tile failure: retain coordinates and controls; the form must not crash or become blank.

## Data and Privacy

- Use browser Geolocation only for the active report flow.
- Stop the location watch as soon as a reading is finalized, the resident retries, or the component unmounts.
- Make at most one reverse lookup for an automatically finalized reading and one lookup after a manual pin adjustment.
- Do not persist location outside the existing report submission state.

## Scope

- Modify only the resident report location UI, its geolocation behavior, the reverse-geocode response handling, and focused tests/docs.
- Preserve the nearest landmark, incident type, description, photo, navigation, and submission UI.
- Keep all work local until the user explicitly requests a push or deployment.

## Verification

- Add failing tests for progressive `watchPosition`, best-reading selection, accuracy thresholds, Antique validation, barangay priority, watch cleanup, draggable/manual correction, and stable map hooks.
- Verify the focused resident-location tests, lint, and production build.
- Exercise allowed, denied, low-accuracy, outside-Antique, refined-accuracy, and manual-pin states in a browser when browser control is available.
