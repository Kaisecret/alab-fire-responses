# Antique offline basemap

`antique-basemap-z15.pmtiles` is an Antique region extract of the [Protomaps Basemap](https://docs.protomaps.com/basemaps/downloads) build dated 2026-09-28. The map is derived from OpenStreetMap and Natural Earth. OpenStreetMap attribution appears on both mobile map tabs. The basemap is distributed as an ODbL Produced Work; see the [OpenStreetMap copyright page](https://www.openstreetmap.org/copyright).

The extract was generated with `go-pmtiles` v1.31.2:

```text
pmtiles extract https://build.protomaps.com/20260928.pmtiles antique-basemap-z15.pmtiles --bbox=121.12,10.24,122.36,12.31 --maxzoom=15
```

The archive covers Antique and a small border. At map zooms above 15, the app enlarges the most detailed local tiles. Incidents outside this area have no basemap coverage. The archive is copied from the APK into the app support directory the first time a map opens and remains there across offline launches.
