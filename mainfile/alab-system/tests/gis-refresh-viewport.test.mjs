import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

function mapDrawing(scope) {
  const source = readFileSync(`app/_components/${scope}-gis-operations-map.tsx`, 'utf8');
  const code = ts.transpileModule(`${source}\nexport { drawIncidents, drawWaterSources };`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', code)(name => name.includes('building-density-presentation') ? { densityRiskClass: () => '' } : {}, exports);
  return exports;
}

function leaflet() {
  const moves = [];
  const layer = { markers: [], clearLayers() { this.markers = []; } };
  const L = {
    latLngBounds: points => points,
    divIcon: options => options,
    marker: (point, options) => ({ point, options, on() { return this; }, addTo(group) { group.markers.push(this); return this; } }),
  };
  const map = { setView: (...args) => moves.push(args), fitBounds: (...args) => moves.push(args) };
  return { L, map, layer, moves };
}

const cluster = (id, activeCount = 1) => ({ key: id, latitude: 10.744 + Number(id) / 100, longitude: 121.942, activeCount, incidents: [{ id }] });

for (const scope of ['municipal', 'provincial']) {
  const drawing = mapDrawing(scope);
  const draw = (fixture, clusters, frame, view = 'ALL') => {
    const args = [fixture.L, fixture.map, fixture.layer, clusters];
    if (scope === 'municipal') args.push('San Jose de Buenavista');
    drawing.drawIncidents(...args, () => {}, view, frame);
  };

  test(`${scope} live pin redraws preserve the viewport, including new locations and an empty feed`, () => {
    const fixture = leaflet();
    draw(fixture, [cluster('1')], true);
    assert.equal(fixture.moves.length, 1, 'initial reports are framed');
    fixture.moves.length = 0;
    for (const reports of [[cluster('1'), cluster('2')], [cluster('2')], []]) {
      draw(fixture, reports, false);
      assert.equal(fixture.layer.markers.length, reports.length, 'the pins still update');
      assert.equal(fixture.moves.length, 0, 'a live update must not reset user zoom or center');
    }
    draw(fixture, [cluster('2')], true);
    assert.equal(fixture.moves.length, 1, 'an intentional view change can still frame reports');
  });

  test(`${scope} active/history filters still update pins without requiring camera movement`, () => {
    const fixture = leaflet();
    const reports = [cluster('1'), cluster('2', 0)];
    draw(fixture, reports, false, 'ACTIVE');
    assert.equal(fixture.layer.markers.length, 1);
    assert.equal(fixture.layer.markers[0].point[0], reports[0].latitude);
    draw(fixture, reports, false, 'HISTORY');
    assert.equal(fixture.layer.markers[0].point[0], reports[1].latitude);
    assert.equal(fixture.moves.length, 0);
  });

  test(`${scope} refreshing a focused water source keeps zoom, while initial deep links still focus`, () => {
    const fixture = leaflet();
    const groups = [{ point: [10.744, 121.942], approximate: false, sources: [{ id: 'hydrant', sourceKind: 'FIRE_HYDRANT' }] }];
    drawing.drawWaterSources(fixture.L, fixture.map, fixture.layer, groups, 'hydrant', () => {}, false);
    assert.equal(fixture.layer.markers.length, 1);
    assert.equal(fixture.moves.length, 0);
    drawing.drawWaterSources(fixture.L, fixture.map, fixture.layer, groups, 'hydrant', () => {}, true);
    assert.deepEqual(fixture.moves[0].slice(0, 2), [[10.744, 121.942], 17]);
  });
}
