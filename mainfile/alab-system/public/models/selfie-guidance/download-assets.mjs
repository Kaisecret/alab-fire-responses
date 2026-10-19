// Run from the app: node public/models/selfie-guidance/download-assets.mjs [--check]
// npm ci installs the exact runtime first. Only Google model + Apache license need
// network access when missing; runtime bytes are copied from the pinned npm package.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const assetRoot = fileURLToPath(new URL("./mediapipe-1.1.1-face-landmarker-1/", import.meta.url));
const appRoot = fileURLToPath(new URL("../../../", import.meta.url));
const manifest = JSON.parse(await readFile(resolve(assetRoot, "assets-manifest.json"), "utf8"));
const checkOnly = process.argv.includes("--check");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
let packageChecked = false;
for (const asset of manifest.files) {
  const target = resolve(assetRoot, asset.path);
  if (!target.startsWith(assetRoot.endsWith(sep) ? assetRoot : `${assetRoot}${sep}`)) throw new Error("Asset path is outside its version directory.");
  let existing;
  try { existing = await readFile(target); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (existing && existing.length === asset.size && hash(existing) === asset.sha256) continue;
  if (checkOnly) throw new Error(`Missing or altered browser asset: ${asset.path}`);
  let bytes;
  if (asset.npmPath) {
    const packageRoot = resolve(appRoot, "node_modules/@mediapipe/tasks-vision");
    if (!packageChecked) {
      const installed = JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8"));
      if (installed.version !== manifest.runtime.version) throw new Error("Install the pinned MediaPipe package with npm ci first.");
      packageChecked = true;
    }
    const source = resolve(packageRoot, asset.npmPath);
    if (!source.startsWith(`${packageRoot}${sep}`)) throw new Error("Invalid npm asset path.");
    bytes = await readFile(source);
  } else {
    const response = await fetch(asset.url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Asset download returned ${response.status}: ${asset.path}`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (bytes.length !== asset.size || hash(bytes) !== asset.sha256) throw new Error(`Upstream asset checksum changed: ${asset.path}`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes);
}
process.stdout.write(`Verified ${manifest.files.length} pinned selfie guidance assets.\n`);
