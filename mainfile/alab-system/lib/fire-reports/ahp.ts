export type AhpResult = {
  weights: number[];
  lambdaMax: number;
  ci: number;
  cr: number;
};

const RANDOM_INDEX: Record<number, number> = {
  1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12,
  6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49,
};

function validateMatrix(matrix: readonly (readonly number[])[]): number {
  const size = matrix.length;
  if (size < 1 || size > 10 || matrix.some((row) => row.length !== size)) {
    throw new Error("AHP matrix must be square with 1 to 10 criteria");
  }
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const value = matrix[row][column];
      if (!Number.isFinite(value) || value <= 0) throw new Error("AHP comparisons must be positive finite numbers");
      if (Math.abs(value * matrix[column][row] - 1) > 1e-6) {
        throw new Error("AHP comparisons must be reciprocal");
      }
    }
  }
  return size;
}

export function computeAhpWeights(matrix: readonly (readonly number[])[]): AhpResult {
  const size = validateMatrix(matrix);
  const geometricMeans = matrix.map((row) => Math.exp(row.reduce((sum, value) => sum + Math.log(value), 0) / size));
  const total = geometricMeans.reduce((sum, value) => sum + value, 0);
  const weights = geometricMeans.map((value) => value / total);
  const lambdaMax = weights.reduce((sum, weight, row) => {
    const weightedSum = matrix[row].reduce((value, comparison, column) => value + comparison * weights[column], 0);
    return sum + weightedSum / weight;
  }, 0) / size;
  const ci = size < 3 ? 0 : Math.max(0, (lambdaMax - size) / (size - 1));
  return { weights, lambdaMax, ci, cr: size < 3 ? 0 : ci / RANDOM_INDEX[size] };
}

export function aggregateMatrices(matrices: readonly (readonly (readonly number[])[])[]): number[][] {
  if (matrices.length === 0) throw new Error("AHP aggregation needs at least one matrix");
  const size = validateMatrix(matrices[0]);
  for (const matrix of matrices.slice(1)) {
    if (validateMatrix(matrix) !== size) throw new Error("AHP matrices must have the same size");
  }
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) =>
      Math.exp(matrices.reduce((sum, matrix) => sum + Math.log(matrix[row][column]), 0) / matrices.length)));
}
