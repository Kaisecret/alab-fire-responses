import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const header = readFileSync(new URL("../../../tests/AHP Answers Entry Template.csv", import.meta.url), "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)[0];

function completedCsv() {
  const columns = header.split(",");
  const rows = Array.from({ length: 12 }, (_, index) => {
    const values = columns.map((column) => {
      if (column === "Respondent") return String(index + 1);
      if (column === "Municipality") return `Municipality ${index + 1}`;
      if (column === "Position") return "Fire Marshal";
      if (column === "Date") return "2026-09-28";
      if (column.endsWith(" choice (House density vs Wind speed)")) return "A";
      if (column.endsWith(" rating") && column.startsWith("A1 ")) return "3";
      if (column.startsWith("B1 choice (")) return "B";
      if (column === "B1 rating") return "2";
      if (column.includes(" choice (")) return "Equal";
      if (column.endsWith(" rating")) return "1";
      throw new Error(`Unexpected column: ${column}`);
    });
    return values.join(",");
  });
  return [header, ...rows].join("\n");
}

test("importer requires twelve completed response rows", async () => {
  const { buildComparisonData } = await import("../scripts/import-ahp-answers.mjs");
  assert.throws(() => buildComparisonData(`${header}\n1,,,,`, { checkTargets: false }), /12 completed responses/i);
});

test("importer encodes A, Equal and B judgments and computes both AHP models", async () => {
  const { buildComparisonData } = await import("../scripts/import-ahp-answers.mjs");
  const result = buildComparisonData(completedCsv(), { checkTargets: false });
  assert.equal(result.data.responses.length, 12);
  assert.deepEqual(result.data.responses[0].structural.slice(0, 2), [3, 1]);
  assert.deepEqual(result.data.responses[0].vegetation, [-2, 1, 1, 1, 1, 1]);
  assert.equal(result.summary.structural.individual.length, 12);
  assert.ok(result.summary.structural.aggregate.cr <= 0.10);
  assert.ok(result.summary.vegetation.aggregate.cr <= 0.10);
});

test("importer rejects incomplete or inconsistent judgments", async () => {
  const { buildComparisonData } = await import("../scripts/import-ahp-answers.mjs");
  assert.throws(() => buildComparisonData(completedCsv().replace(",A,3,", ",A,,"), { checkTargets: false }), /A1 rating/i);
  assert.throws(() => buildComparisonData(completedCsv().replace(",A,3,", ",B,1,"), { checkTargets: false }), /A1 rating/i);
});

test("target check rejects answers that do not reproduce the planned weights", async () => {
  const { buildComparisonData } = await import("../scripts/import-ahp-answers.mjs");
  assert.throws(() => buildComparisonData(completedCsv()), /target weights/i);
});
