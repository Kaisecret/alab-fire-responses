# Municipal Incident Map Marker Design

## Goal

Replace the plain fire image used for a Municipal BFP incident location with a clear emergency map pin that matches the approved reference.

## Design

- A red teardrop location pin with a white fire icon identifies the incident point.
- A translucent red circular ring surrounds the pin, making the marker visible over map roads and tiles.
- The marker keeps a red shadow for contrast and remains anchored at the incident coordinate.
- Map routing, incident popups, station markers, report data, and all API behaviour remain unchanged.

## Verification

- Update the focused map component test to assert the emergency pin markup and ring styling.
- Run the focused test suite, the full test suite, and a production build before deployment.
