import { readFile, writeFile } from "node:fs/promises";

const source = await readFile(new URL("../app/_content/antique-barangays.ts", import.meta.url), "utf8");
const entries = [...source.matchAll(/^  "([^"]+)": \[([\s\S]*?)^  \],$/gm)].map(([, municipality, body]) => [
  municipality,
  [...body.matchAll(/"([^"]+)"/g)].map(([, barangay]) => barangay),
]);

const quote = (value) => `'${value.replaceAll("'", "''")}'`;
const municipalities = entries.map(([name]) => `  (${quote(name)}, 'Antique')`).join(",\n");
const barangays = entries.flatMap(([municipality, names]) => names.map((name) => `  (${quote(municipality)}, ${quote(name)})`)).join(",\n");

const sql = `-- Generated from app/_content/antique-barangays.ts. Do not edit by hand.\n\ninsert into public.municipalities (name, province)\nvalues\n${municipalities}\non conflict (name) do update set province = excluded.province;\n\ninsert into public.barangays (municipality_id, name)\nselect municipalities.id, values_to_insert.name\nfrom (values\n${barangays}\n) as values_to_insert(municipality_name, name)\njoin public.municipalities on municipalities.name = values_to_insert.municipality_name\non conflict (municipality_id, name) do nothing;\n`;

await writeFile(new URL("../supabase/seed.sql", import.meta.url), sql);
