import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadServerModule } from "./helpers/load-server-module.mjs";

const path = "app/_components/water-source-map-popup.tsx";

function popupModule() {
  return loadServerModule(path, {
    react: { useEffect() {}, useLayoutEffect() {}, useRef: (value) => ({ current: value }), useState: (value) => [value, () => {}] },
    "react/jsx-runtime": { jsx: () => null, jsxs: () => null, Fragment: () => null },
    "react-dom": { createPortal: (children) => children },
  });
}

// A flat projection is enough to check where the pin ends up on screen.
function fakeMap({ zoom = 10, height = 680 } = {}) {
  const flights = [];
  const point = (x, y) => ({ x, y, subtract: ([dx, dy]) => point(x - dx, y - dy) });
  return {
    flights,
    getZoom: () => zoom,
    getSize: () => ({ x: 1200, y: height }),
    project: ([lat, lng]) => point(lng, -lat),
    unproject: ({ x, y }) => [-y, x],
    flyTo: (center, targetZoom, options) => flights.push({ center, zoom: targetZoom, options }),
  };
}

test("a focused water source is flown to and parked low enough for its card to fit above", () => {
  const { flyToWaterSource } = popupModule();
  const map = fakeMap({ height: 680 });
  flyToWaterSource(map, [10.787, 122.0185], false);

  assert.equal(map.flights.length, 1);
  const [flight] = map.flights;
  assert.equal(flight.zoom, 17, "an exact hydrant gets a street-level zoom");
  assert.equal(flight.options.animate, true, "the camera animates the zoom");
  // The pin sits below the map's center, leaving the space above it for the card.
  const pinBelowCenter = flight.center[0] - 10.787;
  assert.ok(pinBelowCenter > 0, "the map centers above the pin");
  assert.equal(Math.round(pinBelowCenter), 470 - 680 / 2);
});

test("flying to a source never zooms out a map the user already zoomed in", () => {
  const { flyToWaterSource } = popupModule();
  const map = fakeMap({ zoom: 18 });
  flyToWaterSource(map, [10.787, 122.0185], true);
  assert.equal(map.flights[0].zoom, 18);

  const overview = fakeMap({ zoom: 9 });
  flyToWaterSource(overview, [10.787, 122.0185], true);
  assert.equal(overview.flights[0].zoom, 13, "an approximate marker only shows its municipality");
});

test("the details card opens on the map over its pin, without dimming the screen", () => {
  const source = readFileSync(path, "utf8");
  assert.match(source, /L\.popup\(/, "the card rides a Leaflet popup anchored to the pin");
  assert.match(source, /\.setLatLng\(\[latitude, longitude\]\)/);
  assert.match(source, /@keyframes water-map-pop/, "the card pops in");
  assert.match(source, /prefers-reduced-motion/);
  assert.doesNotMatch(source, /backdrop/i, "no backdrop covers the page");
  assert.doesNotMatch(source, /aria-modal/, "the card does not block the map");
  assert.doesNotMatch(source, /document\.body\.style\.overflow/, "the page keeps scrolling");
  assert.match(source, /event\.key === "Escape"/);
});
