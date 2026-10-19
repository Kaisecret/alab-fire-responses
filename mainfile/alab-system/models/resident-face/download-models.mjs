// Maintenance only. No inference request downloads anything.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("manifest.json", import.meta.url), "utf8"));
async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Upstream download failed: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
for (const model of manifest.models) {
  const data = await fetchBytes(`https://media.githubusercontent.com/media/opencv/opencv_zoo/${manifest.revision}/${model.source}`);
  if (data.length !== model.bytes || createHash("sha256").update(data).digest("hex") !== model.sha256) {
    throw new Error(`Pinned model integrity check failed: ${model.file}`);
  }
  await writeFile(new URL(model.file, import.meta.url), data);
  await writeFile(new URL(model.licenseFile, import.meta.url), await fetchBytes(`https://raw.githubusercontent.com/opencv/opencv_zoo/${manifest.revision}/${model.source.slice(0, model.source.lastIndexOf("/"))}/LICENSE`));
  console.log(`Verified ${model.file}: ${model.bytes} bytes`);
}
await writeFile(new URL("LICENSE-OpenCV.txt", import.meta.url), await fetchBytes("https://raw.githubusercontent.com/opencv/opencv/4.13.0/LICENSE"));
