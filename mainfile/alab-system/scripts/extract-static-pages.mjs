import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const landingSourcePath = join(projectRoot, "..", "..", "BFP", "index.html");
const landingOutputPath = join(
  projectRoot,
  "app",
  "_content",
  "landing-content.ts",
);
const loginSourcePath = join(projectRoot, "..", "..", "login.html");
const loginOutputPath = join(
  projectRoot,
  "app",
  "_content",
  "login-content.ts",
);

function extractStyles(source, pageName) {
  const styles = Array.from(
    source.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/g),
    (match) => match[1],
  );
  if (styles.length === 0) {
    throw new Error(`Unable to extract ${pageName} styles`);
  }
  return styles.join("\n");
}

function extractBodyBeforeScripts(source, pageName) {
  const body = source.match(/<body>([\s\S]*?)<script>/)?.[1];
  if (!body) {
    throw new Error(`Unable to extract ${pageName} body`);
  }
  return body.trim();
}

function scopeBodyStyles(styles, rootSelector) {
  return styles
    .replace(
      /(^|})\s*body,\s*button,\s*a\s*\{/g,
      `$1\n${rootSelector},\n${rootSelector} button,\n${rootSelector} a {`,
    )
    .replace(/(^|})\s*body\s*\{/g, `$1\n${rootSelector} {`);
}

function writeContentModule(path, exports) {
  const content = Object.entries(exports)
    .map(([name, value]) => `export const ${name} = ${JSON.stringify(value)};\n`)
    .join("\n");

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

const landingSource = readFileSync(landingSourcePath, "utf8");
const landingStyles = scopeBodyStyles(
  extractStyles(landingSource, "landing"),
  ".landing-page-root",
).replaceAll('url("images/', 'url("/images/');
const landingMarkup = extractBodyBeforeScripts(landingSource, "landing")
  .replaceAll('src="images/', 'src="/images/')
  .replaceAll('href="../login.html"', 'href="/login"');

writeContentModule(landingOutputPath, { landingStyles, landingMarkup });

const loginSource = readFileSync(loginSourcePath, "utf8");
const loginStyles = scopeBodyStyles(
  extractStyles(loginSource, "login"),
  ".login-page-root",
).replace(
  "'Plus Jakarta Sans'",
  "var(--font-plus-jakarta)",
);
const loginMarkup = extractBodyBeforeScripts(loginSource, "login")
  .replaceAll('src="BFP/images/', 'src="/images/')
  .replaceAll('href="BFP/index.html"', 'href="/"')
  .replaceAll('action="BFP/index.html"', 'action="/"')
  .replace(/\s+onsubmit="[^"]*"/g, "")
  .replace(/\s+onclick="[^"]*"/g, "");

writeContentModule(loginOutputPath, { loginStyles, loginMarkup });
