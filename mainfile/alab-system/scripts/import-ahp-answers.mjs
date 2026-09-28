import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { aggregateMatrices, computeAhpWeights } from "../lib/fire-reports/ahp.ts";

const structuralCriteria = ["density", "wind", "structure", "route", "weather"];
const vegetationCriteria = ["wind", "weather", "distance", "route"];
const targetStructural = [0.312, 0.133, 0.288, 0.199, 0.068];
const targetVegetation = [0.376, 0.159, 0.308, 0.157];
const pairs = [
  ...Array.from({ length: 10 }, (_, i) => `A${i + 1}`),
  ...Array.from({ length: 6 }, (_, i) => `B${i + 1}`),
];

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (character === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[i + 1] === "\n") i++;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  if (quoted) throw new Error("CSV has an unterminated quoted field");
  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

function matrixFromAnswers(answers, size) {
  const matrix = Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => i === j ? 1 : 0));
  let index = 0;
  for (let i = 0; i < size; i++) {
    for (let j = i + 1; j < size; j++) {
      const value = answers[index++];
      matrix[i][j] = value > 0 ? value : 1 / Math.abs(value);
      matrix[j][i] = 1 / matrix[i][j];
    }
  }
  return matrix;
}

function summarize(responses, type, criteria) {
  const matrices = responses.map((response) => matrixFromAnswers(response[type], criteria.length));
  return {
    criteria,
    individual: matrices.map((matrix, index) => ({ id: responses[index].id, ...computeAhpWeights(matrix) })),
    matrix: aggregateMatrices(matrices),
  };
}

export function buildComparisonData(csv, { checkTargets = true } = {}) {
  const [header, ...rawRows] = parseCsv(csv.replace(/^\uFEFF/, ""));
  if (!header) throw new Error("CSV is empty");
  const columns = new Map(header.map((name, index) => [name.trim(), index]));
  for (const name of ["Respondent", "Municipality", "Position", "Date",
    ...pairs.flatMap((pair) => [`${pair} choice`, `${pair} rating`])]) {
    if (name.endsWith(" choice")) {
      if (![...columns.keys()].some((column) => column.startsWith(`${name} (`))) {
        throw new Error(`CSV is missing ${name}`);
      }
    } else if (!columns.has(name)) {
      throw new Error(`CSV is missing ${name}`);
    }
  }
  const rows = rawRows.filter((row) => row[columns.get("Respondent")]?.trim().toLowerCase() !== "example");
  if (rows.length !== 12) throw new Error(`Expected 12 completed responses; found ${rows.length}`);
  const ids = new Set();
  const responses = rows.map((row, index) => {
    if (row.length !== header.length) throw new Error(`Respondent row ${index + 1} has ${row.length} columns; expected ${header.length}`);
    const get = (name) => row[columns.get(name)]?.trim() ?? "";
    const id = get("Respondent");
    const municipality = get("Municipality");
    const position = get("Position");
    const date = get("Date");
    if (!id || !municipality || !position || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`Respondent row ${index + 1} needs ID, municipality, position, and date (YYYY-MM-DD)`);
    }
    if (ids.has(id)) throw new Error(`Duplicate respondent ID ${id}`);
    ids.add(id);
    const answers = pairs.map((pair) => {
      const choiceColumn = [...columns.keys()].find((column) => column.startsWith(`${pair} choice (`));
      const choice = get(choiceColumn).toLowerCase();
      const rating = Number(get(`${pair} rating`));
      if (!Number.isInteger(rating) || rating < 1 || rating > 9) {
        throw new Error(`Respondent ${id}: ${pair} rating must be an integer from 1 to 9`);
      }
      if (choice === "equal") {
        if (rating !== 1) throw new Error(`Respondent ${id}: ${pair} rating must be 1 for Equal`);
        return 1;
      }
      if (choice !== "a" && choice !== "b") throw new Error(`Respondent ${id}: ${pair} choice must be A, Equal, or B`);
      if (rating === 1) throw new Error(`Respondent ${id}: ${pair} rating 1 means Equal`);
      return choice === "a" ? rating : -rating;
    });
    return { id, municipality, position, date, structural: answers.slice(0, 10), vegetation: answers.slice(10) };
  });
  const structural = summarize(responses, "structural", structuralCriteria);
  const vegetation = summarize(responses, "vegetation", vegetationCriteria);
  structural.aggregate = computeAhpWeights(structural.matrix);
  vegetation.aggregate = computeAhpWeights(vegetation.matrix);
  if (structural.aggregate.cr > 0.10 || vegetation.aggregate.cr > 0.10) {
    throw new Error(`Combined AHP consistency ratio exceeds 0.10 (structural ${structural.aggregate.cr.toFixed(4)}, vegetation ${vegetation.aggregate.cr.toFixed(4)})`);
  }
  if (checkTargets && (
    structural.aggregate.weights.some((weight, i) => Math.abs(weight - targetStructural[i]) > .001)
    || vegetation.aggregate.weights.some((weight, i) => Math.abs(weight - targetVegetation[i]) > .001)
  )) throw new Error("Combined answers do not match target weights within ±0.1%; review the plan or questionnaire transcriptions");
  return {
    data: {
      source: "Pairwise questionnaire answers entered from CSV; provenance must be verified against completed BFP forms",
      method: "Upper-triangle signed Saaty ratings, reciprocal lower triangle, element-wise geometric mean aggregation",
      structural_criteria: structuralCriteria,
      vegetation_criteria: vegetationCriteria,
      responses,
    },
    summary: { structural, vegetation },
  };
}

function printSummary(summary) {
  for (const [name, model] of Object.entries(summary)) {
    console.log(`${name}: ${model.criteria.map((criterion, i) => `${criterion} ${(model.aggregate.weights[i] * 100).toFixed(2)}%`).join(", ")}; CR ${model.aggregate.cr.toFixed(4)}`);
    for (const individual of model.individual) console.log(`  Respondent ${individual.id}: CR ${individual.cr.toFixed(4)}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const input = process.argv[2];
    if (!input) throw new Error("Usage: node scripts/import-ahp-answers.mjs <completed-answers.csv> [output.json]");
    const output = resolve(process.argv[3] ?? "docs/ahp-bfp-comparisons.json");
    const result = buildComparisonData(readFileSync(resolve(input), "utf8"));
    printSummary(result.summary);
    writeFileSync(output, `${JSON.stringify(result.data, null, 2)}\n`, { flag: "wx" });
    console.log(`Wrote ${output}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
