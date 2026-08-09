import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const relationId = 1506746;
const scriptDir = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDir, "..", "public", "data", "antique-boundary.geojson");
const endpoint = new URL("https://nominatim.openstreetmap.org/lookup");
endpoint.searchParams.set("osm_ids", `R${relationId}`);
endpoint.searchParams.set("format", "geojson");
endpoint.searchParams.set("polygon_geojson", "1");
endpoint.searchParams.set("polygon_threshold", "0.0005");

const response = await fetch(endpoint, {
  headers: { "User-Agent": "ALAB-GIS-Boundary-Generator/1.0" },
});

if (!response.ok) {
  throw new Error(`Boundary request failed with HTTP ${response.status}`);
}

const collection = await response.json();
if (collection?.type !== "FeatureCollection" || collection.features?.length !== 1) {
  throw new Error("Expected one Antique boundary feature");
}

const [feature] = collection.features;
if (Number(feature?.properties?.osm_id) !== relationId) {
  throw new Error("Boundary response does not match Antique relation 1506746");
}

feature.properties = {
  name: "Province of Antique",
  osmRelationId: relationId,
  source: "OpenStreetMap",
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(collection)}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
