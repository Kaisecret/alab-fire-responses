import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';

/**
 * Station placement checks real Antique boundaries, and fixtures use made-up
 * towns and coordinates, so it lets every station through unless a test
 * supplies its own. tests/station-placement.test.mjs covers the real check.
 */
export const passThroughStationPlacement = {
  keepStationsInOwnMunicipality: (stations) => stations,
  assertStationInMunicipality: () => {},
};

export function loadServerModule(path, dependencies) {
  const code = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', code)(name => {
    if (name === 'server-only') return {};
    if (name === 'node:crypto') return { randomUUID };
    if (name in dependencies) return dependencies[name];
    if (name.endsWith('intermunicipality/station-placement') || name === './station-placement') return passThroughStationPlacement;
    throw Error(`Unexpected dependency: ${name}`);
  }, exports);
  return exports;
}
