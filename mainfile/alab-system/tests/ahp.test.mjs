import assert from "node:assert/strict";
import test from "node:test";

test("AHP derives normalized weights and zero inconsistency from a consistent matrix", async () => {
  const { computeAhpWeights } = await import("../lib/fire-reports/ahp.ts");
  const result = computeAhpWeights([
    [1, 2, 4],
    [1 / 2, 1, 2],
    [1 / 4, 1 / 2, 1],
  ]);
  assert.deepEqual(result.weights.map((weight) => Number(weight.toFixed(6))), [0.571429, 0.285714, 0.142857]);
  assert.ok(Math.abs(result.lambdaMax - 3) < 1e-10);
  assert.ok(Math.abs(result.cr) < 1e-10);
});

test("AHP combines respondent judgments by element-wise geometric mean", async () => {
  const { aggregateMatrices } = await import("../lib/fire-reports/ahp.ts");
  assert.deepEqual(aggregateMatrices([
    [[1, 2], [1 / 2, 1]],
    [[1, 8], [1 / 8, 1]],
  ]), [[1, 4], [1 / 4, 1]]);
});

test("AHP rejects malformed comparisons", async () => {
  const { computeAhpWeights, aggregateMatrices } = await import("../lib/fire-reports/ahp.ts");
  assert.throws(() => computeAhpWeights([[1, 2], [2, 1]]), /reciprocal/i);
  assert.throws(() => computeAhpWeights([[1, 0], [1, 1]]), /positive/i);
  assert.throws(() => aggregateMatrices([]), /at least one/i);
});
