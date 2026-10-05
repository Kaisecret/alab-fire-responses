import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// tile.openstreetmap.de returns 404 for many Antique tiles at zoom 16 and up,
// which Leaflet leaves as blank grey squares. The OpenStreetMap tile server
// serves the whole province, so the GIS operations maps use it like every
// other map in the app.
for (const scope of ['municipal', 'provincial']) {
  test(`${scope} GIS operations map loads tiles from the OpenStreetMap tile server`, () => {
    const source = readFileSync(`app/_components/${scope}-gis-operations-map.tsx`, 'utf8');

    assert.equal(source.includes('tile.openstreetmap.de'), false);
    assert.equal(source.includes('L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png"'), true);
  });
}
