import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function assertEvidenceRuntime(files, platform, arch) {
  const paths = files.map(file => file.replaceAll('\\', '/'));
  const nativePlatform = `${platform}-${arch}`;
  if (!paths.some(file => file.includes(`/@img/sharp-${nativePlatform}/`) && file.endsWith('.node'))) {
    throw new Error(`Missing ${nativePlatform} Sharp native addon in evidence bundle.`);
  }
  if (!paths.some(file =>
    (file.includes(`/@img/sharp-libvips-${nativePlatform}/`) || file.includes(`/@img/sharp-${nativePlatform}/`)) &&
    /\/libvips[^/]*\.(?:so(?:\.[\d.]+)?|dll|dylib)$/.test(file))) {
    throw new Error(`Missing ${nativePlatform} libvips shared library in evidence bundle.`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const routes = [
    'auth/register',
    'resident/application-status/resubmit',
    'municipal-bfp/resident-applications/[applicationId]',
    'provincial-bfp/resident-applications/[applicationId]',
  ];
  for (const route of routes) {
    const tracePath = resolve(`.next/server/app/api/${route}/route.js.nft.json`);
    const { files } = JSON.parse(readFileSync(tracePath, 'utf8'));
    assertEvidenceRuntime(files, process.platform, process.arch);
    for (const file of files.filter(file => /[/\\]@img[/\\]sharp-/.test(file))) {
      if (!existsSync(resolve(dirname(tracePath), file))) throw new Error(`Traced evidence dependency does not exist: ${file}`);
    }
    console.log(`Evidence runtime verified: /api/${route}`);
  }
}
