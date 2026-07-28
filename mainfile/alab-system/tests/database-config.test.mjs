import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Prisma is configured for Railway PostgreSQL without application models", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  const schema = await readFile("prisma/schema.prisma", "utf8");
  const config = await readFile("prisma.config.ts", "utf8");
  const gitignore = await readFile(".gitignore", "utf8");

  assert.equal(packageJson.scripts.postinstall, "prisma generate");
  assert.equal(packageJson.scripts["db:generate"], "prisma generate");
  assert.equal(packageJson.scripts["db:validate"], "prisma validate");
  assert.equal(
    packageJson.scripts["db:migrate:deploy"],
    "prisma migrate deploy",
  );
  assert.equal(packageJson.dependencies["@prisma/client"], "7.9.1");
  assert.equal(packageJson.dependencies["@prisma/adapter-pg"], "7.9.1");
  assert.equal(packageJson.dependencies.pg, "8.22.0");
  assert.equal(packageJson.devDependencies.prisma, "7.9.1");
  assert.match(schema, /provider\s*=\s*"prisma-client"/);
  assert.match(schema, /output\s*=\s*"\.\.\/app\/generated\/prisma"/);
  assert.match(schema, /provider\s*=\s*"postgresql"/);
  assert.doesNotMatch(schema, /\bmodel\s+\w+/);
  assert.match(config, /env\("DATABASE_URL"\)/);
  assert.doesNotMatch(config, /postgres(?:ql)?:\/\/[^"']+@/);
  assert.match(gitignore, /^\/app\/generated\/prisma\/$/m);
});
