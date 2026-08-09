# Antique MapLibre GIS Design

## Goal

Replace the municipal BFP GIS page's CSS mock map with a real MapLibre GL JS map focused on the whole Province of Antique.

## Scope

- Change only the GIS map surface at `mainfile/alab-system/app/municipal-bfp/gis-map/page.tsx`.
- Add a focused map component if needed to keep MapLibre browser code isolated.
- Add MapLibre GL JS as the map dependency.
- Keep the existing municipal dashboard, sidebar, header, controls, and legend behavior visually consistent.

## Design

The GIS page will render a MapLibre map centered on Antique, with max bounds around the province so users cannot drift far outside the area of responsibility. The map will use the existing ALAB palette: red for incidents, blue for fire stations, teal for water sources, and quiet pale land/water colors behind the operational overlays.

Map data will come from a public MapLibre-compatible style. On load, the page will adjust common layer paint properties when available so the base map feels connected to the ALAB palette. Incident, station, and water source points will be defined as GeoJSON-like data in the component and rendered as MapLibre markers with Font Awesome icons, preserving the current labels and counts.

## Verification

- Static regression test confirms the GIS page uses the Antique MapLibre component.
- Static regression test confirms Antique-focused bounds and ALAB marker colors are present.
- Run the project test suite and lint/build checks after implementation.
