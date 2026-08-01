import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = readFileSync(join(root, "app", "_content", "antique-barangays.ts"), "utf8");
const signupSource = readFileSync(join(root, "app", "_content", "signup-content.ts"), "utf8");

function extractBarangays(municipality) {
  const pattern = new RegExp(`${JSON.stringify(municipality)}:\\s*\\[([\\s\\S]*?)\\]`, "m");
  const match = source.match(pattern);

  assert.ok(match, `${municipality} barangay list is missing`);

  return [...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
}

test("Hamtic barangays match the official PSGC list", () => {
  const hamtic = extractBarangays("Hamtic");

  assert.deepEqual(hamtic, [
    "Apdo",
    "Asluman",
    "Banawon",
    "Bia-an",
    "Bongbongan I-II",
    "Bongbongan III",
    "Botbot",
    "Budbudan",
    "Buhang",
    "Calacja I",
    "Calacja II",
    "Calala",
    "Cantulan",
    "Caridad",
    "Caromangay",
    "Casalngan",
    "Dangcalan",
    "Del Pilar",
    "Fabrica",
    "Funda",
    "General Fullon",
    "Guintas",
    "Igbical",
    "Igbucagay",
    "Inabasan",
    "Ingwan-Batangan",
    "La Paz",
    "Gov. Evelio B. Javier",
    "Linaban",
    "Malandog",
    "Mapatag",
    "Masanag",
    "Nalihawan",
    "Pamandayan",
    "Pasu-Jungao",
    "Piapi I",
    "Piapi II",
    "Piapi III",
    "Pili 1, 2, 3",
    "Poblacion 1",
    "Poblacion 2",
    "Poblacion 3",
    "Poblacion 4",
    "Poblacion 5",
    "Pu-ao",
    "Suloc",
    "Villavert-Jimenez",
  ]);
});

test("Hamtic does not include San Jose or stale placeholder entries", () => {
  assert.equal(extractBarangays("Hamtic").includes("San Jose"), false);
  assert.equal(extractBarangays("Hamtic").includes("Slja"), false);
});

test("every municipality option in signup has barangay data", () => {
  const municipalityOptions = [...signupSource.matchAll(/<option value="([^"]+)">/g)]
    .map((match) => match[1])
    .filter(Boolean);

  assert.equal(municipalityOptions.length, 18);

  for (const municipality of municipalityOptions) {
    assert.ok(
      extractBarangays(municipality).length > 0,
      `${municipality} must have barangay choices`,
    );
  }
});
