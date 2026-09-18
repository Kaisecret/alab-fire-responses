import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = (path) => readFileSync(join(process.cwd(), path), "utf8");

/** The stylesheet the component carries, without the markup around it. */
function stylesheetOf(component) {
  const start = component.indexOf("const styles = `");
  return component.slice(start, component.indexOf("`;", start));
}

test("every class the alarm panel uses has a rule to style it", () => {
  const panel = source("app/_components/provincial-alarm-panel.tsx");
  const styles = stylesheetOf(panel);

  /*
   * Editing the stylesheet by replacing a block once took the badge rules with
   * it, so the badges rendered as bare text running into one another. A class
   * with no rule behind it is the shape that bug takes.
   */
  const used = new Set(
    [...panel.matchAll(/className="(pap-[a-z-]+)"/g)].map((match) => match[1]),
  );
  assert.ok(used.size > 0, "the panel names classes at all");

  const missing = [...used].filter(
    (name) => !new RegExp("\\." + name + "[\\s,{:]").test(styles),
  );
  assert.deepEqual(missing, [], `these classes have no style rule: ${missing.join(", ")}`);
});

test("the badges are laid out rather than left to collide", () => {
  const styles = stylesheetOf(source("app/_components/provincial-alarm-panel.tsx"));

  assert.match(styles, /\.pap-badges \{[^}]*gap:/);
  assert.match(styles, /\.pap-auto \{/);
  assert.match(styles, /\.pap-current \{/);
  // Each alarm level is tinted by how far it reaches.
  for (const level of [2, 3, 4]) {
    assert.match(styles, new RegExp(`\\.pap-current\\.level-${level}`));
  }
});

test("the escalations sit under the page heading, not above it", () => {
  const page = source("app/provincial-bfp/assistance-requests/page.tsx");

  /*
   * Mounted ahead of the header, the panel pushed the page title off the screen
   * the moment a request arrived: the page appeared to turn into a different
   * one a few seconds after it loaded.
   */
  const headerAt = page.indexOf("pbfp-aid-header-hub");
  const panelAt = page.indexOf("<ProvincialAlarmPanel />");
  assert.ok(headerAt > 0 && panelAt > 0);
  assert.ok(panelAt > headerAt, "the heading is rendered before the escalations");

  // ...and it carries a heading of its own.
  assert.match(page, /pbfp-escalation-section/);
  assert.match(page, /Escalated to the province/);
});
