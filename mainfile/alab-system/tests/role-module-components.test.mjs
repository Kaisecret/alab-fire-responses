import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("shared module shell renders role content collections", () => {
  const shellPath = join(root, "app", "_components", "module-shell.tsx");

  assert.equal(existsSync(shellPath), true, "module shell is missing");

  const shell = readFileSync(shellPath, "utf8");

  assert.match(shell, /import Link from "next\/link"/);
  assert.match(shell, /UserModuleDefinition/);
  assert.match(shell, /primaryActions\.map/);
  assert.match(shell, /highlights\.map/);
  assert.match(shell, /sections\.map/);
  assert.doesNotMatch(shell, /firefighter/i);
});

test("resident and municipal components bind shared role definitions", () => {
  const cases = [
    ["resident-module.tsx", /userModules\.resident/, /ResidentModule/],
    [
      "municipal-bfp-module.tsx",
      /userModules\["municipal-bfp"\]/,
      /MunicipalBfpModule/,
    ],
  ];

  for (const [fileName, rolePattern, componentPattern] of cases) {
    const componentPath = join(root, "app", "_components", fileName);

    assert.equal(existsSync(componentPath), true, `${fileName} is missing`);

    const component = readFileSync(componentPath, "utf8");

    assert.match(component, rolePattern);
    assert.match(component, componentPattern);
    assert.match(component, /ModuleShell/);
    assert.doesNotMatch(component, /firefighter/i);
  }
});

test("Provincial BFP module uses the dedicated provincial dashboard", () => {
  const componentPath = join(root, "app", "_components", "provincial-bfp-module.tsx");

  assert.equal(existsSync(componentPath), true, "provincial-bfp-module.tsx is missing");

  const component = readFileSync(componentPath, "utf8");

  assert.match(component, /ProvincialBfpModule/);
  assert.match(component, /ProvincialBfpDashboard/);
  assert.doesNotMatch(component, /ModuleShell/);
  assert.doesNotMatch(component, /firefighter/i);
});
